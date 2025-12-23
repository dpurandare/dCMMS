# dCMMS Mobile App - Features Guide

## Overview

This document provides detailed information about the features implemented in the dCMMS Mobile App.

---

## Implemented Features

### 1. Authentication ✅

**Location:** `lib/features/auth/`

**Capabilities:**
- Email/password login
- JWT token storage (secure)
- Auto-login with stored credentials
- Logout functionality
- Token refresh handling

**Usage:**
```dart
// Login
final authService = ref.read(authServiceProvider);
await authService.login('admin@example.com', 'Password123!');

// Logout
await authService.logout();

// Check auth status
final isAuthenticated = ref.watch(isAuthenticatedProvider);
```

**Default Credentials:**
- **Admin:**  `admin@example.com` / `Password123!`
- **Manager:** `manager@example.com` / `Password123!`
-  **Technician:** `technician@example.com` / `Password123!`

---

### 2. Work Order Management ✅

**Location:** `lib/features/work_orders/`

**Capabilities:**
- View work order list
- Filter by status (open, in-progress, completed)
- View work order details
- Update work order status
- Offline support for viewing
- Background sync

**Screens:**
- `WorkOrderListScreen` - ListView with filters
- `WorkOrderDetailScreen` - Full work order information

**Data Flow:**
```
Backend API ←→ Work Order Service ←→ Local Database ←→ UI
```

**Offline Behavior:**
- Work orders cached locally in Drift database
- Changes queued and synced when online
- Conflict resolution (last-write-wins)

---

### 3. Dashboard ✅

**Location:** `lib/features/dashboard/`

**Capabilities:**
- Customizable widget layout
- Drag-and-drop reordering
- KPI cards (work orders, assets, alerts)
- Real-time updates
- Persistent layout preferences

**Widgets:**
- Work order summary
- Asset health indicators
- Alert counts
- Quick actions

**Customization:**
```dart
// Reorder widgets
final dashboardNotifier = ref.read(dashboardProvider.notifier);
dashboardNotifier.reorderWidgets(oldIndex, newIndex);

// Toggle widget visibility
dashboardNotifier.toggleWidget(widgetId);
```

---

### 4. Offline Sync ✅

**Location:** `lib/features/sync/` & `lib/core/workmanager_callback.dart`

**Capabilities:**
- Automatic background sync
- Manual sync trigger
- Conflict resolution
- Sync status monitoring
- Network-aware operations

**Sync Strategy:**
1. **Connectivity Check** - Monitor network status
2. **Queue Changes** - Store modifications locally
3. **Background Sync** - Periodic sync via Workmanager
4. **Conflict Resolution** - Last-write-wins with user override

**Usage:**
```dart
// Trigger manual sync
final syncService = ref.read(syncServiceProvider);
await syncService.syncNow();

// Check sync status
final lastSyncTime = ref.watch(lastSyncProvider);
```

**Workmanager Configuration:**
- **Sync Interval:** Every 15 minutes
- **Constraint:** Network connectivity required
- **Battery:** Respects battery saver mode

---

### 5. GenAI Integration ✅

**Location:** `lib/features/genai/`

**Capabilities:**
- Chat interface for AI assistance
- Document query capabilities
- Context-aware responses
- Feedback mechanism

**Screens:**
- `GenAIChatScreen` - Chat with AI assistant
- `ChatFeedback` - Rate AI responses

**Use Cases:**
- Equipment troubleshooting
- Procedure lookup
- Maintenance guidance
- Knowledge search

---

## Core Infrastructure

### Database (Drift/SQLite)

**Location:** `lib/core/database/`

**Tables:**
- `work_orders` - Work order data
- `assets` - Asset information
- `sync_queue` - Pending sync operations
- `user_preferences` - App settings

**Benefits:**
- Type-safe queries
- Offline-first architecture
- Automatic migrations
- Reactive streams

