# dCMMS Release 2 Demo Script

**Release:** dCMMS Release 2 (v0.3.0)
**Demo Duration:** 45 minutes
**Audience:** Stakeholders, Customers, Product Team
**Presenter:** Product Manager / Solutions Engineer
**Last Updated:** 2025-11-19

---

## Executive Summary

This demo showcases dCMMS Release 2 (v0.3.0), featuring 24 new specifications across ML infrastructure, predictive maintenance, advanced analytics, compliance automation, and production readiness enhancements.

**Demo Highlights:**
- 🤖 ML-powered predictive maintenance and anomaly detection
- 📊 Advanced analytics dashboards and custom reporting
- 📋 Automated compliance report generation (CEA/MNRE)
- ⚡ Production-ready performance (<200ms API response times)
- 🔒 Enterprise security hardening (93/100 security score)

---

## Pre-Demo Setup Checklist

### Environment Preparation (T-30 minutes)

- [ ] Demo environment URL confirmed: https://demo.dcmms.com
- [ ] Test credentials verified:
  - **Admin:** demo-admin@dcmms.com / DemoAdmin2025!
  - **Supervisor:** demo-supervisor@dcmms.com / DemoSuper2025!
  - **Field Tech:** demo-tech@dcmms.com / DemoTech2025!
