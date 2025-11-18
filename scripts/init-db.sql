-- ==========================================
-- dCMMS PostgreSQL Initialization Script
-- ==========================================
-- This script initializes the database schema for the dCMMS application
-- Run automatically by docker-entrypoint-initdb.d

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For advanced indexing

-- ==========================================
-- ENUMS
-- ==========================================

CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'site_manager', 'technician', 'operator', 'viewer');
CREATE TYPE work_order_type AS ENUM ('corrective', 'preventive', 'predictive', 'inspection', 'emergency');
CREATE TYPE work_order_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE work_order_status AS ENUM ('draft', 'open', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE asset_status AS ENUM ('operational', 'degraded', 'down', 'maintenance', 'decommissioned');
CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'suppressed');

-- ==========================================
-- TABLES
-- ==========================================

-- Tenants (Multi-tenancy root)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    phone VARCHAR(20),
    last_login_at TIMESTAMPTZ,
    password_hash VARCHAR(255),  -- For local auth, null if using IdP
    idp_user_id VARCHAR(255),    -- External IdP user ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, username)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_idp_user_id ON users(idp_user_id);

-- Sites
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'solar', 'wind', 'hydro', 'mixed'
    location JSONB NOT NULL,    -- {lat, lon, address, timezone}
    capacity_mw DECIMAL(10, 2),
    commission_date DATE,
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, site_id)
);

CREATE INDEX idx_sites_tenant_id ON sites(tenant_id);
CREATE INDEX idx_sites_type ON sites(type);
CREATE INDEX idx_sites_is_active ON sites(is_active);

-- Assets
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    asset_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,  -- 'inverter', 'turbine', 'panel', 'transformer', etc.
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    installation_date DATE,
    warranty_expiry_date DATE,
    status asset_status NOT NULL DEFAULT 'operational',
    specifications JSONB DEFAULT '{}'::jsonb,
    location JSONB,  -- {lat, lon} or relative position
    hierarchy_path LTREE,  -- For efficient hierarchy queries
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, asset_id)
);

CREATE EXTENSION IF NOT EXISTS ltree;

CREATE INDEX idx_assets_tenant_id ON assets(tenant_id);
CREATE INDEX idx_assets_site_id ON assets(site_id);
CREATE INDEX idx_assets_parent_asset_id ON assets(parent_asset_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_hierarchy_path ON assets USING GIST(hierarchy_path);

-- Work Orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    work_order_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type work_order_type NOT NULL,
    priority work_order_priority NOT NULL DEFAULT 'medium',
    status work_order_status NOT NULL DEFAULT 'draft',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_hours DECIMAL(6, 2),
    actual_hours DECIMAL(6, 2),
    version INTEGER NOT NULL DEFAULT 1,  -- For optimistic locking
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, work_order_id)
);

CREATE INDEX idx_work_orders_tenant_id ON work_orders(tenant_id);
CREATE INDEX idx_work_orders_site_id ON work_orders(site_id);
CREATE INDEX idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX idx_work_orders_scheduled_start ON work_orders(scheduled_start);

-- Work Order Tasks
CREATE TABLE work_order_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    task_order INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_order_tasks_work_order_id ON work_order_tasks(work_order_id);

-- Parts/Inventory
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_price DECIMAL(12, 2),
    reorder_level INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, part_number)
);

CREATE INDEX idx_parts_tenant_id ON parts(tenant_id);
CREATE INDEX idx_parts_category ON parts(category);

-- Work Order Parts (Many-to-Many)
CREATE TABLE work_order_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES parts(id),
    quantity INTEGER NOT NULL,
    cost_per_unit DECIMAL(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_order_parts_work_order_id ON work_order_parts(work_order_id);
CREATE INDEX idx_work_order_parts_part_id ON work_order_parts(part_id);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    alert_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity alert_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'active',
    rule_id VARCHAR(100),  -- Reference to alert rule that triggered this
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, alert_id)
);

CREATE INDEX idx_alerts_tenant_id ON alerts(tenant_id);
CREATE INDEX idx_alerts_site_id ON alerts(site_id);
CREATE INDEX idx_alerts_asset_id ON alerts(asset_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete'
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_tasks_updated_at BEFORE UPDATE ON work_order_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEED DATA (Development Only)
-- ==========================================

-- Create default tenant
INSERT INTO tenants (tenant_id, name, domain, is_active)
VALUES ('default', 'Default Tenant', 'localhost', true);

-- Create admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (tenant_id, email, username, first_name, last_name, role, password_hash)
SELECT id, 'admin@dcmms.local', 'admin', 'System', 'Administrator', 'super_admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lE3kGqXaXq9q'
FROM tenants WHERE tenant_id = 'default';

-- Create demo site
INSERT INTO sites (tenant_id, site_id, name, type, location, capacity_mw)
SELECT id, 'site-001', 'Demo Solar Farm', 'solar', '{"lat": 37.7749, "lon": -122.4194, "address": "San Francisco, CA", "timezone": "America/Los_Angeles"}'::jsonb, 50.0
FROM tenants WHERE tenant_id = 'default';

COMMENT ON DATABASE dcmms IS 'dCMMS - Distributed Computerized Maintenance Management System';
