# dCMMS Quick Start Guides

**Version:** 1.0 (Release 2 - v0.3.0)
**Last Updated:** 2025-11-19

This document contains quick start guides for all user roles. Each guide is designed to be printed as a 2-4 page PDF reference.

---

## Quick Start Guide: Field Technician

### Getting Started

**1. Download Mobile App**
- Android: Google Play Store
- iOS: Apple App Store
- Search: "dCMMS Mobile"

**2. Login**
- Email: [provided by supervisor]
- Password: [provided by supervisor]
- First login: You'll be prompted to change password

**3. Enable Offline Mode**
- Tap Settings → Offline Mode → Enable
- Downloads your assigned work orders for offline access

### Daily Workflow

**Morning (Start of Shift)**
- [ ] Open app and sync data (if online)
- [ ] Review assigned work orders
- [ ] Check priority work orders
- [ ] Gather tools and parts needed

**During Work**
- [ ] Scan asset QR code to open work order
- [ ] Update status to "In Progress"
- [ ] Complete work as per SOP
- [ ] Take before/after photos
- [ ] Log parts used
- [ ] Log time spent

**End of Shift**
- [ ] Complete all work orders
- [ ] Add notes/comments
- [ ] Upload photos and data (sync)
- [ ] Report any issues to supervisor

### Completing a Work Order (Step-by-Step)

1. **Select Work Order:** Tap from list or scan QR code
2. **Review Details:** Asset info, problem description, priority
3. **Start Work:** Tap "Start Work" → Status changes to "In Progress"
4. **Perform Maintenance:** Follow instructions and SOPs
5. **Log Activity:**
   - Parts used: Tap "Add Parts"
   - Time spent: Auto-tracked or enter manually
   - Notes: Add observations
6. **Take Photos:** Before, during, after
7. **Complete Work:**
   - Tap "Mark Complete"
   - Add final comments
   - Submit work order
8. **Sync Data:** Auto-syncs when online

### Key Features

**Work Orders Tab**
- View assigned work orders
- Filter by priority, status, site
- Search by asset or work order ID

**Assets Tab**
- Scan QR code to view asset details
- View maintenance history
- Create ad-hoc work orders

**Profile Tab**
- View completion statistics
- Update personal information
- Contact supervisor

### FAQ

**Q: What if I have no internet?**
A: Offline mode! Work orders sync automatically when connected.

**Q: How do I report a new issue?**
A: Assets tab → Select asset → "Create Work Order"

**Q: What if I don't have all the parts?**
A: Update status to "Waiting for Parts" and notify supervisor

**Q: Can I see other technicians' work orders?**
A: No, you only see work orders assigned to you

### Tips for Success

✓ Sync data twice daily (morning & evening)
✓ Take clear, well-lit photos
✓ Log time accurately for performance tracking
✓ Report issues immediately
✓ Keep app updated (check weekly)
✓ Charge device before shift

### Support

- **Technical Issues:** support@dcmms.com
- **Your Supervisor:** [Contact info]
- **Emergency:** 1-800-DCMMS-HELP
- **Training:** training.dcmms.com
- **User Guide:** docs.dcmms.com/field-tech

---

## Quick Start Guide: Site Supervisor

### Getting Started

**1. Access Web Dashboard**
- URL: https://app.dcmms.com
- Login with your credentials
- Enable 2-factor authentication (if required)

**2. Dashboard Overview**
- **Top Navigation:** Sites, Work Orders, Assets, Analytics, Compliance
- **Summary Cards:** Open WOs, Alerts, Generation, Availability
- **Activity Feed:** Recent updates
- **Quick Actions:** Create work order, view alerts

### Core Responsibilities

**Work Order Management**
- Create and assign work orders
- Monitor work order progress
- Review completed work orders
- Handle escalations

**Team Coordination**
- Assign tasks to field technicians
- Monitor team performance
- Respond to field questions
- Track time and productivity

**Monitoring & Response**
- Monitor real-time telemetry
- Respond to alarms and anomalies
- Investigate equipment issues
- Coordinate preventive maintenance

### Creating a Work Order

1. Click **"New Work Order"** button
2. **Select Asset:** Choose from site equipment
3. **Work Order Type:**
   - Corrective (reactive repair)
   - Preventive (scheduled maintenance)
   - Predictive (ML-recommended)
4. **Set Priority:** Critical, High, Medium, Low
5. **Description:** What needs to be done
6. **Assign Technician:** Select from available techs
7. **Due Date:** When should it be completed
8. **Submit:** Work order sent to technician

### Investigating Anomalies (NEW - Release 2)

**Anomaly Detection Dashboard**
- Navigate to Dashboard → Anomaly Detection widget
- View detected anomalies (sorted by severity)

