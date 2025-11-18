# ADR-002: Identity Provider (IdP) Adapter Pattern

**Status:** Accepted
**Date:** 2025-11-18
**Decision Makers:** Security Architecture Team, Backend Team, Product Management
**Related:** Spec 03 (Auth/Authorization), STAKEHOLDER_DECISIONS.md

---

## Context

dCMMS must support authentication and authorization for various customer environments with different identity provider (IdP) requirements:

- **Enterprise Customers:** Existing Azure AD, Okta, or custom SAML/OIDC providers
- **SMB Customers:** Auth0, Keycloak, or dCMMS-managed authentication
- **Regulatory:** Must support customer's compliance requirements (SOC 2, ISO 27001)
- **Multi-Tenancy:** Different tenants may use different IdPs

### Decision Drivers

1. **Customer Flexibility:** Support customer's existing IdP investments
2. **Security Standards:** OAuth 2.0, OIDC, SAML 2.0 compliance
3. **Vendor Independence:** Avoid lock-in to single IdP vendor
4. **Operational Simplicity:** Common authentication flow regardless of IdP
5. **Time-to-Market:** Need working auth for MVP (Week 14) before all IdP integrations complete

---

## Decision

We will implement an **Identity Provider Adapter Pattern** that abstracts IdP-specific implementations behind a common interface.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Frontend App │  │ Mobile App   │  │ Backend API  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │ Auth Middleware │                           │
│                    │  (JWT Verify)   │                           │
│                    └───────┬────────┘                           │
├────────────────────────────┼─────────────────────────────────────┤
│              IdP Adapter Interface                               │
│  ┌─────────────────────────▼───────────────────────────┐        │
│  │           IIdentityProviderAdapter                   │        │
│  ├──────────────────────────────────────────────────────┤        │
│  │ + authenticate(credentials): Token                   │        │
│  │ + validateToken(token): UserInfo                     │        │
│  │ + refreshToken(refreshToken): Token                  │        │
│  │ + getUserInfo(userId): UserProfile                   │        │
│  │ + revokeToken(token): void                           │        │
│  │ + getAuthorizationUrl(): string                      │        │
│  │ + handleCallback(code): Token                        │        │
│  └──────┬────────┬─────────┬──────────┬─────────┬──────┘        │
│         │        │         │          │         │                │
├─────────┼────────┼─────────┼──────────┼─────────┼────────────────┤
│ Adapter Implementations (Concrete Classes)                       │
│  ┌──────▼─────┐ ┌▼────────┐ ┌▼──────┐ ┌▼──────┐ ┌▼─────────┐   │
│  │Auth0Adapter│ │AzureAD  │ │Keycloak│ │Okta   │ │Custom    │   │
│  │            │ │Adapter  │ │Adapter │ │Adapter│ │SAML      │   │
│  └────────────┘ └─────────┘ └────────┘ └───────┘ └──────────┘   │
│         │              │          │          │          │         │
├─────────┼──────────────┼──────────┼──────────┼──────────┼─────────┤
│ External Identity Providers                                      │
│  ┌──────▼─────┐ ┌─────▼────┐ ┌──▼─────┐ ┌───▼───┐ ┌───▼──────┐ │
│  │   Auth0    │ │ Azure AD │ │Keycloak│ │ Okta  │ │ Customer │ │
│  │   (SaaS)   │ │  (Cloud) │ │(Self-  │ │(SaaS) │ │   IdP    │ │
│  │            │ │          │ │Hosted) │ │       │ │  (SAML)  │ │
│  └────────────┘ └──────────┘ └────────┘ └───────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Adapter Interface (TypeScript)