**Example:**
```dart
// Get all work orders
final db = ref.read(databaseProvider);
final workOrders = await db.select(db.workOrders).get();

// Insert with transaction
await db.transaction(() async {
  await db.into(db.workOrders).insert(newWorkOrder);
  await db.into(db.syncQueue).insert(syncItem);
});
```

---

### Network Layer (Dio)

**Location:** `lib/core/network/`

**Features:**
- REST API client
- Automatic token injection
- Request/response interceptors
- Error handling
- Retry logic

**Configuration:**
```dart
final dio = Dio(BaseOptions(
  baseUrl: 'http://localhost:3001/api/v1',
  connectTimeout: Duration(seconds: 30),
  receiveTimeout: Duration(seconds: 30),
));

// Add interceptors
dio.interceptors.add(AuthInterceptor());
dio.interceptors.add(LogInterceptor());
```

---

### Navigation (GoRouter)

**Location:** `lib/core/router.dart`

**Routes:**
- `/login` - Login screen
- `/` - Dashboard (protected)
- `/work-orders` - Work order list (protected)
- `/work-orders/:id` - Work order details (protected)
- `/genai` - GenAI chat (protected)

**Guards:**
- Auth required for all routes except `/login`
- Automatic redirect to login if unauthenticated

---

### State Management (Riverpod)

**Location:** `lib/core/providers.dart` + feature providers

**Provider Types:**

```dart
// Simple provider
final configProvider = Provider((ref) => AppConfig());

// State provider
final counterProvider = StateProvider((ref) => 0);

// StateNotifier provider
final workOrdersProvider = StateNotifierProvider<WorkOrdersNotifier, List<WorkOrder>>((ref) {
  return WorkOrdersNotifier();
});

// FutureProvider
final userProvider = FutureProvider((ref) async {
  return await ref.read(authServiceProvider).getCurrentUser();
});

// StreamProvider
final workOrderStreamProvider = StreamProvider((ref) {
  return ref.read(databaseProvider).workOrdersDao.watchAllWorkOrders();
});
```

---

## Feature Roadmap

### Planned Features (Not Yet Implemented)

#### 1. QR/Barcode Scanning 🔜
- Asset identification
- Part lookup
- Quick work order access

#### 2. Photo/File Management 🔜
- Attach photos to work orders
- Document uploads
- Media gallery
- Offline caching

#### 3. Voice Notes 🔜
- Record voice memos
- Attach to work orders
- Transcription integration

#### 4. Push Notifications 🔜
- Work order assignments
- Critical alerts
- Sync status
- System announcements

#### 5. Biometric Auth 🔜
- Fingerprint login
- Face ID/Touch ID
- Secure credential storage

#### 6. Geolocation 🔜
- Work order geotagging
- Technician location tracking
- Route optimization
- Proximity alerts

#### 7. Advanced Filters 🔜
- Multi-criteria search
- Saved filter presets
- Date range selection
- Status combinations

#### 8. Reporting 🔜
- Generate PDF reports
- Export data (CSV/Excel)
- Custom report templates
- Email integration

---

## Architecture Patterns

### Feature Module Structure

```
features/
└── work_orders/
    ├── data/
    │   ├── work_order_repository.dart    # Data access layer
    │   └── work_order_api_client.dart    # API calls
    ├── models/
    │   └── work_order.dart                # Data models
    ├── providers/
    │   └── work_order_providers.dart      # Riverpod providers
    └── screens/
        ├── work_order_list_screen.dart    # List view
        └── work_order_detail_screen.dart  # Detail view
```

### Data Flow Pattern

```
UI Layer (Screens/Widgets)
    ↓ (ref.watch/read)
State Management (Riverpod Providers)
    ↓ (async calls)
Repository Layer (Data abstraction)
    ↓ (fetch/update)
Data Sources (API Client + Local DB)
```

---

## Performance Optimizations