**Investigating an Anomaly**
1. **Click on anomaly** to view details
2. **Review key metrics:**
   - Confidence: How certain is the ML model (aim for >85%)
   - Anomaly Score: Severity (>0.75 is flagged)
   - Root Cause: AI-generated analysis
3. **Analyze time-series chart:** See normal vs anomalous patterns
4. **Determine action:**
   - HIGH severity + >90% confidence → Create work order immediately
   - MEDIUM severity → Schedule within 1 week
   - LOW severity → Monitor for pattern persistence
5. **Create Work Order:** Click "Create Work Order from Anomaly"

### Generating Compliance Reports (NEW - Release 2)

**CEA/MNRE Quarterly Reports**

1. Navigate to **Compliance → Reports**
2. Click **"New Report"**
3. **Select:**
   - Report Type: CEA or MNRE
   - Period: Q1, Q2, Q3, or Q4
   - Site: Your site
4. **Auto-populate:** System fetches data (15 seconds)
5. **Review sections:**
   - Plant information
   - Generation summary
   - Equipment performance
   - Downtime analysis
   - Compliance certifications
6. **Edit if needed:** Add manual notes/commentary
7. **Export:** PDF for CEA, Excel for MNRE
8. **Submit for approval:** Sends to manager

### Key Features

**Real-Time Monitoring**
- Live telemetry dashboard
- Equipment health scores
- Generation vs forecast
- Active alarms

**ML Insights**
- Anomaly detection
- Predictive maintenance scores
- Equipment health trends
- Energy forecasting

**Reporting**
- Compliance reports (CEA/MNRE)
- Performance summaries
- Maintenance history
- Custom reports

### FAQ

**Q: How do I assign a work order to multiple technicians?**
A: Currently single assignment only. Create separate WOs or use team-based assignment.

**Q: Should I create a work order for every anomaly?**
A: No. Use severity + confidence to prioritize. HIGH + >90% confidence requires immediate action.

**Q: How accurate is anomaly detection?**
A: 92-96% accuracy with <5% false positives. Improves over time with your data.

**Q: Can I schedule recurring preventive maintenance?**
A: Yes! Assets → Select Asset → Preventive Maintenance → Set Schedule

**Q: How do I export compliance reports?**
A: Compliance → Select Report → Export → Choose PDF or Excel

### Tips for Success