```typescript
/**
 * Common interface for all Identity Provider adapters
 */
export interface IIdentityProviderAdapter {
  /**
   * Authenticate user with credentials
   * @returns JWT access token and refresh token
   */
  authenticate(credentials: AuthCredentials): Promise<AuthTokens>;

  /**
   * Validate and decode JWT token
   * @returns User information from token claims
   */
  validateToken(token: string): Promise<UserInfo>;

  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<AuthTokens>;

  /**
   * Get user profile from IdP
   */
  getUserInfo(userId: string): Promise<UserProfile>;

  /**
   * Revoke/logout token
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Get OAuth2/OIDC authorization URL for redirect flow
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;

  /**
   * Handle OAuth2 callback (exchange code for token)
   */
  handleCallback(code: string, redirectUri: string): Promise<AuthTokens>;
}

export interface AuthCredentials {
  email?: string;
  password?: string;
  // OAuth2 flow
  code?: string;
  redirectUri?: string;
  // SAML flow
  samlResponse?: string;
}

export interface AuthTokens {
  accessToken: string;      // JWT for API access
  refreshToken: string;      // Token to refresh access
  expiresIn: number;         // Seconds until expiration
  tokenType: 'Bearer';
  idToken?: string;          // OIDC ID token (optional)
}

export interface UserInfo {
  userId: string;            // Internal user ID
  email: string;
  name?: string;
  roles: string[];           // User roles from IdP
  tenantId: string;          // Multi-tenant support
  idpUserId: string;         // Original IdP user ID
  metadata?: Record<string, any>;
}

export interface UserProfile extends UserInfo {
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  photoUrl?: string;
  locale?: string;
}
```

### Factory Pattern for Adapter Selection

```typescript
/**
 * Factory to create appropriate IdP adapter based on configuration
 */
export class IdentityProviderFactory {
  private static adapters: Map<string, IIdentityProviderAdapter> = new Map();

  /**
   * Get IdP adapter for tenant
   * Configuration loaded from database or environment
   */
  static getAdapter(tenantId: string): IIdentityProviderAdapter {
    // Check cache first
    if (this.adapters.has(tenantId)) {
      return this.adapters.get(tenantId)!;
    }

    // Load tenant IdP configuration from database
    const config = this.loadTenantIdPConfig(tenantId);

    // Create appropriate adapter
    let adapter: IIdentityProviderAdapter;
    switch (config.provider) {
      case 'auth0':
        adapter = new Auth0Adapter(config);
        break;
      case 'azure-ad':
        adapter = new AzureADAdapter(config);
        break;
      case 'keycloak':
        adapter = new KeycloakAdapter(config);
        break;
      case 'okta':
        adapter = new OktaAdapter(config);
        break;
      case 'saml':
        adapter = new SAMLAdapter(config);
        break;
      default:
        throw new Error(`Unsupported IdP provider: ${config.provider}`);
    }

    // Cache adapter
    this.adapters.set(tenantId, adapter);
    return adapter;
  }

  private static loadTenantIdPConfig(tenantId: string): IdPConfig {
    // Load from database: tenant_idp_config table
    // Contains: provider type, client_id, client_secret, domain, etc.
  }
}
```

### Configuration Schema

```sql
-- Tenant IdP Configuration Table
CREATE TABLE tenant_idp_config (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider VARCHAR(50) NOT NULL,  -- 'auth0', 'azure-ad', 'keycloak', etc.

  -- OAuth2/OIDC Configuration
  client_id VARCHAR(255),
  client_secret_encrypted TEXT,
  domain VARCHAR(255),
  authorization_endpoint TEXT,
  token_endpoint TEXT,
  userinfo_endpoint TEXT,
  jwks_uri TEXT,

  -- SAML Configuration
  saml_idp_entity_id VARCHAR(255),
  saml_sso_url TEXT,
  saml_certificate TEXT,

  -- Configuration
  scopes TEXT[],              -- e.g., ['openid', 'profile', 'email']
  role_claim_path VARCHAR(255), -- JSON path to roles in token
  enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)  -- One IdP per tenant (for now)
);
```

---

## Consequences

### Positive

1. **Customer Flexibility:** Support any IdP vendor customers require
2. **Vendor Independence:** Easy to add new IdP providers
3. **Consistent Security:** Common token validation, RBAC enforcement
4. **Multi-Tenancy:** Different tenants can use different IdPs
5. **Testability:** Easy to mock IdP for testing (MockAdapter)
6. **Migration:** Customers can switch IdPs without application changes

### Negative

1. **Complexity:** Additional abstraction layer to maintain
2. **Feature Parity:** Must ensure all adapters support required features
3. **Configuration:** More configuration required per tenant
4. **Testing:** Must test each adapter implementation separately