### 1. Lazy Loading
```dart
// ListView with lazy loading
ListView.builder(
  itemCount: workOrders.length,
  itemBuilder: (context, index) {
    if (index == workOrders.length - 1) {
      _loadMore();  // Load next page
    }
    return WorkOrderCard(workOrders[index]);
  },
);
```

### 2. Image Caching
```dart
// Cached network image
CachedNetworkImage(
  imageUrl: workOrder.photoUrl,
  placeholder: CircularProgressIndicator(),
  errorWidget: Icon(Icons.error),
);
```

### 3. Database Indexing
```dart
// Indexed columns for faster queries
class WorkOrders extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get status => text().withDefault(Constant('open'))();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<Set<Column>> get uniqueKeys => [{status}];  // Index on status
}
```

### 4. Debounced Search
```dart
// Debounce search input
Timer? _debounce;

void _onSearchChanged(String query) {
  _debounce?.cancel();
  _debounce = Timer(Duration(milliseconds: 500), () {
    _performSearch(query);
  });
}
```

---

## Testing Features

Each feature should have corresponding tests:

```bash
test/
├── work_order_repository_test.dart      # Unit tests
├── widgets/
│   └── work_order_card_test.dart        # Widget tests
└── integration/
    └── work_order_flow_test.dart        # Integration tests
```

**Example Test:**
```dart
void main() {
  group('WorkOrderRepository', () {
    late WorkOrderRepository repository;
    
    setUp(() {
      repository = WorkOrderRepository(mockDb, mockApi);
    });
    
    test('fetches work orders from API', () async {
      final workOrders = await repository.getAll();
      expect(workOrders, isNotEmpty);
    });
    
    test('caches work orders locally', () async {
      await repository.getAll();
      final cached = await repository.getCachedWorkOrders();
      expect(cached, isNotEmpty);
    });
  });
}
```

---

## Best Practices

### 1. Error Handling
```dart
try {
  final result = await repository.fetch();
  state = AsyncValue.data(result);
} catch (error, stackTrace) {
  state = AsyncValue.error(error, stackTrace);
  logger.error('Failed to fetch data', error, stackTrace);
}
```

### 2. Loading States
```dart
final workOrdersAsync = ref.watch(workOrdersProvider);

return workOrdersAsync.when(
  data: (workOrders) => WorkOrderList(workOrders),
  loading: () => CircularProgressIndicator(),
  error: (error, stack) => ErrorWidget(error),
);
```

### 3. Form Validation
```dart
final formKey = GlobalKey<FormState>();

TextFormField(
  validator: (value) {
    if (value == null || value.isEmpty) {
      return 'Please enter a title';
    }
    return null;
  },
);

// On submit
if (formKey.currentState!.validate()) {
  // Process form
}
```

---

## API Integration

### Endpoints Used

| Endpoint           | Method | Purpose                |
| ------------------ | ------ | ---------------------- |
| `/auth/login`      | POST   | User authentication    |
| `/work-orders`     | GET    | Fetch work orders      |
| `/work-orders/:id` | GET    | Get work order details |
| `/work-orders/:id` | PATCH  | Update work order      |
| `/genai/chat`      | POST   | GenAI chat message     |
| `/sync`            | POST   | Sync offline changes   |

### Response Handling

```dart
Future<List<WorkOrder>> getWorkOrders() async {
  try {
    final response = await dio.get('/work-orders');
    
    if (response.statusCode == 200) {
      final List data = response.data['data'];
      return data.map((json) => WorkOrder.fromJson(json)).toList();
    }
    
    throw ApiException('Failed to load work orders');
  } on DioException catch (e) {
    throw _handleDioError(e);
  }
}
```

---

## Additional Resources

- **Architecture:** `/docs/mobile/architecture.md`
- **Developer Guide:** `/docs/mobile/DEVELOPER_GUIDE.md`
- **Build Guide:** `/docs/mobile/BUILD_DEPLOYMENT.md`
- **Backend API:** `http://localhost:3001/docs`