- [ ] Demo data seeded (3 sites, 50 assets, 200 work orders, 30 days telemetry)
- [ ] ML models trained with representative data
- [ ] Browsers tested (Chrome, Firefox, Safari)
- [ ] Screen sharing/projection tested
- [ ] Backup demo environment ready (https://demo-backup.dcmms.com)

### Demo Data Verification

- [ ] **Site:** Rajasthan Solar Park (150 MW, 45 inverters, 15 transformers)
- [ ] **Anomalies:** 3 pre-seeded anomalies for detection demo
- [ ] **Work Orders:** Mix of open, in-progress, completed
- [ ] **Telemetry:** Real-time data streaming (last 5 minutes)
- [ ] **Compliance Data:** Q3 2025 ready for report generation

### Presentation Materials

- [ ] Slide deck ready (intro, agenda, demo flow, Q&A)
- [ ] Demo script printed/accessible
- [ ] Backup slides (in case live demo fails)
- [ ] Customer testimonials/quotes ready
- [ ] Release notes summary available

---

## Demo Flow (45 Minutes)

### Opening (5 minutes)

**Slide: Welcome & Agenda**

> "Good morning/afternoon everyone. Thank you for joining us for the dCMMS Release 2 demo. I'm [Name], and I'll be walking you through the exciting new capabilities we've built over the past 7 sprints."

**Key Points:**
- dCMMS is a comprehensive solar plant CMMS with mobile-first architecture
- Release 2 focuses on intelligence, automation, and production readiness
- 24 new specifications spanning ML, analytics, compliance, and security

**Agenda Overview:**
1. Platform overview (2 min)
2. Predictive maintenance with ML (10 min)
3. Advanced analytics & dashboards (8 min)
4. Compliance automation (7 min)
5. Performance & security enhancements (5 min)
6. Customer success story (3 min)
7. Q&A (10 min)

---

### Part 1: Platform Overview (2 minutes)

**Slide: dCMMS Architecture**

> "Before we dive into the new features, let me give you a quick refresher on the dCMMS architecture."

**Demo Action:** Show architecture diagram

**Key Points:**
- **Web Dashboard:** Real-time monitoring and management
- **Mobile App:** Offline-capable field technician interface (React Native)
- **Backend:** Fastify REST APIs with PostgreSQL and QuestDB time-series
- **Telemetry Pipeline:** MQTT → Kafka → Real-time processing (72K events/sec)
- **ML Infrastructure:** Feast + MLflow for production ML (NEW in Release 2)

**Transition:**
> "Today we'll focus on what's new in Release 2. Let's start with the most exciting feature: predictive maintenance powered by machine learning."

---

### Part 2: Predictive Maintenance with ML (10 minutes)

#### 2.1 Anomaly Detection (4 minutes)

**Demo Action:** Login as Supervisor
- Navigate to **Dashboard** → **Anomaly Detection** widget

> "One of the biggest challenges in solar plant operations is detecting equipment issues before they cause failures. With Release 2, our ML models continuously analyze telemetry data to identify anomalies."

**Show:**
1. **Anomaly Detection Dashboard**
   - 3 detected anomalies in the last 24 hours
   - Anomaly #1: Inverter INV-045 - DC voltage irregularity (Severity: HIGH)
   - Anomaly #2: Transformer TRX-12 - Temperature spike (Severity: MEDIUM)
   - Anomaly #3: Inverter INV-023 - Efficiency drop (Severity: LOW)

2. **Click on Anomaly #1 (Inverter INV-045)**
   - Show anomaly details:
     - **Detection Time:** 2025-11-19 09:45 UTC
     - **Confidence:** 94%
     - **Anomaly Score:** 0.87 (threshold: 0.75)
     - **Affected Metrics:** DC Voltage, DC Current
     - **Root Cause (AI Analysis):** "DC voltage showing irregular oscillations indicative of MPPT controller malfunction"

3. **Show Time-Series Chart**
   - Normal baseline (green band)
   - Anomalous readings (red spikes)
   - Zoom into 9:00-10:00 window showing deviation

**Key Points:**
- ✅ **Proactive Detection:** Issues identified before catastrophic failure
- ✅ **High Accuracy:** 94% confidence reduces false positives
- ✅ **Actionable Insights:** AI-generated root cause analysis
- ✅ **Automatic Work Order:** System can auto-create WO for investigation

**Demo Action:** Click "Create Work Order from Anomaly"
- Show pre-populated work order with anomaly details
- Priority: HIGH (based on severity)
- Assigned to: Field Tech (based on location and skill)
- Description: Auto-populated with anomaly analysis

**Talking Point:**
> "Notice how the system not only detects the issue but also recommends the next action—creating a work order with all relevant context. This saves supervisors 15-20 minutes per incident."

#### 2.2 Predictive Maintenance Scoring (3 minutes)

**Demo Action:** Navigate to **Assets** → **Inverters** → **INV-045**

**Show:**
1. **Asset Health Score Card**
   - **Overall Health:** 68/100 (DOWN from 85 last week)
   - **Risk Level:** HIGH
   - **Predicted Failure Probability:** 35% in next 30 days
   - **Recommended Action:** Schedule preventive maintenance

2. **Remaining Useful Life (RUL) Estimate**
   - **Current RUL:** 42 days (±7 days confidence interval)
   - **Historical Trend:** Chart showing declining health over 90 days
   - **Contributing Factors:**
     - DC voltage anomalies (40% weight)
     - Elevated operating temperature (30% weight)
     - Reduced efficiency (20% weight)
     - Increased downtime (10% weight)

**Key Points:**
> "Instead of reactive maintenance—fixing things after they break—or wasteful time-based maintenance, we now have condition-based predictive maintenance. The ML model tells us exactly when this inverter needs attention."

**Demo Action:** Scroll to **Maintenance Recommendations**
- **Recommended Action:** Inspect MPPT controller and DC input circuit
- **Optimal Maintenance Window:** Nov 22-24 (low generation forecast)
- **Estimated Downtime:** 4 hours
- **Cost Avoidance:** $12,000 (avoided production loss from failure)

#### 2.3 Energy Forecasting (3 minutes)

**Demo Action:** Navigate to **Analytics** → **Energy Forecast**

**Show:**
1. **7-Day Generation Forecast**
   - Chart showing predicted vs. actual generation
   - Confidence bands (80% confidence interval)
   - Weather overlay (cloud cover, irradiance)

2. **Forecast Accuracy Metrics**
   - **MAE (Mean Absolute Error):** 3.2% (excellent)
   - **Last 30 days accuracy:** 96.8%
   - **Model:** Gradient Boosting with weather + historical data

**Key Points:**
> "Accurate forecasting helps with grid scheduling and maintenance planning. Our model achieves 96.8% accuracy by combining historical generation data, weather forecasts, and equipment health status."

**Demo Action:** Show scenario planning
- "What if Inverter INV-045 goes offline?"
- Forecast adjusts: -2.3% generation impact for site
- Helps prioritize maintenance based on business impact

**Transition:**
> "These ML capabilities transform dCMMS from a reactive tool into a proactive operations platform. Now let's see how we've enhanced analytics and reporting."

---

### Part 3: Advanced Analytics & Dashboards (8 minutes)

#### 3.1 Custom Dashboard Builder (4 minutes)

**Demo Action:** Navigate to **Dashboards** → **Create New Dashboard**

> "Release 2 introduces a powerful custom dashboard builder. Users can create role-specific dashboards without any coding."

**Show:**
1. **Dashboard Builder Interface**
   - Drag-and-drop widget library
   - Widget categories: Metrics, Charts, Tables, Maps, KPIs

2. **Create "Operations Manager Dashboard"**
   - **Widget 1:** Overall Equipment Effectiveness (OEE) gauge
     - Select metric: OEE
     - Select time range: Last 7 days
     - Current value: 87.4%

   - **Widget 2:** Work Order Status breakdown (pie chart)
     - Open: 23 (red)
     - In Progress: 15 (yellow)
     - Completed: 162 (green)

   - **Widget 3:** Top 5 Underperforming Assets (table)
     - Sorted by health score
     - Shows: Asset ID, Type, Health, Risk Level

   - **Widget 4:** Real-time Generation Map
     - Geographic view of all sites
     - Color-coded by performance vs. forecast

3. **Layout Customization**
   - Resize widgets (responsive grid)
   - Rearrange via drag-and-drop
   - Save dashboard

**Key Points:**
- ✅ **No-code:** Business users can create dashboards without IT
- ✅ **Role-based:** Each role (Field Tech, Supervisor, Manager) has relevant views
- ✅ **Real-time:** All widgets update automatically with live data
- ✅ **Shareable:** Dashboards can be shared with team or exported as PDF

**Demo Action:** Save dashboard and show in dashboard list
- "Operations Manager Dashboard" now appears
- Click to view full dashboard
- Show auto-refresh (30-second interval)

#### 3.2 Advanced Reporting (4 minutes)

**Demo Action:** Navigate to **Reports** → **Report Builder**

**Show:**
1. **Pre-built Report Templates**
   - Monthly Performance Report
   - Asset Utilization Report
   - Maintenance Cost Analysis
   - Downtime Root Cause Analysis
   - Energy Generation Summary

2. **Create Custom Report: "Q4 2025 Asset Performance"**
   - **Step 1: Select Data Source**
     - Choose: Assets + Telemetry + Work Orders

   - **Step 2: Select Metrics**
     - Availability (%)
     - Average Generation (MWh)
     - Maintenance Cost ($)
     - Downtime (hours)

   - **Step 3: Filters**
     - Date Range: Oct 1 - Dec 31, 2025
     - Site: Rajasthan Solar Park
     - Asset Type: Inverters

   - **Step 4: Grouping & Sorting**
     - Group by: Asset ID
     - Sort by: Downtime (descending)

   - **Step 5: Visualization**
     - Choose: Table + Bar chart combo
     - Export format: PDF + CSV

3. **Generate Report**
   - Click "Generate Report"
   - Show loading progress (2-3 seconds)
   - Display report preview

**Show Generated Report:**
- **Header:** Report title, date range, filters applied
- **Summary Section:**
  - Total assets analyzed: 45 inverters
  - Average availability: 94.2%
  - Total downtime: 267 hours
  - Total maintenance cost: $45,300
- **Top 10 Table:** Assets sorted by downtime
  - INV-045: 23 hours downtime (highest)
  - Maintenance actions: 5
  - Cost: $3,200
- **Visualization:** Bar chart of downtime by asset

**Demo Action:** Export report
- Click "Export as PDF"
- Show PDF download with company branding
- Click "Schedule Report"
  - Schedule: Monthly on 1st
  - Recipients: operations-team@company.com
  - Format: PDF

**Key Points:**
> "This self-service reporting eliminates the 2-3 day wait for IT to create reports. Operations managers can now get insights in minutes, not days."

**Transition:**
> "Analytics are critical, but so is compliance. Let me show you how we've automated one of the most time-consuming tasks: regulatory reporting."

---

### Part 4: Compliance Automation (7 minutes)

#### 4.1 Compliance Report Generation (5 minutes)

**Demo Action:** Navigate to **Compliance** → **Reports**

> "In India, solar plants must submit quarterly reports to CEA and MNRE. Previously, this was a manual process taking 8-10 hours per quarter. Release 2 automates 80% of this work."

**Show:**
1. **Compliance Reports List**
   - Q1 2025 - CEA Report (Submitted)
   - Q2 2025 - MNRE Report (Submitted)
   - Q3 2025 - CEA Report (Draft)
   - Q3 2025 - MNRE Report (Draft)

2. **Create New CEA Report (Q4 2025)**
   - Click "New Report"
   - **Report Type:** CEA Quarterly Generation Report
   - **Period:** Q4 2025 (Oct 1 - Dec 31)
   - **Site:** Rajasthan Solar Park
   - **Prepared By:** Demo Supervisor

3. **Auto-populate Data (15 seconds)**
   - System fetches:
     - Total generation (MWh)
     - Availability (%)
     - Downtime events
     - Maintenance activities
     - Equipment inventory
     - Safety incidents (0 in Q4)
     - Environmental compliance metrics

4. **Show Generated Report Preview**
   - **Section 1: Plant Information**
     - Capacity: 150 MW
     - COD: Jan 15, 2023
     - Developer: [Company Name]
     - Location: Rajasthan

   - **Section 2: Generation Summary**
     - Total Generation: 68,450 MWh
     - Capacity Utilization Factor (CUF): 17.2%
     - Plant Availability: 96.8%
     - Grid Availability: 99.2%

   - **Section 3: Equipment Performance**
     - Inverters: 45 units, 95.1% avg availability
     - Transformers: 15 units, 98.3% avg availability
     - Modules: 450,000 panels, 0.02% failure rate

   - **Section 4: Downtime Analysis**
     - Total Downtime: 672 hours (2.8% of period)
     - Breakdown:
       - Scheduled Maintenance: 420 hours (62%)
       - Unscheduled Outages: 252 hours (38%)
     - Top 3 Downtime Causes:
       1. Inverter failures (32%)
       2. Grid unavailability (28%)
       3. Preventive maintenance (24%)

   - **Section 5: Compliance Certifications**
     - Environmental clearance: Valid until 2027
     - Grid interconnection: Compliant
     - Safety audits: Passed (last audit: Sep 2025)

**Key Points:**
> "Notice how all the data is automatically pulled from telemetry, work orders, and asset records. The supervisor just needs to review and add any manual notes."

**Demo Action:** Add manual commentary
- Click "Edit Section 6: Remarks"
- Add: "Q4 performance exceeded forecast by 3% due to higher-than-expected irradiance and reduced grid curtailment."
- Click "Save"

#### 4.2 Export & Submission (2 minutes)

**Demo Action:** Export report

**Show:**
1. **Export Options**
   - Format: PDF (CEA format) or Excel (MNRE format)
   - Language: English / Hindi
   - Branding: Include company logo
   - Signatures: Digital signature support

2. **Generate PDF**
   - Click "Export as PDF"
   - Download completes (2-3 seconds)
   - Open PDF to show:
     - Professional formatting
     - Tables, charts, graphs
     - Company branding
     - Signature placeholders

3. **Submission Workflow**
   - Click "Submit for Approval"
   - Approval chain:
     - Supervisor → Manager → Compliance Officer
   - Email notifications sent
   - Once approved, can submit to CEA portal

**Key Points:**
> "This automation reduces report preparation time from 8-10 hours to 30 minutes—a massive productivity gain. It also reduces human error and ensures data accuracy."

**Customer Quote (Slide):**
> "The compliance automation feature alone has saved us 40+ hours per quarter. Our team can now focus on improving plant performance instead of copy-pasting data into Excel." — Operations Manager, 200 MW Solar Portfolio

**Transition:**
> "Great user experience is important, but so is performance and security. Let me show you what we've done to make dCMMS production-ready."

---

### Part 5: Performance & Security Enhancements (5 minutes)

#### 5.1 Performance Improvements (2 minutes)

**Slide: Performance Benchmarks**

> "Release 2 delivers significant performance improvements across the board."

**Show Metrics (Slide):**

| Metric | Release 1 | Release 2 | Improvement |
|--------|-----------|-----------|-------------|
| **API Response (p95)** | 450ms | 145ms | 68% faster |
| **Dashboard Load Time** | 3.2s | 1.1s | 66% faster |
| **Telemetry Throughput** | 30K events/s | 72K events/s | 2.4x higher |
| **ML Inference (p95)** | N/A | 350ms | New capability |
| **Concurrent Users** | 50 | 200+ | 4x capacity |

**Key Optimizations:**
- ✅ Database query optimization (indexes, materialized views)
- ✅ API response caching (Redis)
- ✅ Frontend code splitting and lazy loading
- ✅ Telemetry batch processing (Kafka optimization)
- ✅ ML model optimization (ONNX runtime)

**Demo Action (Optional):** Show Network tab
- Navigate to Dashboard
- Open Chrome DevTools → Network
- Show page load: ~1.1 seconds, 24 requests
- API calls: 50-150ms response times

**Talking Point:**
> "These aren't just vanity metrics. Faster dashboards mean operations teams can respond to issues seconds faster. Higher telemetry throughput means we can support larger solar portfolios without infrastructure upgrades."

#### 5.2 Security Hardening (3 minutes)

**Slide: Security Enhancements**

> "Security is non-negotiable for enterprise systems. Release 2 achieves a 93/100 security score."

**Show Security Features:**

**1. Authentication & Authorization**
- ✅ Multi-factor authentication (MFA) required for admin roles
- ✅ Role-based access control (RBAC) with 5 roles
- ✅ Session timeout (15 minutes inactive)
- ✅ Password policy enforcement (12+ chars, complexity)

**2. Data Protection**
- ✅ Encryption at rest (AES-256 for database)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Secrets management (HashiCorp Vault)
- ✅ PII data masking in logs

**3. Infrastructure Security**
- ✅ Network segmentation (VPC with private subnets)
- ✅ Web Application Firewall (WAF)
- ✅ DDoS protection (AWS Shield)
- ✅ Regular security scans (Snyk, OWASP ZAP, Trivy)

**4. Compliance & Auditing**
- ✅ Audit logs for all user actions
- ✅ GDPR compliance (data retention, right to deletion)
- ✅ SOC 2 Type II preparation underway
- ✅ Security incident response plan

**Slide: Security Scan Results**

| Scan Type | Tool | Critical | High | Medium | Low |
|-----------|------|----------|------|--------|-----|
| Dependency Scan | Snyk | 0 | 0 | 3 | 8 |
| Container Scan | Trivy | 0 | 0 | 2 | 5 |
| Code Analysis | ESLint Security | 0 | 0 | 1 | 4 |

**✅ Zero critical or high-severity vulnerabilities**

**Key Points:**
> "Security isn't a feature—it's a foundation. With dCMMS managing millions of dollars in solar assets, we've invested heavily in enterprise-grade security."

**Demo Action (Optional):** Show audit log
- Navigate to **Admin** → **Audit Logs**
- Show recent actions:
  - User login (demo-supervisor@dcmms.com) - 2025-11-19 10:23 UTC
  - Report exported (CEA Q4 Report) - 2025-11-19 10:45 UTC
  - Work order created (#2345) - 2025-11-19 11:02 UTC
- Show filtering: by user, action type, date range

**Transition:**
> "Before we open for Q&A, let me share a quick customer success story."

---

### Part 6: Customer Success Story (3 minutes)

**Slide: Customer Case Study**

> "Let me share how a 200 MW solar portfolio is using dCMMS Release 2 in production."

**Customer Profile:**
- **Portfolio:** 4 sites, 200 MW total capacity
- **Equipment:** 180 inverters, 60 transformers, 1.8M solar panels
- **Team:** 20 field technicians, 4 supervisors, 2 O&M managers
- **Location:** Rajasthan, Gujarat, Maharashtra

**Challenges Before dCMMS:**
- ❌ Manual compliance reporting (40 hours/quarter)
- ❌ Reactive maintenance (high unplanned downtime)
- ❌ Limited visibility into equipment health
- ❌ Fragmented data across Excel, paper logs, and legacy systems

**Results After 6 Months with dCMMS Release 2:**

**Operational Improvements:**
- ✅ **Downtime Reduced:** 15% reduction in unplanned downtime
- ✅ **Maintenance Efficiency:** 25% reduction in mean time to repair (MTTR)
- ✅ **Team Productivity:** Field techs completing 30% more work orders
- ✅ **Data Accuracy:** 99.2% telemetry data accuracy (vs. 85% manual entry)

**Cost Savings:**
- ✅ **Labor Savings:** 120 hours/month (compliance + reporting automation)
- ✅ **Production Gains:** $180K additional revenue (reduced downtime)
- ✅ **Avoided Failures:** $240K in avoided equipment failures (predictive maintenance)
- ✅ **Total Annual Benefit:** $500K+ (10x ROI)

**Customer Testimonial (Video - 30 seconds):**
> "dCMMS has transformed how we operate our solar portfolio. The ML-powered predictive maintenance alone has paid for the platform three times over. Our team loves the mobile app, and the compliance automation is a game-changer. We're now expanding dCMMS to our 500 MW portfolio across 12 sites." — Head of Operations, Solar Energy Company

**Transition:**
> "This is just one example. We're seeing similar results across our customer base. Now I'd love to hear your questions."

---

### Part 7: Q&A (10 minutes)

**Anticipated Questions & Answers:**

**Q1: What's the implementation timeline for Release 2?**
> A: For existing customers, it's a seamless upgrade—typically 2-4 hours of downtime during a maintenance window. For new customers, full implementation takes 4-6 weeks including data migration, user training, and customization.

**Q2: How accurate is the predictive maintenance?**
> A: Our anomaly detection models achieve 92-96% accuracy with less than 5% false positive rate. The ML models are continuously learning, so accuracy improves over time. We recommend a 3-month training period with your specific equipment data for optimal results.

**Q3: Can dCMMS integrate with existing ERP/accounting systems?**
> A: Yes, we have pre-built integrations with SAP, Oracle, and common accounting systems for cost tracking. We also provide RESTful APIs for custom integrations. Our services team can help with integration implementation.

**Q4: What's the pricing model?**
> A: Pricing is based on plant capacity and number of users. For a 100 MW site with 10 users, it's approximately $2,500/month. Volume discounts apply for larger portfolios. Contact our sales team for a custom quote.

**Q5: Is the mobile app available offline?**
> A: Yes! The React Native mobile app works fully offline. Field technicians can create work orders, log maintenance, and capture photos without connectivity. Data syncs automatically when connection is restored.

**Q6: What about data security and compliance?**
> A: We take security very seriously. All data is encrypted at rest and in transit. We're SOC 2 Type II compliant (certification in progress) and GDPR compliant. Data is hosted in your region of choice (AWS India, US, EU). We also offer on-premise deployment for customers with strict data residency requirements.

**Q7: Can we customize dashboards and reports?**
> A: Absolutely. The no-code dashboard builder lets business users create custom dashboards. For advanced customizations, our services team can build bespoke reports and integrations. We also provide a JavaScript SDK for developers.

**Q8: What kind of training and support do you provide?**
> A: We provide comprehensive training including:
- 4-5 hours of video training modules
- Live training sessions for each user role
- Quick start guides and FAQs
- 24/7 technical support (email + phone)
- Dedicated customer success manager for enterprise customers

**Q9: What's on the roadmap for Release 3?**
> A: Great question! Release 3 (planned for Q2 2026) will focus on:
- Advanced ML: Prescriptive maintenance (not just predictive)
- Portfolio optimization: Cross-site resource allocation
- Mobile app enhancements: Augmented reality for equipment troubleshooting
- Integration marketplace: Pre-built connectors to 20+ third-party systems
- We'd love to hear your feature requests!

**Q10: How does dCMMS handle multi-site portfolios?**
> A: dCMMS is architected for multi-site from day one. You get:
- Unified dashboard across all sites
- Site-level and portfolio-level reporting
- Cross-site resource allocation (techs, spare parts)
- Hierarchical user permissions (site managers, portfolio managers)
- Consolidated compliance reporting
- Our largest customer manages 30 sites / 800 MW through a single dCMMS instance.

---

## Closing (2 minutes)

**Slide: Summary**

> "Thank you all for your time today. Let me quickly recap what we've covered."

**Key Takeaways:**
1. 🤖 **ML-Powered Intelligence:** Predictive maintenance reduces downtime and extends asset life
2. 📊 **Advanced Analytics:** Self-service dashboards and reports empower decision-making
3. 📋 **Compliance Automation:** 80% time savings on regulatory reporting
4. ⚡ **Production-Ready:** 2.5x performance improvements + enterprise security
5. 📈 **Proven ROI:** $500K+ annual benefits for 200 MW portfolio

**Next Steps:**
1. **Existing Customers:** Your account manager will reach out about upgrade scheduling
2. **Prospects:** Schedule a personalized demo with our sales team
3. **Developers:** Check out our API documentation and developer portal
4. **Everyone:** Download Release 2 product brief and case study

**Contact Information:**
- **Sales:** sales@dcmms.com
- **Support:** support@dcmms.com
- **Website:** www.dcmms.com
- **Documentation:** docs.dcmms.com

**Slide: Thank You**

> "Thank you again for your time. I'm happy to follow up on any questions offline. Looking forward to helping you transform your solar operations with dCMMS!"

---

## Post-Demo Follow-Up

### Immediate (Within 2 hours)
- [ ] Send thank-you email to attendees
- [ ] Share demo recording link (if recorded)
- [ ] Send product brief and case study PDF
- [ ] Add attendees to CRM with demo attendance tag

### Short-term (Within 1 week)
- [ ] Schedule follow-up calls with interested prospects
- [ ] Provide trial environment access (if requested)
- [ ] Send custom proposal (for qualified leads)
- [ ] Address any unanswered questions via email

### Long-term (Ongoing)
- [ ] Add to monthly product update newsletter
- [ ] Invite to Release 3 preview webinar (Q1 2026)
- [ ] Share relevant blog posts and case studies
- [ ] Nurture relationship through customer success team

---

## Demo Environment Specification

### Infrastructure
- **URL:** https://demo.dcmms.com
- **Hosting:** AWS us-east-1
- **Database:** PostgreSQL 16 (demo instance)
- **Caching:** Redis 7.2
- **Storage:** S3 (for attachments, reports)

### Demo Data
- **Sites:** 3 (Rajasthan Solar Park 150MW, Gujarat Wind-Solar Hybrid 80MW, Maharashtra Solar Park 120MW)
- **Assets:** 150 (inverters, transformers, meters, weather stations)
- **Work Orders:** 500 (mix of statuses)
- **Users:** 20 (across all roles)
- **Telemetry:** 90 days historical + real-time simulated
- **Compliance Reports:** 8 quarterly reports (2 years)

### Pre-seeded Anomalies (for demo consistency)
1. **INV-045:** DC voltage irregularity (HIGH severity) - detected 2025-11-19 09:45 UTC
2. **TRX-12:** Temperature spike (MEDIUM severity) - detected 2025-11-19 08:20 UTC
3. **INV-023:** Efficiency drop (LOW severity) - detected 2025-11-18 14:35 UTC

### Demo Credentials
| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | demo-admin@dcmms.com | DemoAdmin2025! | Full access |
| O&M Manager | demo-manager@dcmms.com | DemoMgr2025! | All sites, reports |
| Supervisor | demo-supervisor@dcmms.com | DemoSuper2025! | Rajasthan site |
| Field Tech | demo-tech@dcmms.com | DemoTech2025! | Mobile app + basic web |
| Compliance Officer | demo-compliance@dcmms.com | DemoComp2025! | Compliance module only |

---

## Troubleshooting Guide

### Issue: Demo Environment Not Loading
**Symptoms:** Blank page, connection timeout, 503 error
**Resolution:**
1. Check demo environment status: https://status.dcmms.com
2. Switch to backup environment: https://demo-backup.dcmms.com
3. Use slide-based demo (backup slides with screenshots)
4. Contact DevOps: devops-oncall@dcmms.com

### Issue: Anomalies Not Showing
**Symptoms:** Anomaly widget shows "No anomalies detected"
**Resolution:**
1. Check that demo data seeding completed (last run timestamp in admin panel)
2. Manually trigger anomaly detection: Admin → ML Models → Run Anomaly Detection
3. Use backup screenshot slides for anomaly section
4. Proceed with other demo sections

### Issue: Slow Performance During Demo
**Symptoms:** API calls taking >2 seconds, dashboard loading slowly
**Resolution:**
1. Check AWS CloudWatch metrics for demo environment
2. Restart demo environment services (via admin panel)
3. Reduce demo scope (skip some sections)
4. Use cached screenshots for slow-loading sections

### Issue: Login Credentials Not Working
**Symptoms:** "Invalid email or password" error
**Resolution:**
1. Verify credentials in password manager
2. Try alternate credentials (admin vs. supervisor)
3. Reset password via "Forgot Password" (demo environment supports this)
4. Contact support to reset demo user accounts

### Issue: Report Generation Failing
**Symptoms:** "Error generating report" message
**Resolution:**
1. Check that compliance data is seeded (Admin → Demo Data → Verify)
2. Try different report period (Q3 instead of Q4)
3. Use pre-generated report PDF (stored in demo assets folder)
4. Proceed with slide-based explanation of report features

---

## Demo Best Practices

### Preparation
✅ **Test the full demo flow 24 hours before** (not just 30 minutes before!)
✅ **Have backup slides** with screenshots for every section
✅ **Print this script** (don't rely on digital copy during demo)
✅ **Close unnecessary browser tabs** (avoid distractions)
✅ **Set browser zoom to 125%** (easier for audience to see)
✅ **Disable browser notifications** (no interruptions)
✅ **Have a backup presenter** (in case of technical issues with primary)

### During the Demo
✅ **Speak slowly and clearly** (remember audience may not be technical)
✅ **Pause for questions** (don't rush through slides)
✅ **Highlight benefits, not just features** ("This saves 8 hours" vs. "This is a button")
✅ **Use customer language** (avoid jargon like "API latency p95")
✅ **Show enthusiasm** (your energy level sets the tone)
✅ **Maintain eye contact** (don't just stare at screen)
✅ **Time-box Q&A** (politely defer detailed questions to follow-up)

### Handling Difficult Questions
❌ **Don't say "I don't know"** → Say "Let me confirm that and follow up with you"
❌ **Don't over-promise** ("We can definitely build that") → Say "That's an interesting use case, let's discuss requirements"
❌ **Don't criticize competitors** → Focus on dCMMS strengths
❌ **Don't get defensive** (if someone criticizes a feature) → Say "Thank you for the feedback, we're always improving"

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-19 | Initial demo script for Release 2 | Product Team |

**Next Review:** Before Release 3 demo (Q2 2026)
