-- Compliance Report Templates and Generated Reports Tables

-- Compliance Report Templates
CREATE TABLE IF NOT EXISTS compliance_report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,  -- NERC_CIP_005, CEA, MNRE
    compliance_standard VARCHAR(100) NOT NULL,  -- e.g., "NERC CIP-005-7", "CEA Regulations 2010"
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    required_fields JSONB NOT NULL DEFAULT '[]',
    optional_fields JSONB NOT NULL DEFAULT '[]',
    auto_populate_mappings JSONB,  -- Field mappings to dCMMS data
    validation_rules JSONB,  -- Validation rules for fields
    format VARCHAR(20) NOT NULL DEFAULT 'pdf',  -- pdf, csv, json
    frequency VARCHAR(50),  -- monthly, quarterly, annually
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_template BOOLEAN NOT NULL DEFAULT false,  -- System templates cannot be deleted
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Compliance Generated Reports
CREATE TABLE IF NOT EXISTS compliance_generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES compliance_report_templates(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, final, submitted, archived
    report_data JSONB NOT NULL,  -- All report data (auto + manual)
    file_url TEXT,  -- S3 URL or local path
    file_size_bytes BIGINT,
    file_format VARCHAR(20) NOT NULL DEFAULT 'pdf',
    watermark VARCHAR(50) DEFAULT 'DRAFT',
    generated_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    finalized_at TIMESTAMP,
    submitted_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_compliance_templates_tenant ON compliance_report_templates(tenant_id);
CREATE INDEX idx_compliance_templates_type ON compliance_report_templates(report_type);
CREATE INDEX idx_compliance_templates_active ON compliance_report_templates(is_active);

CREATE INDEX idx_compliance_reports_tenant ON compliance_generated_reports(tenant_id);
CREATE INDEX idx_compliance_reports_template ON compliance_generated_reports(template_id);
CREATE INDEX idx_compliance_reports_site ON compliance_generated_reports(site_id);
CREATE INDEX idx_compliance_reports_status ON compliance_generated_reports(status);
CREATE INDEX idx_compliance_reports_generated_at ON compliance_generated_reports(generated_at DESC);
CREATE INDEX idx_compliance_reports_period ON compliance_generated_reports(reporting_period_start, reporting_period_end);

-- Comments
COMMENT ON TABLE compliance_report_templates IS 'Templates for compliance reports (NERC CIP, CEA, MNRE)';
COMMENT ON TABLE compliance_generated_reports IS 'Generated compliance reports with file storage';
COMMENT ON COLUMN compliance_report_templates.auto_populate_mappings IS 'JSON mapping of template fields to dCMMS data sources';
COMMENT ON COLUMN compliance_report_templates.validation_rules IS 'JSON validation rules for required fields';
COMMENT ON COLUMN compliance_generated_reports.report_data IS 'Complete report data including auto-populated and manual fields';
COMMENT ON COLUMN compliance_generated_reports.status IS 'Report lifecycle: draft -> final -> submitted -> archived';