✓ Review anomaly alerts twice daily (morning, afternoon)
✓ Prioritize work orders based on impact and urgency
✓ Use ML predictions to schedule maintenance proactively
✓ Generate compliance reports early (don't wait until deadline)
✓ Monitor field technician progress regularly
✓ Provide feedback on ML predictions (helps improve accuracy)

### Support

- **Technical Support:** support@dcmms.com
- **Training Videos:** training.dcmms.com
- **User Guide:** docs.dcmms.com/supervisor
- **Phone:** 1-800-DCMMS-HELP

---

## Quick Start Guide: O&M Manager

### Getting Started

**1. Access Executive Dashboard**
- URL: https://app.dcmms.com
- Login with manager credentials
- Enable 2-factor authentication

**2. Executive Dashboard**
- **Portfolio Overview:** All sites at a glance
- **KPI Summary:** Availability, generation, costs
- **Trending Issues:** Top equipment problems
- **Predictive Insights:** ML-powered recommendations

### Core Responsibilities

**Performance Management**
- Monitor site performance vs targets
- Analyze trends and patterns
- Optimize maintenance strategies
- Reduce downtime and costs

**Strategic Planning**
- Capacity planning
- Budget forecasting
- Asset lifecycle management
- Technology roadmap

**Team Leadership**
- Oversee supervisors and technicians
- Performance reviews
- Resource allocation
- Process improvement

### Building Custom Dashboards (NEW - Release 2)

**Dashboard Builder**

1. Navigate to **Dashboards → Create New**
2. **Choose template** or start blank
3. **Add widgets** (drag-and-drop):
   - **Metrics:** OEE, Availability, Generation
   - **Charts:** Line, bar, pie, area
   - **Tables:** Top assets, work orders, costs
   - **Maps:** Geographic site view
4. **Configure each widget:**
   - Select metric/data source
   - Set time range
   - Apply filters
5. **Layout:**
   - Resize widgets (responsive grid)
   - Rearrange via drag-and-drop
6. **Save & Share:**
   - Name your dashboard
   - Share with team
   - Set as default (optional)

**Example Dashboards:**
- Executive KPI Dashboard
- Maintenance Performance Dashboard
- Compliance & Regulatory Dashboard
- ML Insights Dashboard

### Advanced Reporting (NEW - Release 2)

**Report Builder**

1. Navigate to **Reports → Report Builder**
2. **Select data sources:**
   - Assets, Work Orders, Telemetry, Costs
3. **Choose metrics:**
   - Availability, generation, costs, downtime
4. **Apply filters:**
   - Date range, sites, asset types
5. **Group & Sort:**
   - Group by: Asset, site, time period
   - Sort by: Any metric
6. **Visualization:**
   - Table, chart, or combination
7. **Generate & Export:**
   - Preview report
   - Export: PDF, Excel, CSV
8. **Schedule (optional):**
   - Daily, weekly, monthly
   - Email recipients

**Pre-built Templates:**
- Monthly Performance Report
- Asset Utilization Report
- Maintenance Cost Analysis
- Downtime Root Cause Analysis

### Using ML for Optimization (NEW - Release 2)

**Predictive Maintenance Strategy**

1. **Review Anomaly Trends:**
   - Analytics → Anomaly Trends
   - Identify recurring issues
   - Target root causes

2. **Analyze Asset Health:**
   - Assets → Health Dashboard
   - Sort by health score (lowest first)
   - Review RUL (Remaining Useful Life)

3. **Optimize Maintenance:**
   - Shift from reactive to predictive
   - Schedule maintenance during low generation
   - Prioritize high-impact assets

4. **Measure ROI:**
   - Track downtime reduction
   - Calculate cost avoidance
   - Monitor performance improvement

**Energy Forecasting**

- **Access:** Analytics → Energy Forecast
- **7-day forecast:** Plan operations and maintenance
- **Accuracy:** 96.8% (historical performance)
- **Use cases:**
   - Grid scheduling
   - Maintenance window planning
   - Impact analysis (what-if scenarios)

### Key Metrics to Track

**Operational KPIs:**
- Plant Availability (%)
- Capacity Utilization Factor (CUF %)
- Performance Ratio (PR %)
- Overall Equipment Effectiveness (OEE %)

**Maintenance KPIs:**
- Mean Time Between Failures (MTBF)
- Mean Time To Repair (MTTR)
- Preventive vs Corrective ratio
- Maintenance cost per MW

**Financial KPIs:**
- Generation vs forecast (MWh)
- Revenue vs target ($)
- O&M cost per MWh ($)
- Downtime cost ($)

### FAQ

**Q: Can I view data across multiple sites?**
A: Yes! Use site filters in dashboards and reports, or select "All Sites"

**Q: How do I export data for external analysis?**
A: Reports → Select report → Export → CSV (opens in Excel)

**Q: Can I integrate dCMMS with our ERP system?**
A: Yes! We have APIs and pre-built connectors. Contact support@dcmms.com

**Q: How often should I review ML predictions?**
A: Weekly review of anomaly trends, monthly review of asset health scores

**Q: Can I customize the ML model for my equipment?**
A: Enterprise customers can work with our ML team for custom models

### Tips for Success

✓ Create role-specific dashboards for your team
✓ Schedule automated weekly reports (save time)
✓ Use ML insights to plan maintenance proactively
✓ Track cost savings from predictive maintenance
✓ Review compliance reports before submission
✓ Leverage forecasting for strategic planning

### Support

- **Technical Support:** support@dcmms.com
- **Customer Success Manager:** [Your CSM]
- **Training:** training.dcmms.com
- **Documentation:** docs.dcmms.com/manager
- **Phone:** 1-800-DCMMS-HELP

---

## Quick Start Guide: System Administrator

### Getting Started

**1. Administrator Access**
- URL: https://app.dcmms.com/admin
- Login with admin credentials
- 2-factor authentication required

**2. Admin Dashboard**
- **System Health:** Service status, uptime
- **User Management:** Users, roles, permissions
- **Monitoring:** Metrics, logs, alerts
- **Configuration:** Settings, integrations

### Core Responsibilities

**User & Access Management**
- Provision new users
- Manage roles and permissions
- Configure SSO/SAML
- Monitor access logs

**System Operations**
- Monitor system health
- Respond to alerts
- Perform backups
- Execute disaster recovery

**Security**
- Vulnerability scanning
- Patching and updates
- Incident response
- Compliance (SOC 2, GDPR)

### User Management

**Creating Users**

1. Navigate to **Admin → Users → Add User**
2. **Enter details:**
   - Name, email, phone
   - Role: Admin, Manager, Supervisor, Field Tech, Compliance
   - Sites: Assign site access
3. **Set password:** Auto-generate or manual
4. **Enable MFA:** Required for Admin/Manager roles
5. **Send invitation:** User receives email with login link

**Managing Roles**

**Role Hierarchy:**
- **Admin:** Full system access
- **O&M Manager:** All sites, analytics, reporting
- **Supervisor:** Assigned sites, work orders, compliance
- **Field Technician:** Mobile app, assigned work orders
- **Compliance Officer:** Compliance module only

**Permissions Matrix:**
| Permission | Admin | Manager | Supervisor | Tech | Compliance |
|------------|-------|---------|------------|------|------------|
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create work orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign work orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ⚠️ Limited | ❌ | ❌ |
| Generate reports | ✅ | ✅ | ✅ | ❌ | ✅ |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |
| System config | ✅ | ❌ | ❌ | ❌ | ❌ |

### Monitoring & Alerts

**CloudWatch Dashboards**
- URL: AWS CloudWatch Console
- **Key metrics:**
  - API latency (p95, p99)
  - Error rate (%)
  - Database CPU/connections
  - ECS task health

**Grafana Dashboards**
- URL: https://monitoring.dcmms.com
- Login: SSO via admin credentials
- **Dashboards:**
  - Application Performance
  - Database Performance
  - Telemetry Pipeline
  - ML Service Health

**Alert Configuration**

1. Navigate to **Admin → Monitoring → Alerts**
2. **Create alert:**
   - Metric: Select from dropdown
   - Threshold: Set warning/critical levels
   - Duration: How long before triggering
   - Notification: Email, SMS, PagerDuty
3. **Test alert:** Send test notification
4. **Save:** Alert activated

**Critical Alerts:**
- API error rate >5% (5 min)
- Database CPU >90% (5 min)
- ECS service unhealthy (2 min)
- Disk usage >85% (15 min)

### Backup & Recovery

**Automated Backups**
- **Database:** Daily at 3:00 AM UTC (7-day retention)
- **Files:** Daily to S3 (30-day retention)
- **Configuration:** Version controlled in Git

**Manual Backup**

```bash
# Database backup
npm run backup:create

# Verify backup
npm run backup:verify --backup-id <id>
```

**Restore Procedure**

```bash
# List available backups
npm run backup:list

# Restore from backup
npm run backup:restore --backup-id <id>

# Verify restoration
npm run health-check
```

**RTO/RPO:**
- Recovery Time Objective: 2 hours
- Recovery Point Objective: 24 hours

### Security Operations

**Vulnerability Scanning**

**Schedule:**
- Daily: Dependency scan (Snyk)
- Weekly: Container scan (Trivy)
- Weekly: Web app scan (OWASP ZAP)

**Running Scans:**

```bash
# Dependency scan
npm run security:scan

# Container scan
docker run aquasec/trivy image dcmms-backend:latest

# Web app scan (via admin panel)
Admin → Security → Run Web Scan
```

**Patching Procedures**

**SLA by Severity:**
- Critical (CVSS 9.0-10.0): 24 hours
- High (CVSS 7.0-8.9): 7 days
- Medium (CVSS 4.0-6.9): 30 days
- Low (CVSS 0.1-3.9): 90 days

**Patch Process:**
1. Review vulnerability report
2. Test patch in dev/staging
3. Schedule maintenance window
4. Apply patch to production
5. Verify fix
6. Document in change log

### Troubleshooting

**Common Issues**

**Issue: API Slow Response**
1. Check CloudWatch → API latency metric
2. Check database CPU/connections
3. Check Redis cache hit rate
4. Review slow query log
5. Scale ECS tasks if needed

**Issue: Database Connection Errors**
1. Check RDS instance status
2. Verify connection pool settings
3. Check security group rules
4. Review database logs
5. Restart application if needed

**Issue: Login Failures**
1. Check authentication service logs
2. Verify user exists and is active
3. Check MFA configuration
4. Test with different user
5. Reset password if needed

### FAQ

**Q: How do I reset a user's password?**
A: Admin → Users → Select User → Reset Password → Send email

**Q: How do I enable SSO?**
A: Admin → Settings → Authentication → Configure SAML/OAuth

**Q: Where are the system logs?**
A: CloudWatch Logs or Admin → Monitoring → Logs

**Q: How do I scale the system for more users?**
A: Admin → Configuration → Scaling → Adjust ECS task count

**Q: How often should I run security scans?**
A: Automated daily/weekly. Manual scans before major releases.

### Tips for Success

✓ Monitor CloudWatch daily for anomalies
✓ Test backups monthly (don't just create them!)
✓ Keep documentation updated
✓ Automate repetitive tasks
✓ Maintain change log for all modifications
✓ Regular security scans and patching

### Support

- **DevOps On-Call:** devops-oncall@dcmms.com
- **Security Team:** security@dcmms.com
- **Technical Docs:** docs.dcmms.com/admin
- **Emergency:** 1-800-DCMMS-HELP

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
