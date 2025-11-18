-- Seed Compliance Report Templates
-- System templates for NERC CIP-005, CEA, and MNRE compliance

-- Template 1: NERC CIP-005-7 (Cyber Security - Electronic Security Perimeter)
INSERT INTO compliance_report_templates (
    template_id,
    name,
    description,
    report_type,
    compliance_standard,
    version,
    required_fields,
    optional_fields,
    auto_populate_mappings,
    validation_rules,
    format,
    frequency,
    is_active,
    is_system_template
) VALUES (
    'NERC_CIP_005_7',
    'NERC CIP-005-7 Electronic Security Perimeter Report',
    'Quarterly report for NERC CIP-005-7 compliance covering electronic security perimeters, access points, and network monitoring.',
    'NERC_CIP_005',
    'NERC CIP-005-7',
    '1.0',
    '[
        {"name": "reporting_entity", "label": "Reporting Entity Name", "type": "text", "description": "Registered entity name"},
        {"name": "reporting_period", "label": "Reporting Period", "type": "daterange", "description": "Start and end date of reporting period"},
        {"name": "esp_diagram", "label": "ESP Network Diagram", "type": "file", "description": "Network diagram showing Electronic Security Perimeters"},
        {"name": "access_points", "label": "Access Point Inventory", "type": "table", "description": "List of all electronic access points"},
        {"name": "access_logs", "label": "Access Logs Summary", "type": "table", "description": "Summary of access attempts and authentications"},
        {"name": "security_events", "label": "Security Event Summary", "type": "table", "description": "Summary of security events detected"},
        {"name": "compliance_attestation", "label": "Compliance Attestation", "type": "text", "description": "Statement of compliance with CIP-005-7"}
    ]',
    '[
        {"name": "external_connectivity", "label": "External Connectivity Details", "type": "text"},
        {"name": "vpn_usage", "label": "VPN Usage Details", "type": "text"},
        {"name": "vendor_remote_access", "label": "Vendor Remote Access Summary", "type": "table"}
    ]',
    '{
        "access_logs": {
            "source": "audit_logs",
            "filters": {"action": ["login", "logout", "access_attempt"]},
            "fields": ["timestamp", "user_id", "ip_address", "action", "status"]
        },
        "security_events": {
            "source": "alerts",
            "filters": {"severity": ["critical", "high"], "type": "security"},
            "fields": ["created_at", "severity", "message", "status"]
        }
    }',
    '{
        "reporting_entity": {"required": true, "min_length": 1},
        "reporting_period": {"required": true, "validate": "daterange"},
        "esp_diagram": {"required": true, "file_types": ["pdf", "png", "jpg"]},
        "access_points": {"required": true, "min_rows": 1},
        "compliance_attestation": {"required": true, "min_length": 50}
    }',
    'pdf',
    'quarterly',
    true,
    true
);

-- Template 2: CEA (Central Electricity Authority - India) Maintenance Report
INSERT INTO compliance_report_templates (
    template_id,
    name,
    description,
    report_type,
    compliance_standard,
    version,
    required_fields,
    optional_fields,
    auto_populate_mappings,
    validation_rules,
    format,
    frequency,
    is_active,
    is_system_template
) VALUES (
    'CEA_MAINTENANCE_REPORT',
    'CEA Maintenance and Safety Compliance Report',
    'Annual report for Central Electricity Authority (India) covering asset maintenance, safety incidents, and operational compliance.',
    'CEA',
    'CEA Regulations 2010 (amended 2019)',
    '1.0',
    '[
        {"name": "plant_name", "label": "Plant/Site Name", "type": "text", "description": "Name of the power plant or site"},
        {"name": "plant_capacity", "label": "Installed Capacity (MW)", "type": "number", "description": "Total installed capacity"},
        {"name": "reporting_year", "label": "Reporting Year", "type": "year", "description": "Calendar year for the report"},
        {"name": "asset_register", "label": "Asset Register", "type": "table", "description": "Complete list of critical assets with details"},
        {"name": "maintenance_logs", "label": "Maintenance Activity Logs", "type": "table", "description": "All preventive and corrective maintenance activities"},
        {"name": "incident_reports", "label": "Incident Reports", "type": "table", "description": "All safety incidents and near-misses"},
        {"name": "compliance_certificate", "label": "Compliance Certificate", "type": "text", "description": "Certificate of compliance signed by authorized person"}
    ]',
    '[
        {"name": "contractor_details", "label": "Contractor Details", "type": "table"},
        {"name": "training_records", "label": "Staff Training Records", "type": "table"},
        {"name": "spare_parts_inventory", "label": "Spare Parts Inventory", "type": "table"}
    ]',
    '{
        "asset_register": {
            "source": "assets",
            "filters": {"status": ["operational", "degraded", "maintenance"]},
            "fields": ["name", "type", "model", "serial_number", "commissioned_date", "location"]
        },
        "maintenance_logs": {
            "source": "work_orders",
            "filters": {"type": ["preventive", "corrective"], "status": "completed"},
            "fields": ["wo_id", "asset_id", "type", "scheduled_start", "completed_at", "description", "assigned_to"]
        },
        "incident_reports": {
            "source": "alerts",
            "filters": {"severity": ["critical", "high"], "status": "resolved"},
            "fields": ["alarm_id", "asset_id", "severity", "created_at", "message", "resolved_at"]
        }
    }',
    '{
        "plant_name": {"required": true, "min_length": 1},
        "plant_capacity": {"required": true, "min": 0.1},
        "reporting_year": {"required": true, "validate": "year"},
        "asset_register": {"required": true, "min_rows": 1},
        "maintenance_logs": {"required": true, "min_rows": 1},
        "compliance_certificate": {"required": true, "min_length": 100}
    }',
    'pdf',
    'annually',
    true,
    true
);

