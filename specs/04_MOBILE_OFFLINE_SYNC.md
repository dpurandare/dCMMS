# dCMMS Mobile Offline Sync Specifications

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Local Data Storage](#2-local-data-storage)
3. [Sync Architecture](#3-sync-architecture)
4. [Conflict Detection & Resolution](#4-conflict-detection--resolution)
5. [Sync Strategies](#5-sync-strategies)
6. [Bandwidth Optimization](#6-bandwidth-optimization)
7. [Error Handling](#7-error-handling)
8. [Security](#8-security)

---

## 1. Overview

### 1.1 Requirements

**Core Requirements:**
- Field technicians must be able to view and execute work orders without network connectivity
- Changes made offline must be queued and synced when connectivity returns
- Conflicts must be detected and resolved automatically where possible
- Critical data must sync with priority
- Bandwidth usage must be minimized for cellular connections

**Supported Platforms:**
- iOS (React Native or Flutter)
- Android (React Native or Flutter)
- Progressive Web App (limited offline, fallback)

**Offline Duration Support:** Up to 7 days

---

## 2. Local Data Storage

### 2.1 Storage Technology

**Mobile Native (iOS/Android):**
- **SQLite** with **SQLCipher** encryption for structured data
- **Local file system** (encrypted) for attachments
- **React Native AsyncStorage** / **Flutter Secure Storage** for auth tokens and settings

**Progressive Web App:**
- **IndexedDB** for structured data
- **Cache API** for attachments
- **Service Worker** for offline request queuing

### 2.2 Local Database Schema

**Mirrors server schema for offline-capable entities:**

**Tables:**
```sql
-- Work Orders
CREATE TABLE work_orders (
  workOrderId TEXT PRIMARY KEY,
  siteId TEXT NOT NULL,
  assetId TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  assignedTo TEXT,
  scheduledStart TEXT,
  scheduledEnd TEXT,
  tasks TEXT, -- JSON
  partsRequired TEXT, -- JSON
  partsUsed TEXT, -- JSON
  laborRecords TEXT, -- JSON
  attachments TEXT, -- JSON (URLs for synced, local paths for pending)
  -- Sync metadata
  _localId TEXT UNIQUE, -- client-generated UUID for offline-created records
  _version INTEGER DEFAULT 1, -- optimistic locking version
  _synced BOOLEAN DEFAULT 0,
  _lastSyncAt TEXT,
  _pendingChanges TEXT, -- JSON array of pending change operations
  _conflictDetected BOOLEAN DEFAULT 0,
  _createdOffline BOOLEAN DEFAULT 0,
  _serverUpdatedAt TEXT
);

-- Assets (read-only cache for assigned WOs)
CREATE TABLE assets (
  assetId TEXT PRIMARY KEY,
  siteId TEXT NOT NULL,
  type TEXT,
  category TEXT,
  manufacturer TEXT,
  model TEXT,
  status TEXT,
  location TEXT, -- JSON
  _synced BOOLEAN DEFAULT 1,
  _lastSyncAt TEXT
);

-- Inventory (read-only cache)
CREATE TABLE inventory (
  partId TEXT PRIMARY KEY,
  description TEXT,
  quantityAvailable INTEGER,
  unit TEXT,
  _synced BOOLEAN DEFAULT 1,
  _lastSyncAt TEXT
);

-- Attachments (pending upload)
CREATE TABLE pending_attachments (
  attachmentId TEXT PRIMARY KEY,
  workOrderId TEXT NOT NULL,
  localFilePath TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSize INTEGER,
  mimeType TEXT,
  description TEXT,
  attachmentType TEXT,
  capturedAt TEXT,
  capturedBy TEXT,
  location TEXT, -- JSON
  _uploaded BOOLEAN DEFAULT 0,
  _uploadAttempts INTEGER DEFAULT 0,
  _lastAttemptAt TEXT,
  FOREIGN KEY (workOrderId) REFERENCES work_orders(workOrderId)
);

-- Sync Queue (operations to sync)
CREATE TABLE sync_queue (
  queueId TEXT PRIMARY KEY,
  entityType TEXT NOT NULL, -- 'work-order', 'attachment', etc.
  entityId TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  payload TEXT NOT NULL, -- JSON
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  createdAt TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  lastAttemptAt TEXT,
  error TEXT,
  status TEXT DEFAULT 'pending' -- 'pending', 'in-progress', 'completed', 'failed'
);

-- User profile cache
CREATE TABLE user_profile (
  userId TEXT PRIMARY KEY,
  email TEXT,
  firstName TEXT,
  lastName TEXT,
  role TEXT,
  skills TEXT, -- JSON
  siteIds TEXT, -- JSON
  _synced BOOLEAN DEFAULT 1
);
```

### 2.3 Data Partitioning

**What Gets Synced to Mobile:**
- ✅ Work orders assigned to user (status: `assigned`, `in-progress`, `on-hold`)
- ✅ Work orders created by user in last 30 days
- ✅ Assets referenced by user's work orders
- ✅ Inventory items at user's assigned sites (quantities only)
- ✅ User's own profile
- ❌ All work orders (too large)
- ❌ Full asset registry (too large)
- ❌ Telemetry data (server-only)
- ❌ Other users' work orders (privacy)

**Selective Sync:**
User can choose to sync specific work orders (e.g., for next week's scheduled work)

---

## 3. Sync Architecture

### 3.1 Sync Types

#### A. Initial Sync (Full Download)
**Trigger:** First-time app install or after cache clear
**Process:**
1. Authenticate user
2. Fetch user profile
3. Fetch assigned work orders (last 30 days + future scheduled)
4. Fetch related assets
5. Fetch inventory for assigned sites
6. Download critical attachments (thumbnails only for others)

**Estimated Data Size:** 5-20 MB (varies by # of WOs)

#### B. Delta Sync (Incremental)
**Trigger:** App foreground, manual refresh, periodic (every 15 min if online)
**Process:**
1. Send last sync timestamp to server
2. Server returns only changed entities since last sync
3. Merge changes into local DB
4. Detect conflicts

**Endpoint:**
```http
GET /api/v1/sync/delta?since=2025-11-08T10:00:00Z&entities=work-orders,assets
```

**Response:**
```json
{
  "syncTimestamp": "2025-11-08T11:00:00Z",
  "changes": {
    "workOrders": [
      {"workOrderId": "WO-001", "status": "completed", "_version": 5, "updatedAt": "2025-11-08T10:30:00Z"}
    ],
    "assets": [],
    "deletedIds": {
      "workOrders": ["WO-999"]
    }
  }
}
```

#### C. Push Sync (Upload Changes)
**Trigger:** Connectivity detected after offline period, manual sync, background sync (if permitted)
**Process:**
1. Process sync queue in priority order
2. For each queued operation:
   - Send to server
   - If success → mark complete, update local record
   - If conflict → handle per conflict resolution strategy
   - If error → retry with exponential backoff

**Endpoint:**
```http
POST /api/v1/sync/push
{
  "operations": [
    {
      "queueId": "queue-1",
      "entityType": "work-order",
      "entityId": "WO-001",
      "operation": "update",
      "payload": {
        "status": "completed",
        "actualEnd": "2025-11-08T10:00:00Z",
        "_version": 3
      }
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "queueId": "queue-1",
      "status": "success",
      "newVersion": 4
    }
  ]
}
```

---

## 4. Conflict Detection & Resolution

### 4.1 Conflict Detection

**Optimistic Locking with Version Vectors**

Each entity has:
- `_version` - Integer incremented on each update
- `_serverUpdatedAt` - Server's last update timestamp

**Conflict Occurs When:**
- Client sends update with `_version: N`
- Server's current version is `N+1` or higher
- → Someone else updated the record while client was offline

### 4.2 Conflict Resolution Strategies

#### Strategy 1: Server Wins (Default for most fields)
- Client's changes discarded
- Server's version downloaded and merged
- User notified of conflict
- User's changes shown in conflict log for manual review

**Use For:**
- Asset status
- Work order status (if changed by supervisor)
- Scheduled dates

#### Strategy 2: Client Wins (Field-Specific)
- Client's changes take precedence
- Server's version overwritten

**Use For:**
- Work completion data (attachments, measurements, labor records)
- Task completion status
- Parts used

**Rationale:** Technician in field has authoritative data for work performed

#### Strategy 3: Field-Level Merge
- Merge changes at field level
- Non-overlapping fields from both sides accepted

**Example:**
```
Server version:
  status: "in-progress"
  partsUsed: [{"partId": "A", "qty": 1}]

Client version (offline):
  status: "completed"
  partsUsed: [{"partId": "B", "qty": 2}]

Merged result:
  status: "completed" (client wins on execution fields)
  partsUsed: [{"partId": "A", "qty": 1}, {"partId": "B", "qty": 2}] (merge arrays)
```

#### Strategy 4: Manual Resolution Required
- Cannot auto-resolve
- Present conflict to user with both versions
- User chooses or manually merges

**Use For:**
- Conflicting root cause analysis
- Conflicting completion notes

### 4.3 Conflict Resolution UI

**Conflict Detected:**
```
┌─────────────────────────────────────────┐
│ ⚠️  Sync Conflict Detected              │
│                                         │
│ Work Order WO-001 was updated by        │
│ another user while you were offline.    │
│                                         │
│ Field: Status                           │
│ Your change: "completed"                │
│ Server version: "on-hold"               │
│                                         │
│ [ Keep Mine ]  [ Use Server ]  [ View Details ] │
└─────────────────────────────────────────┘
```

**Detailed View:**
- Side-by-side comparison of conflicting fields
- Show timestamps and users who made changes
- Allow field-by-field resolution
- Save resolution preference for future conflicts

### 4.4 Conflict Audit Trail

**Log All Conflicts:**
```json
{
  "conflictId": "uuid",
  "entityType": "work-order",
  "entityId": "WO-001",
  "detectedAt": "2025-11-08T11:00:00Z",
  "userId": "user-123",
  "clientVersion": 3,
  "serverVersion": 5,
  "conflictingFields": ["status", "completionNotes"],
  "resolutionStrategy": "manual",
  "resolvedAt": "2025-11-08T11:05:00Z",
  "resolution": {
    "status": "client-wins",
    "completionNotes": "server-wins"
  }
}
```

---

## 5. Sync Strategies

### 5.1 Sync Triggers

| Trigger | Type | Conditions |
|---------|------|------------|
| App Launch | Full if stale, else delta | Local DB last sync > 1 hour old |
| App Foreground | Delta | App was in background > 5 min |
| Manual Refresh | Delta + Push | User pulls to refresh |
| Periodic Background | Delta + Push | Every 15 min (if battery/network allow) |
| Connectivity Change | Push | WiFi/cellular reconnects after offline |
| Critical Action | Immediate push | WO status change, emergency |

### 5.2 Sync Prioritization

**Priority Levels (1=highest, 10=lowest):**

| Priority | Operation | Example |
|----------|-----------|---------|
| 1 | Emergency work order creation | Safety incident |
| 2 | Critical status change | Asset failed → operational |
| 3 | Work order completion | Technician completes WO |
| 4 | Parts consumption | Record parts used |
| 5 | Standard work order update | Update task status |
| 6 | Labor time logging | Clock in/out |
| 7 | Attachment upload (photos) | Upload work photos |
| 8 | Attachment upload (documents) | Upload PDF manual |
| 9 | Non-critical metadata | Update custom fields |
| 10 | Analytics/telemetry | Usage tracking |

**Queue Processing:**
- Process higher priority first
- Within same priority → FIFO (first queued, first synced)

### 5.3 Sync Feedback

**User Indicators:**
```
┌─────────────────────────────────┐
│  🔄  Syncing... (3 of 10 items) │  ← Active sync
│  ✅  Synced 2 minutes ago       │  ← Last successful sync
│  📡  Offline (5 changes queued) │  ← Offline mode
│  ⚠️  Sync failed (retry in 30s) │  ← Error state
└─────────────────────────────────┘
```

**Per-Entity Sync Status:**
- Work order list shows icon: ✅ synced, 🔄 syncing, ⏱️ queued, ⚠️ conflict

---

## 6. Bandwidth Optimization

### 6.1 Differential Sync (Delta Only)

**Instead of sending full entity:**
```json
// ❌ Full entity (wasteful)
{
  "workOrderId": "WO-001",
  "title": "Replace contactor",
  "description": "...",
  "status": "completed",  // ← Only field changed
  "tasks": [...]  // ← All tasks sent
}
```

**Send only changed fields:**
```json
// ✅ Delta patch (efficient)
{
  "workOrderId": "WO-001",
  "status": "completed",
  "actualEnd": "2025-11-08T10:00:00Z",
  "_version": 3
}
```

### 6.2 Attachment Sync Optimization

**Techniques:**
- **On-Demand Download** - Don't download all attachments upfront, only on user request
- **Thumbnail Prefetch** - Download low-res thumbnails for all, full-res on demand
- **Compression** - Compress images (JPEG 80% quality) before upload
- **Resize** - Resize photos to max 1920px before upload
- **Chunked Upload** - Upload large files in chunks (resume if interrupted)
- **WiFi-Only Mode** - Allow user to restrict large uploads to WiFi only

**Example Settings:**
```
┌─────────────────────────────────┐
│ Sync Settings                   │
│                                 │
│ ☑ Sync on WiFi only             │
│ ☑ Download thumbnails on cellular │
│ ☐ Download full images on cellular │
│ ☑ Compress photos before upload │
│                                 │
│ Sync frequency: Every 15 min    │
└─────────────────────────────────┘
```

### 6.3 Compression

**HTTP Level:**
- Use `Content-Encoding: gzip` for all API requests/responses

**Payload Level:**
- Store JSON payloads compressed in sync queue
- Compress large text fields (description, notes) before storage

### 6.4 Caching

**HTTP Caching:**
- Use `Cache-Control` headers for static data (asset specs, user profile)
- Use `ETag` / `If-None-Match` for conditional requests

**Local Caching:**
- Cache API responses in IndexedDB/SQLite with expiry
- Don't re-fetch unchanged data

---

## 7. Error Handling

### 7.1 Sync Error Types

| Error Type | Cause | Handling |
|------------|-------|----------|
| `NETWORK_ERROR` | No connectivity | Retry with exponential backoff |
| `AUTH_ERROR` | Token expired | Refresh token, retry |
| `VERSION_CONFLICT` | Optimistic locking failure | Run conflict resolution |
| `VALIDATION_ERROR` | Invalid data | Show error, let user correct |
| `NOT_FOUND` | Entity deleted on server | Remove from local DB, notify user |
| `PERMISSION_DENIED` | User no longer has access | Remove from local DB, notify user |
| `SERVER_ERROR` | 5xx error | Retry with backoff, escalate if persistent |

### 7.2 Retry Strategy

**Exponential Backoff:**
```
Attempt 1: Immediate
Attempt 2: Wait 5 seconds
Attempt 3: Wait 10 seconds
Attempt 4: Wait 30 seconds
Attempt 5: Wait 60 seconds
Attempt 6+: Wait 5 minutes (max)
```

**Max Retries:** 10 attempts

**After Max Retries:**
- Mark operation as `failed` in sync queue
- Show persistent notification to user
- Allow manual retry

### 7.3 Error UI

**Sync Failed Notification:**
```
┌─────────────────────────────────┐
│ ⚠️  Sync Failed                  │
│                                 │
│ Could not sync work order       │
│ WO-001. Changes saved locally.  │
│                                 │
│ Error: Version conflict         │
│                                 │
│ [ Retry ]  [ View Details ]     │
└─────────────────────────────────┘
```

**Sync Queue View (for user):**
```
Queued Changes (5)

✅ WO-001: Updated status      Synced
🔄 WO-002: Added photo          Syncing...
⏱️ WO-003: Recorded parts      Queued
⚠️ WO-004: Completion notes    Failed (version conflict)
⏱️ WO-005: Labor time          Queued
```

---

## 8. Security

### 8.1 Local Data Encryption

**Database:**
- Use **SQLCipher** (native apps) or **IndexedDB encryption** (web)
- Encryption key derived from user's credentials + device-specific salt
- Key stored in OS secure keychain (iOS Keychain, Android Keystore)

**Attachments:**
- Encrypt files before storing locally
- Use AES-256 encryption
- Unique encryption key per file (stored with file metadata)

**Why:** Device loss/theft should not expose sensitive maintenance data

### 8.2 Token Storage

**Access Token:**
- Store in memory only (never persisted)
- Clear on app terminate

**Refresh Token:**
- iOS: Store in Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
- Android: Store in EncryptedSharedPreferences backed by Android Keystore
- Web: Secure HttpOnly cookie (backend manages)

### 8.3 Sync Security

**All sync API calls:**
- HTTPS/TLS 1.3 only
- Certificate pinning (optional, recommended)
- Bearer token authentication

**Sync payload encryption (optional enhancement):**
- End-to-end encrypt sync payloads with device public key
- Server cannot read payload (zero-knowledge sync)
- Use for highly sensitive data (e.g., notes with PII)

### 8.4 Data Expiry & Cleanup

**Auto-Cleanup:**
- Delete work orders from local DB after 90 days if status = `closed` or `cancelled`
- Delete old attachments for closed work orders
- Run cleanup on app launch (background)

**Manual Cleanup:**
- Allow user to clear cache in settings
- Require re-sync after cache clear

**On Logout:**
- Delete ALL local data (work orders, assets, attachments)
- Wipe encryption keys
- Clear sync queue

---

## Implementation Checklist

- [ ] Implement local SQLite database with encryption
- [ ] Build initial sync (full download) flow
- [ ] Build delta sync (incremental) flow
- [ ] Implement sync queue with priority
- [ ] Build optimistic locking conflict detection
- [ ] Implement conflict resolution strategies
- [ ] Build conflict resolution UI
- [ ] Implement retry logic with exponential backoff
- [ ] Optimize attachment sync (compression, chunking, WiFi-only)
- [ ] Implement background sync (iOS Background Tasks, Android WorkManager)
- [ ] Build sync status indicators in UI
- [ ] Implement token refresh on auth error
- [ ] Test sync under various network conditions (flaky, slow, offline)
- [ ] Test conflict scenarios (simultaneous edits)
- [ ] Implement data cleanup on logout
- [ ] Add sync settings UI
- [ ] Performance test: Measure sync time for 100 work orders

---

## Testing Scenarios

### Functional Tests
1. ✅ User goes offline, updates WO, goes online → changes sync successfully
2. ✅ User and supervisor edit same WO offline → conflict detected and resolved
3. ✅ User creates WO offline → assigned temp ID, synced with real ID on upload
4. ✅ User uploads photo offline → queued, uploaded when online
5. ✅ Token expires during sync → auto-refresh and retry
6. ✅ Network error during sync → retry with backoff
7. ✅ User deletes work order on server while client offline → client removes on next sync
8. ✅ Sync queue processes in priority order
9. ✅ User clears local cache → re-sync downloads data correctly
10. ✅ App crash during sync → sync resumes on restart without duplicates

### Performance Tests
1. Sync 100 work orders on first launch → < 10 seconds on WiFi
2. Delta sync after 1 day offline (10 changes) → < 2 seconds
3. Upload 10 photos (5MB each) → chunked upload, resumable
4. Sync on 3G connection → graceful degradation, no timeouts

### Security Tests
1. Device locked → local DB not accessible without unlock
2. App uninstalled → all local data deleted
3. Token stolen → cannot access data (MFA required)
4. Man-in-the-middle attack → cert pinning prevents

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial mobile offline sync specifications |

