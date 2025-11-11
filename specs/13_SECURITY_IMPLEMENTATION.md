# Security Implementation Details

**Version:** 1.0
**Date:** November 10, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Encryption & Key Management](#2-encryption--key-management)
3. [Certificate Management](#3-certificate-management)
4. [Secrets Management](#4-secrets-management)
5. [Audit Logging Specifications](#5-audit-logging-specifications)
6. [Security Headers & Hardening](#6-security-headers--hardening)
7. [Vulnerability Management](#7-vulnerability-management)
8. [Incident Response](#8-incident-response)
9. [Security Testing](#9-security-testing)
10. [Compliance Checklist](#10-compliance-checklist)

---

## 1. Executive Summary

This document provides detailed security implementation specifications for dCMMS, covering encryption, key management, certificate lifecycle, secrets management, comprehensive audit logging, and security operations procedures.

### Security Posture Goals

| Area | Target | MVP Required |
|------|--------|--------------|
| **Encryption at Rest** | All sensitive data encrypted (AES-256) | ✅ Yes |
| **Encryption in Transit** | TLS 1.3 minimum, mTLS for services | ✅ Yes |
| **Key Rotation** | Automated 90-day rotation | ✅ Yes |
| **Certificate Expiry** | Automated renewal 30 days before expiry | ✅ Yes |
| **Audit Log Retention** | 7 years for compliance | ✅ Yes |
| **Secrets Exposure** | Zero secrets in code/config files | ✅ Yes |
| **Vulnerability Response** | Critical patches within 24 hours | ✅ Yes |

---

## 2. Encryption & Key Management

### 2.1 Encryption Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                           │
│  ├─ Field-Level Encryption (SSN, Credit Card, PII)          │
│  └─ Transparent Data Encryption (TDE) wrapper                │
└──────────┬──────────────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────────────┐
│           Key Management Service (KMS)                       │
│  ├─ Customer Master Keys (CMK)                              │
│  ├─ Data Encryption Keys (DEK) - per tenant                 │
│  ├─ Key rotation policy (90 days)                           │
│  └─ Access audit trail                                      │
└──────────┬──────────────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────────────┐
│          Hardware Security Module (HSM)                      │
│  ├─ FIPS 140-2 Level 3 certified                           │
│  ├─ Master encryption key storage                           │
│  └─ Cryptographic operations                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Encryption at Rest

**Database Encryption (PostgreSQL + TimescaleDB):**

```sql
-- Enable transparent data encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_ciphers = 'HIGH:!aNULL:!MD5';
ALTER SYSTEM SET ssl_prefer_server_ciphers = on;

-- Encrypt specific tablespaces
CREATE TABLESPACE encrypted_data
  LOCATION '/var/lib/postgresql/encrypted'
  WITH (encryption = 'aes256');

-- Move sensitive tables to encrypted tablespace
ALTER TABLE users SET TABLESPACE encrypted_data;
ALTER TABLE permits SET TABLESPACE encrypted_data;
ALTER TABLE audit_logs SET TABLESPACE encrypted_data;
```

**Object Storage Encryption (S3/MinIO):**

```yaml
s3_encryption:
  default_encryption:
    type: "SSE-KMS"  # Server-Side Encryption with KMS
    kms_master_key_id: "arn:aws:kms:us-east-1:123456789:key/abc-def-ghi"
    kms_encryption_context:
      tenant: "{{tenantId}}"
      environment: "production"

  bucket_policy:
    enforce_encryption: true
    deny_unencrypted_uploads: true

  client_side_encryption:
    enabled: true  # For highly sensitive files
    algorithm: "AES-256-GCM"
```

**Field-Level Encryption:**

```javascript
const crypto = require('crypto');
const { getDataEncryptionKey } = require('./kms');

// Encrypt sensitive field
async function encryptField(plaintext, tenantId) {
  // Get tenant-specific Data Encryption Key (DEK)
  const dek = await getDataEncryptionKey(tenantId);

  // Generate initialization vector
  const iv = crypto.randomBytes(16);

  // Encrypt using AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get auth tag for integrity
  const authTag = cipher.getAuthTag();

  // Return encrypted data with metadata
  return {
    algorithm: 'aes-256-gcm',
    version: 1,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted,
    keyId: dek.keyId,
    encryptedAt: new Date().toISOString()
  };
}

// Decrypt sensitive field
async function decryptField(encryptedData, tenantId) {
  // Get DEK
  const dek = await getDataEncryptionKey(tenantId);

  // Extract components
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const ciphertext = encryptedData.ciphertext;

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Mobile Local Storage Encryption:**

```javascript
// React Native: Use react-native-encrypted-storage
import EncryptedStorage from 'react-native-encrypted-storage';

async function storeSecurely(key, value) {
  try {
    await EncryptedStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage encryption failed:', error);
  }
}

// SQLite encryption with SQLCipher
import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase({
  name: 'dcmms.db',
  location: 'default',
  key: await deriveKeyFromDeviceKeychain()  // Encrypt SQLite with device-specific key
});

// Set SQLCipher parameters
db.executeSql('PRAGMA cipher_page_size = 4096;');
db.executeSql('PRAGMA kdf_iter = 256000;');
db.executeSql('PRAGMA cipher_hmac_algorithm = HMAC_SHA512;');
db.executeSql('PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512;');
```

### 2.3 Encryption in Transit

**TLS Configuration (Nginx):**

```nginx
server {
    listen 443 ssl http2;
    server_name dcmms-api.company.com;

    # TLS 1.3 only (most secure)
    ssl_protocols TLSv1.3;

    # Certificate and private key
    ssl_certificate /etc/nginx/certs/dcmms-api.crt;
    ssl_certificate_key /etc/nginx/certs/dcmms-api.key;

    # Strong ciphers (TLS 1.3 ciphers are secure by default)
    ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
    ssl_prefer_server_ciphers off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/certs/chain.crt;

    # Session tickets (for performance)
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # HSTS (force HTTPS for 1 year)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Prevent clickjacking
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://dcmms-api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name dcmms-api.company.com;
    return 301 https://$server_name$request_uri;
}
```

**Mutual TLS (mTLS) for Service-to-Service:**

```yaml
mtls_configuration:
  enabled: true

  # API Gateway → Backend Services
  backend_services:
    - service: "dcmms-api"
      client_certificate: "/etc/certs/api-client.crt"
      client_key: "/etc/certs/api-client.key"
      ca_certificate: "/etc/certs/ca.crt"
      verify_server: true

    - service: "timescaledb"
      client_certificate: "/etc/certs/db-client.crt"
      client_key: "/etc/certs/db-client.key"
      sslmode: "verify-full"

  # Edge Gateways → MQTT Broker
  mqtt_broker:
    port: 8883  # MQTT over TLS
    require_certificate: true
    ca_certificate: "/etc/emqx/certs/ca.crt"
    server_certificate: "/etc/emqx/certs/server.crt"
    server_key: "/etc/emqx/certs/server.key"
```

### 2.4 Key Management Service (KMS) Integration

**AWS KMS Configuration:**

```yaml
kms:
  provider: "aws_kms"
  region: "us-east-1"

  customer_master_keys:
    - alias: "dcmms/database-encryption"
      key_id: "arn:aws:kms:us-east-1:123456789:key/abc-123-def"
      purpose: "Database TDE"
      rotation: true
      rotation_period_days: 90

    - alias: "dcmms/application-secrets"
      key_id: "arn:aws:kms:us-east-1:123456789:key/xyz-789-ghi"
      purpose: "Application field-level encryption"
      rotation: true
      rotation_period_days: 90

    - alias: "dcmms/backup-encryption"
      key_id: "arn:aws:kms:us-east-1:123456789:key/backup-456"
      purpose: "Backup encryption"
      rotation: true
      rotation_period_days: 90

  key_policies:
    - principal: "arn:aws:iam::123456789:role/dcmms-api-role"
      actions:
        - "kms:Decrypt"
        - "kms:DescribeKey"
        - "kms:GenerateDataKey"

    - principal: "arn:aws:iam::123456789:role/dcmms-backup-role"
      actions:
        - "kms:Encrypt"
        - "kms:Decrypt"
        - "kms:GenerateDataKey"
```

**Key Rotation Process:**

```javascript
// Automated key rotation
async function rotateDataEncryptionKeys() {
  const tenants = await getAllTenants();

  for (const tenant of tenants) {
    try {
      // Generate new DEK
      const newDEK = await kms.generateDataKey({
        KeyId: 'alias/dcmms/application-secrets',
        KeySpec: 'AES_256'
      });

      // Re-encrypt all encrypted fields with new DEK
      await reEncryptTenantData(tenant.tenantId, newDEK);

      // Update key metadata
      await TenantKey.update({
        tenantId: tenant.tenantId
      }, {
        keyId: newDEK.KeyId,
        rotatedAt: new Date(),
        nextRotationAt: addDays(new Date(), 90)
      });

      await auditLog.log({
        action: 'key_rotated',
        tenantId: tenant.tenantId,
        severity: 'info'
      });

    } catch (error) {
      console.error(`Key rotation failed for tenant ${tenant.tenantId}:`, error);

      // Alert security team
      await notify({
        to: 'security-team@company.com',
        subject: `Key Rotation Failed: Tenant ${tenant.tenantId}`,
        priority: 'high',
        body: error.message
      });
    }
  }
}

// Schedule rotation check daily
cron.schedule('0 2 * * *', async () => {
  const tenantsNeedingRotation = await TenantKey.findAll({
    where: {
      nextRotationAt: { $lte: new Date() }
    }
  });

  if (tenantsNeedingRotation.length > 0) {
    await rotateDataEncryptionKeys();
  }
});
```

---

## 3. Certificate Management

### 3.1 Certificate Lifecycle Management

```
Certificate Lifecycle:
  ├─ Provisioning (CSR generation → CA signing → deployment)
  ├─ Renewal (automated 30 days before expiry)
  ├─ Revocation (CRL/OCSP)
  └─ Rotation (zero-downtime deployment)
```

### 3.2 Certificate Inventory

| Certificate Type | Usage | Validity | Renewal Process | Priority |
|------------------|-------|----------|-----------------|----------|
| **Wildcard TLS** | `*.dcmms.company.com` | 1 year | Automated (cert-manager) | Critical |
| **API Gateway** | `dcmms-api.company.com` | 1 year | Automated | Critical |
| **MQTT Broker** | `mqtt.dcmms.company.com` | 1 year | Automated | Critical |
| **Edge Gateway mTLS** | Per-device client certs | 2 years | Manual (bulk renewal) | High |
| **Service mTLS** | Internal microservices | 90 days | Automated | High |
| **Code Signing** | Mobile app signing | 3 years | Manual | Medium |

### 3.3 Automated Certificate Renewal (cert-manager)

**Kubernetes cert-manager Configuration:**

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: security@company.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: Z1234567890ABC
            accessKeyID: AKIAIOSFODNN7EXAMPLE
            secretAccessKeySecretRef:
              name: route53-credentials-secret
              key: secret-access-key
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dcmms-api-tls
  namespace: production
spec:
  secretName: dcmms-api-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - dcmms-api.company.com
    - api.dcmms.company.com
  renewBefore: 720h  # 30 days before expiry
  privateKey:
    algorithm: RSA
    size: 4096
```

**Certificate Expiry Monitoring:**

```javascript
const tls = require('tls');
const { parse } = require('date-fns');

async function checkCertificateExpiry(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(port, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate();

      if (socket.authorized) {
        const expiryDate = new Date(cert.valid_to);
        const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

        resolve({
          hostname,
          subject: cert.subject.CN,
          issuer: cert.issuer.O,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry,
          fingerprint: cert.fingerprint
        });
      } else {
        reject(new Error(`Certificate not authorized: ${socket.authorizationError}`));
      }

      socket.end();
    });

    socket.on('error', reject);
  });
}

// Monitor all certificates daily
cron.schedule('0 6 * * *', async () => {
  const certificates = [
    'dcmms-api.company.com',
    'mqtt.dcmms.company.com',
    'dcmms.company.com'
  ];

  for (const hostname of certificates) {
    try {
      const cert = await checkCertificateExpiry(hostname);

      if (cert.daysUntilExpiry < 30) {
        await notify({
          to: 'security-team@company.com',
          subject: `Certificate Expiring Soon: ${hostname}`,
          priority: cert.daysUntilExpiry < 7 ? 'urgent' : 'high',
          body: `Certificate for ${hostname} expires in ${cert.daysUntilExpiry} days (${cert.validTo})`
        });
      }

      await metrics.gauge('certificate_expiry_days', cert.daysUntilExpiry, {
        hostname,
        subject: cert.subject
      });

    } catch (error) {
      console.error(`Certificate check failed for ${hostname}:`, error);

      await notify({
        to: 'security-team@company.com',
        subject: `Certificate Check Failed: ${hostname}`,
        priority: 'critical',
        body: error.message
      });
    }
  }
});
```

### 3.4 Certificate Revocation

**Certificate Revocation List (CRL) and OCSP:**

```nginx
# Enable OCSP stapling in Nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/certs/chain.crt;

# OCSP resolver
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

**Manual Revocation Process:**

```bash
#!/bin/bash
# revoke_certificate.sh

CERT_PATH=$1
REASON=$2  # keyCompromise, affiliationChanged, superseded, cessationOfOperation

# Revoke certificate with cert-manager
kubectl delete certificate dcmms-api-tls -n production

# Re-issue new certificate
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dcmms-api-tls-new
  namespace: production
spec:
  secretName: dcmms-api-tls-secret-new
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - dcmms-api.company.com
EOF

# Wait for new certificate to be ready
kubectl wait --for=condition=Ready certificate/dcmms-api-tls-new -n production --timeout=300s

# Update Ingress to use new certificate
kubectl patch ingress dcmms-api-ingress -n production \
  --type='json' -p='[{"op": "replace", "path": "/spec/tls/0/secretName", "value":"dcmms-api-tls-secret-new"}]'

# Log revocation
echo "$(date): Certificate revoked and replaced. Reason: $REASON" >> /var/log/cert-revocation.log
```

---

## 4. Secrets Management

### 4.1 HashiCorp Vault Integration

**Vault Architecture:**

```
┌────────────────────────────────────────────────────────────┐
│              Application (dCMMS API)                        │
│  ├─ Reads secrets via Vault Agent                          │
│  ├─ Dynamic database credentials (TTL: 1 hour)             │
│  └─ API keys, certificates rotated automatically           │
└──────────┬─────────────────────────────────────────────────┘
           │
           ↓
┌────────────────────────────────────────────────────────────┐
│              HashiCorp Vault                                │
│  ├─ KV Secrets Engine (API keys, passwords)                │
│  ├─ Database Secrets Engine (dynamic credentials)          │
│  ├─ PKI Secrets Engine (TLS certificates)                  │
│  ├─ Transit Secrets Engine (encryption as a service)       │
│  └─ Audit logging (all access logged)                      │
└────────────────────────────────────────────────────────────┘
```

**Vault Secret Paths:**

```
secrets/
├─ database/
│  ├─ postgres-admin  (TTL: 1 hour, auto-rotated)
│  ├─ timescaledb-app  (TTL: 1 hour)
│  └─ redis-password
│
├─ external-apis/
│  ├─ sap/client_secret
│  ├─ okta/client_secret
│  ├─ tomorrow_io/api_key
│  └─ twilio/auth_token
│
├─ encryption/
│  ├─ data-encryption-key-v1
│  └─ jwt-signing-key
│
└─ certificates/
   ├─ mqtt-ca
   ├─ edge-gateway-cert
   └─ service-mesh-ca
```

**Vault Policy (Read-Only for API):**

```hcl
# Policy: dcmms-api-read
path "secret/data/database/*" {
  capabilities = ["read"]
}

path "secret/data/external-apis/*" {
  capabilities = ["read"]
}

path "secret/data/encryption/*" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}
```

**Application Integration:**

```javascript
const vault = require('node-vault')({
  apiVersion: 'v1',
  endpoint: 'https://vault.company.com:8200',
  token: process.env.VAULT_TOKEN  // Injected by Kubernetes via Vault Agent
});

// Get database credentials
async function getDatabaseCredentials() {
  try {
    const result = await vault.read('database/creds/dcmms-app');

    return {
      username: result.data.username,
      password: result.data.password,
      lease_id: result.lease_id,
      lease_duration: result.lease_duration
    };
  } catch (error) {
    console.error('Failed to read database credentials from Vault:', error);
    throw error;
  }
}

// Renew lease before expiry
async function renewLease(leaseId) {
  try {
    await vault.write(`sys/leases/renew`, { lease_id: leaseId });
  } catch (error) {
    console.error('Failed to renew Vault lease:', error);
    // Re-authenticate and get new credentials
    const newCreds = await getDatabaseCredentials();
    return newCreds;
  }
}

// Encrypt sensitive data using Vault Transit
async function encryptWithVault(plaintext) {
  const result = await vault.write('transit/encrypt/dcmms-key', {
    plaintext: Buffer.from(plaintext).toString('base64')
  });

  return result.data.ciphertext;
}

// Decrypt
async function decryptWithVault(ciphertext) {
  const result = await vault.write('transit/decrypt/dcmms-key', {
    ciphertext
  });

  return Buffer.from(result.data.plaintext, 'base64').toString('utf8');
}
```

### 4.2 Kubernetes Secrets with External Secrets Operator

**External Secrets Configuration:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dcmms-api-secrets
  namespace: production
spec:
  refreshInterval: 1h

  secretStoreRef:
    name: vault-backend
    kind: SecretStore

  target:
    name: dcmms-api-secrets
    creationPolicy: Owner

  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: secret/database/postgres-admin
        property: connection_string

    - secretKey: OKTA_CLIENT_SECRET
      remoteRef:
        key: secret/external-apis/okta
        property: client_secret

    - secretKey: JWT_SECRET
      remoteRef:
        key: secret/encryption/jwt-signing-key
        property: value
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.company.com:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "dcmms-api"
          serviceAccountRef:
            name: dcmms-api
```

### 4.3 Secrets Rotation Schedule

| Secret Type | Rotation Frequency | Automated | Owner |
|-------------|-------------------|-----------|-------|
| Database passwords | 30 days | ✅ Yes (Vault) | Platform team |
| API keys (external) | 90 days | ❌ Manual | Integration team |
| JWT signing key | 90 days | ✅ Yes | Security team |
| Service account tokens | 90 days | ✅ Yes (Kubernetes) | Platform team |
| Encryption keys | 90 days | ✅ Yes (KMS) | Security team |
| TLS certificates | 30 days before expiry | ✅ Yes (cert-manager) | Security team |

---

## 5. Audit Logging Specifications

### 5.1 Audit Log Structure (Detailed)

**Complete Audit Log Schema** (extends `auditlog.schema.json` from spec 11):

```typescript
interface AuditLogEntry {
  // Core identifiers
  auditId: string;  // UUID
  tenantId: string;
  timestamp: Date;

  // Action details
  action: AuditAction;  // create, update, delete, login, etc.
  actionDetails: string;
  result: 'success' | 'failure' | 'partial';

  // Entity information
  entityType: string;  // work_order, asset, user, etc.
  entityId: string;
  entityName?: string;

  // Actor information
  userId: string;
  userName?: string;
  userRole?: string;
  actorType: 'user' | 'system' | 'api' | 'cron' | 'integration';

  // Changes (for updates/deletes)
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
  changesDiff?: Record<string, any>;
  changedFields?: string[];

  // Context
  context: {
    siteId?: string;
    workOrderId?: string;
    sessionId?: string;
    correlationId?: string;  // Trace across services
    requestId?: string;
  };

  // Source
  source: {
    application: string;  // 'web-app', 'mobile-app', 'api', 'background-job'
    version?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: { lat: number; lon: number };
  };

  // Error details (if action failed)
  errorMessage?: string;
  errorCode?: string;
  stackTrace?: string;  // Only in dev/staging

  // Classification
  severity: 'info' | 'warning' | 'critical';
  category: AuditCategory;

  // Compliance
  compliance?: {
    relevant: boolean;
    regulations: string[];  // ['NERC-CIP', 'SOX', 'ISO-27001']
    retainUntil?: Date;
  };

  // Metadata
  tags?: string[];
  indexed: boolean;
  ttl?: number;  // Time-to-live in days
}

type AuditAction =
  | 'create' | 'read' | 'update' | 'delete' | 'restore'
  | 'login' | 'logout' | 'login_failed'
  | 'password_change' | 'password_reset'
  | 'permission_granted' | 'permission_revoked'
  | 'export' | 'import'
  | 'approve' | 'reject'
  | 'assign' | 'unassign'
  | 'state_transition'
  | 'execute' | 'cancel' | 'archive'
  | 'custom';

type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration_change'
  | 'security_event'
  | 'compliance'
  | 'integration'
  | 'system_event';
```

### 5.2 Audit Logging Implementation

**Centralized Audit Logger:**

```javascript
class AuditLogger {
  constructor() {
    this.transport = new ElasticsearchTransport({
      node: process.env.ELASTICSEARCH_URL,
      index: 'audit-logs-{yyyy.MM.dd}'
    });
  }

  async log(entry) {
    // Validate entry
    const validated = this.validateAuditEntry(entry);

    // Add automatic fields
    validated.timestamp = new Date();
    validated.auditId = uuidv4();
    validated.indexed = true;

    // Determine retention based on compliance requirements
    validated.ttl = this.determineTTL(validated);

    // Sanitize sensitive data
    validated = this.sanitizeSensitiveData(validated);

    // Write to Elasticsearch
    await this.transport.index({
      index: `audit-logs-${format(validated.timestamp, 'yyyy.MM.dd')}`,
      body: validated
    });

    // Also write to immutable audit log (S3 + Glacier)
    if (validated.compliance?.relevant) {
      await this.writeToImmutableLog(validated);
    }

    // Emit metrics
    await metrics.increment('audit_log.entries', 1, {
      action: validated.action,
      category: validated.category,
      severity: validated.severity
    });
  }

  determineTTL(entry) {
    // Compliance-relevant logs: 7 years (2,555 days)
    if (entry.compliance?.relevant) {
      return 2555;
    }

    // Security events: 3 years
    if (entry.category === 'security_event' || entry.severity === 'critical') {
      return 1095;
    }

    // Authentication logs: 1 year
    if (entry.category === 'authentication') {
      return 365;
    }

    // Standard logs: 90 days
    return 90;
  }

  sanitizeSensitiveData(entry) {
    // Remove sensitive fields from changesBefore/changesAfter
    const sensitiveFields = ['password', 'ssn', 'creditCard', 'apiKey', 'secret'];

    if (entry.changesBefore) {
      entry.changesBefore = this.maskFields(entry.changesBefore, sensitiveFields);
    }

    if (entry.changesAfter) {
      entry.changesAfter = this.maskFields(entry.changesAfter, sensitiveFields);
    }

    return entry;
  }

  maskFields(obj, fields) {
    const masked = { ...obj };

    fields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***REDACTED***';
      }
    });

    return masked;
  }

  async writeToImmutableLog(entry) {
    // Write to S3 with Object Lock for immutability
    await s3.putObject({
      Bucket: 'dcmms-audit-logs-immutable',
      Key: `${entry.tenantId}/${format(entry.timestamp, 'yyyy/MM/dd')}/${entry.auditId}.json`,
      Body: JSON.stringify(entry),
      ServerSideEncryption: 'aws:kms',
      KMSKeyId: 'arn:aws:kms:us-east-1:123456789:key/audit-log-key',
      ObjectLockMode: 'COMPLIANCE',
      ObjectLockRetainUntilDate: addYears(entry.timestamp, 7)
    }).promise();
  }
}

// Usage in application
const auditLogger = new AuditLogger();

// Log user login
await auditLogger.log({
  action: 'login',
  actorType: 'user',
  userId: user.userId,
  userName: user.name,
  userRole: user.role,
  entityType: 'user',
  entityId: user.userId,
  result: 'success',
  category: 'authentication',
  severity: 'info',
  source: {
    application: 'web-app',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  },
  context: {
    sessionId: session.sessionId
  }
});

// Log work order state transition
await auditLogger.log({
  action: 'state_transition',
  actionDetails: `Changed work order status from '${oldStatus}' to '${newStatus}'`,
  actorType: 'user',
  userId: req.user.userId,
  userName: req.user.name,
  entityType: 'work_order',
  entityId: workOrder.workOrderId,
  changesBefore: { status: oldStatus },
  changesAfter: { status: newStatus },
  changedFields: ['status'],
  result: 'success',
  category: 'data_modification',
  severity: 'info',
  context: {
    siteId: workOrder.siteId,
    workOrderId: workOrder.workOrderId
  },
  source: {
    application: 'mobile-app',
    deviceId: req.deviceId
  }
});
```

### 5.3 Audit Log Retention Policy

```yaml
retention_policy:
  # Elasticsearch Index Lifecycle Management (ILM)
  hot_phase:
    duration: "7 days"
    replicas: 2
    priority: 100

  warm_phase:
    duration: "30 days"
    move_to_warm: true
    shrink_shards: 1
    readonly: true

  cold_phase:
    duration: "90 days"
    move_to_cold: true
    freeze: true

  delete_phase:
    duration: "2555 days"  # 7 years for compliance
    compliance_check: true  # Don't delete compliance-relevant logs

  # S3 lifecycle for immutable logs
  s3_glacier_transition:
    standard_to_glacier: "90 days"
    glacier_to_deep_archive: "365 days"
```

### 5.4 Audit Log Search & Analysis

**Elasticsearch Query Examples:**

```javascript
// Search for failed login attempts in last 24 hours
const failedLogins = await elasticsearch.search({
  index: 'audit-logs-*',
  body: {
    query: {
      bool: {
        must: [
          { match: { action: 'login_failed' } },
          { range: { timestamp: { gte: 'now-24h' } } }
        ]
      }
    },
    aggs: {
      by_user: {
        terms: { field: 'userId.keyword', size: 10 }
      }
    }
  }
});

// Detect privilege escalation attempts
const privilegeEscalation = await elasticsearch.search({
  index: 'audit-logs-*',
  body: {
    query: {
      bool: {
        must: [
          { match: { action: 'permission_granted' } },
          { match: { category: 'authorization' } },
          { range: { timestamp: { gte: 'now-7d' } } }
        ]
      }
    },
    aggs: {
      by_granted_to: {
        terms: { field: 'entityId.keyword' }
      }
    }
  }
});
```

---

## 6. Security Headers & Hardening

### 6.1 HTTP Security Headers

```javascript
// Express.js helmet middleware
const helmet = require('helmet');

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Remove unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://dcmms-api.company.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },

  // Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Permissions-Policy
  permissionsPolicy: {
    features: {
      camera: ["'self'"],
      microphone: ["'none'"],
      geolocation: ["'self'"],
      payment: ["'none'"]
    }
  }
}));
```

### 6.2 API Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// General API rate limit
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,  // 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 10,  // 10 login attempts per 15 minutes
  skipSuccessfulRequests: true,  // Don't count successful logins
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/v1/', generalLimiter);
app.use('/api/v1/auth/login', authLimiter);
```

### 6.3 Input Validation & Sanitization

```javascript
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Validation middleware
app.post('/api/v1/work-orders',
  body('title').isString().trim().isLength({ min: 1, max: 200 }).escape(),
  body('description').isString().trim().isLength({ max: 2000 }).customSanitizer(sanitizeHtml),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('siteId').isUUID(),
  body('assetId').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: errors.array()
        }
      });
    }

    // Create work order
    // ...
  }
);
```

---

## 7. Vulnerability Management

### 7.1 Vulnerability Scanning

**Automated Scanning Tools:**

```yaml
vulnerability_scanning:
  # Container image scanning
  trivy:
    enabled: true
    schedule: "daily"
    severity_threshold: "HIGH"
    action_on_critical: "block_deployment"

  # Dependency scanning
  snyk:
    enabled: true
    schedule: "daily"
    auto_fix_prs: true
    severity_threshold: "medium"

  # SAST (Static Application Security Testing)
  sonarqube:
    enabled: true
    trigger: "on_commit"
    quality_gate: "enforce"

  # DAST (Dynamic Application Security Testing)
  owasp_zap:
    enabled: true
    schedule: "weekly"
    environment: "staging"
```

**CI/CD Integration:**

```yaml
# GitHub Actions workflow
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  security_scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail build on vulnerabilities

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

### 7.2 Patch Management Process

**Severity-Based SLAs:**

| Severity | Patch Within | Testing Required | Approval Required |
|----------|-------------|------------------|-------------------|
| **Critical** | 24 hours | Smoke test only | Security lead |
| **High** | 7 days | Regression test | Tech lead |
| **Medium** | 30 days | Full test suite | Product owner |
| **Low** | 90 days | Full test suite | Product owner |

**Emergency Patch Procedure:**

```bash
#!/bin/bash
# emergency_patch.sh

SEVERITY=$1  # critical, high, medium, low
CVE_ID=$2
PATCH_DESCRIPTION=$3

case $SEVERITY in
  critical)
    # 1. Immediate notification
    send_alert "CRITICAL SECURITY PATCH REQUIRED: $CVE_ID"

    # 2. Create hotfix branch
    git checkout -b hotfix/security-$CVE_ID

    # 3. Apply patch
    # ... (automated or manual)

    # 4. Smoke test
    npm run test:smoke

    # 5. Deploy to staging
    kubectl apply -f k8s/staging/

    # 6. Smoke test staging
    npm run test:e2e:smoke

    # 7. Emergency approval (security lead)
    request_approval "security-lead"

    # 8. Deploy to production
    kubectl apply -f k8s/production/

    # 9. Monitor for 1 hour
    monitor_deployment 3600

    # 10. Log incident
    log_security_patch "$CVE_ID" "$PATCH_DESCRIPTION"
    ;;

  high)
    # Standard patch process (7 days)
    # ...
    ;;
esac
```

---

## 8. Incident Response

### 8.1 Security Incident Classification

| Severity | Definition | Response Time | Escalation |
|----------|-----------|---------------|------------|
| **P0 - Critical** | Active breach, data exfiltration, ransomware | Immediate (< 15 min) | CISO, CTO |
| **P1 - High** | Compromised credentials, privilege escalation | < 1 hour | Security lead, Tech lead |
| **P2 - Medium** | Failed intrusion attempt, DDoS | < 4 hours | Security team |
| **P3 - Low** | Policy violation, suspicious activity | < 24 hours | Security team |

### 8.2 Incident Response Playbook

**Incident Response Phases:**

1. **Detection & Analysis** (0-2 hours)
   - Identify incident via alerts/reports
   - Determine scope and severity
   - Activate incident response team
   - Begin timeline documentation

2. **Containment** (2-6 hours)
   - Isolate affected systems
   - Revoke compromised credentials
   - Block malicious IPs at firewall
   - Preserve evidence for forensics

3. **Eradication** (6-24 hours)
   - Remove malware/backdoors
   - Patch vulnerabilities
   - Reset compromised accounts
   - Rebuild compromised systems

4. **Recovery** (24-72 hours)
   - Restore systems from clean backups
   - Verify system integrity
   - Monitor for reinfection
   - Gradual return to normal operations

5. **Post-Incident Review** (1 week after)
   - Root cause analysis
   - Document lessons learned
   - Update runbooks and procedures
   - Implement preventive measures

**Incident Response Contacts:**

```yaml
incident_response_team:
  - role: "Incident Commander"
    name: "Security Lead"
    phone: "+1-555-0100"
    email: "security-lead@company.com"
    escalation: "CISO"

  - role: "Technical Lead"
    name: "Tech Lead"
    phone: "+1-555-0101"
    email: "tech-lead@company.com"

  - role: "Communications Lead"
    name: "Product Owner"
    phone: "+1-555-0102"
    email: "product-owner@company.com"

  external_contacts:
    - "Law Enforcement (if criminal activity)"
    - "Legal Counsel"
    - "Cyber Insurance Provider"
    - "Affected Customers (if data breach)"
```

---

## 9. Security Testing

### 9.1 Penetration Testing Schedule

**Annual Penetration Test:**
- Frequency: Annually
- Scope: Full application (web, mobile, API, infrastructure)
- Provider: External security firm (e.g., NCC Group, Bishop Fox)
- Deliverables: Executive summary, detailed findings, remediation plan

**Quarterly Internal Security Assessments:**
- Automated vulnerability scans
- Configuration reviews
- Access control audits
- Patch compliance checks

### 9.2 Bug Bounty Program (Future)

```yaml
bug_bounty:
  enabled: false  # Enable in Release 2
  platform: "hackerone"

  scope:
    in_scope:
      - "*.dcmms.company.com"
      - "Mobile app (iOS/Android)"
      - "API endpoints"

    out_of_scope:
      - "Third-party services"
      - "Social engineering"
      - "Physical security"

  severity_rewards:
    critical: "$5,000 - $10,000"
    high: "$1,000 - $5,000"
    medium: "$500 - $1,000"
    low: "$100 - $500"

  rules:
    - "Report privately, no public disclosure before fix"
    - "One issue per report"
    - "Valid proof-of-concept required"
```

---

## 10. Compliance Checklist

### 10.1 Security Controls Checklist

**Pre-Production Security Review:**

```yaml
security_checklist:
  authentication:
    - [ ] OAuth2/OIDC integration tested
    - [ ] MFA enforced for admin accounts
    - [ ] Password policy enforced (12+ chars, complexity)
    - [ ] Failed login attempts rate-limited
    - [ ] Session timeout configured (15 min idle, 8 hours max)

  authorization:
    - [ ] RBAC implemented and tested
    - [ ] ABAC for site/resource isolation tested
    - [ ] Principle of least privilege enforced
    - [ ] Permission checks on all sensitive operations

  encryption:
    - [ ] TLS 1.3 enabled, TLS 1.2 minimum
    - [ ] Database encryption at rest (AES-256)
    - [ ] Field-level encryption for PII
    - [ ] Mobile local storage encrypted (SQLCipher)

  key_management:
    - [ ] All keys stored in KMS/Vault
    - [ ] Automated key rotation configured
    - [ ] Key access audit logging enabled

  audit_logging:
    - [ ] All authentication events logged
    - [ ] All data modifications logged
    - [ ] Log integrity protection enabled
    - [ ] 7-year retention for compliance logs

  secrets_management:
    - [ ] No secrets in source code
    - [ ] No secrets in config files
    - [ ] All secrets in Vault/Secrets Manager
    - [ ] 90-day secret rotation schedule

  vulnerability_management:
    - [ ] Dependency scanning in CI/CD
    - [ ] Container image scanning enabled
    - [ ] SAST integrated in pipeline
    - [ ] Quarterly penetration test scheduled

  incident_response:
    - [ ] Incident response plan documented
    - [ ] Incident response team identified
    - [ ] Runbooks for common incidents
    - [ ] Annual IR tabletop exercise scheduled

  compliance:
    - [ ] GDPR data processing agreement
    - [ ] SOC 2 audit scheduled
    - [ ] ISO 27001 gap analysis completed
    - [ ] NERC-CIP controls documented
```

### 10.2 Compliance Standards

**ISO 27001 Controls Mapping:**

| Control | Requirement | Implementation | Status |
|---------|-------------|----------------|--------|
| A.9.4.1 | Access restriction | RBAC/ABAC | ✅ Implemented |
| A.10.1.1 | Cryptographic policy | TLS 1.3, AES-256 | ✅ Implemented |
| A.12.4.1 | Event logging | Comprehensive audit logs | ✅ Implemented |
| A.9.2.1 | User registration | JIT provisioning via IdP | ✅ Implemented |
| A.12.3.1 | Backup copies | Daily backups, 7-day retention | ✅ Implemented |

---

## 11. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-10 | Security Team | Initial specification |

---

## 12. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | [TBD] | | |
| CISO | [TBD] | | |
| Tech Lead | [TBD] | | |
| Compliance Officer | [TBD] | | |