-- Template 3: MNRE (Ministry of New and Renewable Energy - India) Generation Report
INSERT INTO compliance_report_templates (
    template_id,
    name,
    description,
    report_type,
    compliance_standard,
    version,
    required_fields,
    optional_fields,
    auto_populate_mappings,
    validation_rules,
    format,
    frequency,
    is_active,
    is_system_template
) VALUES (
    'MNRE_GENERATION_REPORT',
    'MNRE Renewable Energy Generation Report',
    'Quarterly generation report for Ministry of New and Renewable Energy (India) covering capacity factor, generation statistics, and performance metrics.',
    'MNRE',
    'MNRE Operational Guidelines 2021',
    '1.0',
    '[
        {"name": "project_name", "label": "Project Name", "type": "text", "description": "Name of the renewable energy project"},
        {"name": "project_type", "label": "Project Type", "type": "select", "options": ["Solar", "Wind", "Hydro", "Biomass", "Hybrid"], "description": "Type of renewable energy"},
        {"name": "installed_capacity", "label": "Installed Capacity (MW)", "type": "number", "description": "Total installed capacity"},
        {"name": "reporting_quarter", "label": "Reporting Quarter", "type": "quarter", "description": "Quarter and year (e.g., Q1 2024)"},
        {"name": "generation_data", "label": "Monthly Generation Data", "type": "table", "description": "Month-wise generation in MWh"},
        {"name": "capacity_factor", "label": "Capacity Factor (%)", "type": "number", "description": "Average capacity factor for the quarter"},
        {"name": "plant_load_factor", "label": "Plant Load Factor (%)", "type": "number", "description": "Average PLF for the quarter"},
        {"name": "downtime_analysis", "label": "Downtime Analysis", "type": "table", "description": "Breakdown of planned and unplanned downtime"},
        {"name": "performance_ratio", "label": "Performance Ratio", "type": "number", "description": "Overall system performance ratio"}
    ]',
    '[
        {"name": "weather_data", "label": "Weather Data Summary", "type": "table"},
        {"name": "grid_availability", "label": "Grid Availability (%)", "type": "number"},
        {"name": "curtailment_losses", "label": "Curtailment Losses (MWh)", "type": "number"}
    ]',
    '{
        "generation_data": {
            "source": "telemetry_aggregates",
            "filters": {"metric_name": "power_generation"},
            "aggregation": "sum",
            "group_by": "month",
            "fields": ["month", "total_generation_mwh"]
        },
        "downtime_analysis": {
            "source": "work_orders",
            "filters": {"type": ["corrective", "emergency"], "status": "completed"},
            "fields": ["scheduled_start", "completed_at", "duration_hours", "type", "description"]
        }
    }',
    '{
        "project_name": {"required": true, "min_length": 1},
        "project_type": {"required": true, "validate": "enum"},
        "installed_capacity": {"required": true, "min": 0.1},
        "reporting_quarter": {"required": true, "validate": "quarter"},
        "generation_data": {"required": true, "min_rows": 3, "max_rows": 3},
        "capacity_factor": {"required": true, "min": 0, "max": 100},
        "plant_load_factor": {"required": true, "min": 0, "max": 100},
        "performance_ratio": {"required": true, "min": 0, "max": 1}
    }',
    'pdf',
    'quarterly',
    true,
    true
);

-- Display seeded templates
SELECT template_id, name, report_type, compliance_standard
FROM compliance_report_templates
WHERE is_system_template = true;