### Neutral

1. **Initial Implementation:** Focus on Auth0 adapter for MVP (Week 14)
2. **JWT Standard:** All adapters must produce compliant JWTs
3. **Adapter Development:** New adapters can be added in parallel with features

---

## Implementation Plan

### Sprint 0 (Week 1-2)
- ✅ Design adapter interface (this ADR)
- ✅ Define configuration schema
- ✅ Create factory pattern

### Sprint 1 (Week 5-6)
- [DCMMS-020] Implement adapter interface (TypeScript)
- [DCMMS-021] Implement Auth0 adapter (primary for MVP)
- [DCMMS-022] Implement MockAdapter for testing

### Sprint 2 (Week 7-8)
- Implement AzureAD adapter
- Implement Keycloak adapter
- Integration testing

### Release 1+ (Week 26+)
- Okta adapter (if customer requires)
- Custom SAML adapter (if customer requires)
- Multi-factor authentication support

---

## Supported Identity Providers

### Priority 0 (MVP - Week 14)
- ✅ **Auth0**: Primary IdP for MVP and SMB customers
- ✅ **MockAdapter**: For development and testing

### Priority 1 (Release 1 - Week 26)
- ✅ **Azure AD**: Enterprise customers with Microsoft 365
- ✅ **Keycloak**: Self-hosted open-source option

### Priority 2 (Release 2+)
- **Okta**: Enterprise customers (on demand)
- **Custom SAML**: For customers with legacy SAML IdPs
- **Google Workspace**: SMB customers (on demand)
- **AWS Cognito**: If deploying on AWS

---

## Security Considerations

1. **Token Security:**
   - All IdP adapters must return JWT tokens signed with RS256 or stronger
   - Tokens validated on every API request
   - Short-lived access tokens (15 minutes)
   - Refresh tokens stored securely (httpOnly cookies or secure storage)

2. **Secret Management:**
   - IdP client secrets stored encrypted in database
   - Encryption keys managed by HashiCorp Vault
   - Rotation policy: 90 days

3. **Role Mapping:**
   - IdP roles mapped to dCMMS internal roles via configuration
   - Role claim path configurable per IdP (e.g., `roles`, `groups`, `app_metadata.roles`)
   - Default roles assigned if IdP doesn't provide roles

4. **Audit Logging:**
   - All authentication attempts logged (success and failure)
   - Token validation failures logged
   - IdP configuration changes logged

---

## Testing Strategy

1. **Unit Tests:** Each adapter implementation (100% coverage)
2. **Integration Tests:** Real IdP providers (Auth0, Azure AD dev tenants)
3. **Mock Tests:** MockAdapter for CI/CD pipeline
4. **E2E Tests:** Full authentication flow (frontend → backend → IdP)
5. **Security Tests:** Token tampering, replay attacks, expiration

---

## Alternatives Considered

### Alternative 1: Single IdP (Auth0 Only)
**Rejected:** Limits customer flexibility, creates vendor lock-in

### Alternative 2: Direct Integration (No Adapter Pattern)
**Rejected:** High coupling, difficult to add new IdPs, testing complexity

### Alternative 3: Third-Party Auth Library (e.g., Passport.js)
**Partially Adopted:** Passport.js strategies can be used within adapters, but adapter pattern still needed for consistency

---

## Compliance

This decision aligns with:
- **Spec 03 (Auth/Authorization):** OAuth2/OIDC, SAML 2.0, RBAC
- **Spec 09 (Role Feature Access Matrix):** Role mapping from IdP
- **Spec 13 (Security Implementation):** Encryption, secrets management
- **STAKEHOLDER_DECISIONS.md:** Flexible IdP support required

---

## References

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [SAML 2.0 Specification](http://docs.oasis-open.org/security/saml/v2.0/)
- Spec 03: Auth/Authorization
- Spec 09: Role Feature Access Matrix
- STAKEHOLDER_DECISIONS.md - Nov 15, 2025

---

**Last Updated:** 2025-11-18
**Review Date:** 2026-02-18 (3 months)
**Status:** ✅ Accepted
