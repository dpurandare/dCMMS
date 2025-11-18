-- Custom Report Definitions Table

CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    datasource VARCHAR(50) NOT NULL,
    columns TEXT NOT NULL,  -- JSON array
    filters TEXT DEFAULT '[]',  -- JSON array
    group_by TEXT DEFAULT '[]',  -- JSON array
    aggregations TEXT DEFAULT '[]',  -- JSON array
    order_by TEXT DEFAULT '[]',  -- JSON array
    limit_rows INTEGER DEFAULT 1000,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_definitions_tenant ON report_definitions(tenant_id);
CREATE INDEX idx_report_definitions_created_by ON report_definitions(created_by);
CREATE INDEX idx_report_definitions_datasource ON report_definitions(datasource);

-- Comments
COMMENT ON TABLE report_definitions IS 'User-defined custom report definitions';
COMMENT ON COLUMN report_definitions.datasource IS 'Data source: work_orders, assets, telemetry, alarms';
COMMENT ON COLUMN report_definitions.columns IS 'Array of column names to include in report';
COMMENT ON COLUMN report_definitions.filters IS 'Array of filter definitions: [{field, operator, value}]';
COMMENT ON COLUMN report_definitions.group_by IS 'Array of groupBy fields: [day, week, month, site, etc.]';
COMMENT ON COLUMN report_definitions.aggregations IS 'Array of aggregations: [{field, type, alias}]';
COMMENT ON COLUMN report_definitions.is_public IS 'Whether report is accessible to all users in tenant';
