# dCMMS Frequently Asked Questions (FAQ)

**Version:** 1.0 (Release 2 - v0.3.0)
**Last Updated:** 2025-11-19
**Total Questions:** 90

---

## Table of Contents

1. [General](#general) (10 questions)
2. [Work Orders](#work-orders) (12 questions)
3. [Assets & Sites](#assets--sites) (8 questions)
4. [Telemetry & Monitoring](#telemetry--monitoring) (6 questions)
5. [ML & Predictive Maintenance](#ml--predictive-maintenance) (10 questions)
6. [Compliance Reports](#compliance-reports) (8 questions)
7. [Mobile App](#mobile-app) (10 questions)
8. [Analytics & Dashboards](#analytics--dashboards) (8 questions)
9. [Administration](#administration) (6 questions)
10. [Troubleshooting](#troubleshooting) (12 questions)

---

## General

### Q1: What is dCMMS?

**A:** dCMMS is a cloud-based Computerized Maintenance Management System specifically designed for solar power plants. It helps O&M teams manage work orders, monitor equipment health, predict failures with ML, automate compliance reporting, and optimize operations.

### Q2: What's new in Release 2?

**A:** Release 2 (v0.3.0) introduces:
- **ML-Powered Predictive Maintenance:** Anomaly detection, health scoring, RUL estimation
- **Compliance Automation:** Automated CEA/MNRE report generation
- **Advanced Analytics:** Custom dashboard builder, advanced reporting
- **Performance:** 2.5x faster (API p95 <200ms, 72K events/sec telemetry)
- **Security:** Enterprise-grade security (93/100 score, MFA, encryption)

### Q3: Is dCMMS cloud-based or on-premise?

**A:** dCMMS is primarily cloud-based (AWS), but we offer on-premise deployment for customers with strict data residency requirements. Contact sales@dcmms.com for on-premise options.

### Q4: What browsers are supported?

**A:**
- **Recommended:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile browsers:** Chrome Mobile, Safari Mobile
- **Not supported:** Internet Explorer

### Q5: Can I access dCMMS offline?

**A:**
- **Web Dashboard:** Requires internet connection
- **Mobile App:** Full offline mode! Field technicians can complete work orders, capture photos, and log data without connectivity. Data syncs automatically when connection is restored.

### Q6: What languages does dCMMS support?

**A:** Currently English only. Hindi translation is planned for Q2 2026.

### Q7: How is my data secured?

**A:**
- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Authentication:** Password + optional MFA (required for admin roles)
- **Authorization:** Role-based access control (RBAC)
- **Compliance:** GDPR compliant, SOC 2 Type II in progress
- **Infrastructure:** AWS with VPC isolation, WAF, DDoS protection
- **Auditing:** All user actions logged

### Q8: What is the uptime SLA?

**A:** 99.5% uptime SLA for production environments (excluding scheduled maintenance). See Service Level Agreement for details.

### Q9: How do I get support?

**A:**
- **Email:** support@dcmms.com (response within 4 business hours)
- **Phone:** 1-800-DCMMS-HELP (24/7 for critical issues)
- **Live Chat:** Monday-Friday 9am-5pm (in-app)
- **Documentation:** docs.dcmms.com
- **Training:** training.dcmms.com

### Q10: How much does dCMMS cost?

**A:** Pricing is based on plant capacity and number of users. Typical pricing:
- **Small (1-50 MW):** $1,500-2,500/month
- **Medium (50-200 MW):** $2,500-5,000/month
- **Large (200+ MW):** Custom enterprise pricing

Volume discounts available. Contact sales@dcmms.com for a quote.

---

## Work Orders

### Q11: What types of work orders are supported?

**A:**
- **Corrective:** Reactive repairs (equipment failure)
- **Preventive:** Scheduled maintenance (time-based or meter-based)
- **Predictive:** ML-recommended maintenance (condition-based)
- **Inspection:** Regular equipment inspections
- **Project:** Multi-step projects (upgrades, installations)

### Q12: Can I create recurring work orders?

**A:** Yes! For preventive maintenance:
1. Assets → Select Asset → Preventive Maintenance
2. Set schedule: Daily, weekly, monthly, or custom interval
3. Assign technician(s)
4. Work orders auto-generate based on schedule

### Q13: How do I prioritize work orders?

**A:** Work orders have 4 priority levels:
- **Critical (P1):** Equipment failure, safety hazard (respond <1 hour)
- **High (P2):** Major degradation, impending failure (respond <4 hours)
- **Medium (P3):** Non-critical repair (respond <1 day)
- **Low (P4):** Minor issue, cosmetic (respond <1 week)

### Q14: Can I assign a work order to multiple technicians?

**A:** Currently, work orders can only be assigned to one primary technician. Workaround: Create separate work orders or use team-based assignment (assigns to team, any member can pick up).

### Q15: How do I bulk-assign work orders?

**A:**
1. Work Orders → Select multiple WOs (checkbox)
2. Bulk Actions → Assign
3. Select technician
4. All selected WOs assigned simultaneously

### Q16: Can I attach files to work orders?

**A:** Yes! Supported formats:
- **Images:** JPG, PNG (max 10MB each)
- **Documents:** PDF (max 25MB)
- **Videos:** MP4 (max 100MB)

Attach via web dashboard or mobile app camera.

### Q17: How do I track spare parts usage?

**A:** When completing a work order:
1. Tap "Add Parts"
2. Search for part by name or ID
3. Enter quantity used
4. Part inventory automatically decremented
5. Costs tracked for reporting

### Q18: Can I create work orders from email?

**A:** Not directly, but you can email support@dcmms.com and our team will create the work order for you. API integration for email-to-work-order is planned for Release 3.

### Q19: How do I view work order history for an asset?

**A:**
1. Assets → Select Asset
2. Scroll to "Work Order History" section
3. View all past work orders (completed, cancelled)
4. Filter by date range, type, technician

### Q20: Can I approve work orders before they're assigned?

**A:** Yes! Enable approval workflow:
1. Admin → Settings → Work Orders → Enable Approval Workflow
2. Work orders created by supervisors require manager approval
3. Manager receives email notification
4. Approve/reject in dashboard

### Q21: How long are work orders retained?

**A:** All work orders are retained indefinitely for historical analysis. You can archive old work orders (>2 years) to improve performance.

### Q22: Can I export work orders to Excel?

**A:** Yes!
1. Work Orders → Filter as needed
2. Export button → Select Excel or CSV
3. Download includes all fields and custom data

---

## Assets & Sites

### Q23: How do I add a new asset?

**A:**
1. Assets → Add Asset
2. Enter details:
   - Asset ID (unique identifier)
   - Type: Inverter, transformer, meter, etc.
   - Site and location
   - Manufacturer, model, serial number
   - Installation date
3. Upload nameplate photo (optional)
4. Assign QR code (auto-generated or custom)
5. Save

### Q24: Can I import assets from Excel?

**A:** Yes!
1. Assets → Import
2. Download Excel template
3. Fill in asset data (one row per asset)
4. Upload completed Excel file
5. System validates and imports (handles duplicates)

### Q25: How do QR codes work?

**A:** Each asset has a unique QR code. Field technicians scan QR codes with the mobile app to:
- View asset details instantly
- Create work orders for that asset
- Log inspections
- View maintenance history

QR codes can be printed as labels and affixed to equipment.

### Q26: What is asset health score?

**A:** Asset health score (0-100) represents equipment condition based on:
- Telemetry data (voltage, temperature, efficiency)
- Failure history (recent failures lower score)
- Maintenance compliance (overdue PM lowers score)
- ML model predictions (anomalies, degradation trends)

**Score Interpretation:**
- 90-100: Excellent (healthy)
- 70-89: Good (normal wear)
- 50-69: Fair (requires attention)
- 0-49: Poor (high failure risk)

### Q27: Can I set up asset hierarchies?

**A:** Yes! Asset hierarchy structure:
- **Portfolio** (multiple sites)
  - **Site** (e.g., Rajasthan Solar Park)
    - **Zone** (e.g., Block A)
      - **Asset** (e.g., Inverter INV-001)

Navigate hierarchy in Assets view with breadcrumb trail.

### Q28: How do I track asset warranties?

**A:** For each asset:
1. Asset Details → Warranty section
2. Enter:
   - Warranty start/end dates
   - Warranty provider
   - Coverage details
3. System alerts 30 days before warranty expiration

### Q29: Can I track asset costs (CapEx, OpEx)?

**A:** Yes! Track:
- **CapEx:** Initial purchase cost (entered during asset creation)
- **OpEx:** Ongoing costs (maintenance, parts, labor) - auto-calculated from work orders
- **Total Cost of Ownership (TCO):** CapEx + cumulative OpEx

View in Assets → Cost Analysis dashboard.

### Q30: How do I decommission an asset?

**A:**
1. Assets → Select Asset → Decommission
2. Enter reason and decommission date
3. Asset marked as "Decommissioned" (no longer appears in active asset lists)
4. Historical data retained for reporting

---

## Telemetry & Monitoring

### Q31: What telemetry data does dCMMS collect?

**A:** Depends on equipment type:
- **Inverters:** DC voltage/current, AC power, temperature, efficiency
- **Transformers:** Voltage, current, load, temperature, oil level
- **Meters:** Energy (kWh), power, power factor
- **Weather Stations:** Irradiance, temperature, humidity, wind speed

Data collected via MQTT or Modbus protocols.

### Q32: How often is telemetry data collected?

**A:** Configurable per asset type:
- **Default:** Inverters every 1 minute, transformers every 5 minutes
- **Range:** 10 seconds to 1 hour
- **Note:** More frequent = higher data storage costs

### Q33: How long is telemetry data retained?

**A:**
- **High-resolution (raw):** 30 days in QuestDB
- **Downsampled (5-min avg):** 2 years in PostgreSQL
- **Aggregated (hourly):** Indefinite

### Q34: Can I set custom alarm thresholds?

**A:** Yes!
1. Assets → Select Asset → Alarms
2. Add alarm rule:
   - Metric: e.g., DC Voltage
   - Condition: e.g., < 500V or > 700V
   - Duration: e.g., 5 minutes
   - Notification: Email, SMS, in-app
3. Save

Alarm triggers when condition met for specified duration.

### Q35: How do I view real-time telemetry?

**A:**
1. Dashboard → Telemetry widget (shows last 5 minutes)
2. Assets → Select Asset → Real-Time View (live chart)
3. Monitoring → Site Overview → Real-time generation map

Data updates every 30 seconds.

### Q36: Can I export telemetry data?

**A:** Yes!
1. Analytics → Telemetry Export
2. Select:
   - Assets
   - Metrics
   - Date range (max 30 days for raw data)
3. Export format: CSV or Excel
4. Download (email link if file >50MB)

---

## ML & Predictive Maintenance

### Q37: What is anomaly detection and how does it work?

**A:** Anomaly detection uses machine learning to identify unusual patterns in equipment telemetry. Our models are trained on historical "normal" behavior and flag deviations that could indicate impending failures.

**Example:** If an inverter's DC voltage starts oscillating irregularly, the model detects this as an anomaly even before it causes a fault.

### Q38: How accurate is the anomaly detection?

**A:** Our models achieve **92-96% accuracy** with **<5% false positive rate**. Accuracy improves over time as the model learns from your specific equipment. We recommend a 3-month training period for optimal results.

### Q39: What does the "confidence" percentage mean?

**A:** Confidence indicates how certain the model is that the detected pattern is truly anomalous.

- **94% confidence:** Model is highly certain this is a real issue (not normal variation)
- **80% confidence:** Moderate certainty (worth investigating)
- **<70% confidence:** Low certainty (could be false alarm)

We typically flag anomalies with confidence >80%.

### Q40: What is RUL (Remaining Useful Life)?

**A:** RUL is an estimate of how many days an asset can continue operating before it's likely to fail or require maintenance.

**Example:** "RUL: 42 days (±7 days)" means the asset will likely need maintenance in 35-49 days based on current degradation trends.

### Q41: Should I create a work order for every anomaly?

**A:** Not necessarily. Use severity and confidence to prioritize:
- **HIGH severity + >90% confidence:** Create work order immediately
- **MEDIUM severity + >85% confidence:** Schedule within 1 week
- **LOW severity or <80% confidence:** Monitor and investigate if pattern persists

### Q42: Can I adjust anomaly detection sensitivity?

**A:** Yes! Admin users can adjust the anomaly score threshold:
1. Admin → Settings → ML Models → Anomaly Detection
2. Adjust threshold (default: 0.75)
   - **Lower threshold (e.g., 0.65):** Detects more anomalies (more false positives)
   - **Higher threshold (e.g., 0.85):** Fewer alerts (might miss real issues)
3. Save

### Q43: How often are ML predictions updated?

**A:**
- **Anomaly detection:** Continuous (every 5 minutes)
- **Predictive maintenance scores & RUL:** Hourly
- **Energy forecasts:** Every 6 hours

### Q44: What data is used for energy forecasting?

**A:** Energy forecasting combines:
- Historical generation data (last 2 years)
- Weather forecasts (irradiance, temperature, cloud cover from third-party APIs)
- Equipment health status (healthy equipment generates more efficiently)
- Seasonal patterns and trends

**Accuracy:** 96.8% (MAE: 3.2%)

### Q45: Can I retrain ML models with my own data?

**A:** Yes! Enterprise customers can work with our ML team to retrain models on site-specific data. This improves accuracy for:
- Equipment brands and configurations
- Local weather patterns
- Operational characteristics unique to your site

Contact support@dcmms.com to discuss custom model training.

### Q46: What if the ML prediction is wrong?

**A:** ML predictions are probabilistic, not certainties. If a prediction was incorrect:
1. Click the "Feedback" button on the prediction
2. Mark as "False Alarm" or "Missed Issue"
3. Add comments explaining what actually happened

This feedback helps us continuously improve our models. You can also override predictions manually if you have domain expertise.

---

## Compliance Reports

### Q47: What compliance reports does dCMMS support?

**A:**
- **CEA (Central Electricity Authority):** Quarterly generation reports
- **MNRE (Ministry of New and Renewable Energy):** Quarterly performance reports
- **State-specific:** Custom templates for state regulators
- **Custom:** Build your own compliance report template

### Q48: How do I generate a CEA quarterly report?

**A:**
1. Navigate to **Compliance → Reports**
2. Click **"New Report"**
3. Select **Report Type: CEA Quarterly Generation Report**
4. Select **Period:** Q1, Q2, Q3, or Q4
5. Select **Site**
6. Click **"Generate"**
7. System auto-populates data (15 seconds)
8. Review and edit sections as needed
9. Export as PDF

### Q49: What data sources are used for compliance reports?

**A:** Reports auto-populate from:
- **Telemetry data:** Generation (MWh), availability (%)
- **Work orders:** Downtime events, maintenance activities
- **Assets:** Equipment inventory, specifications
- **Alarms:** Grid availability, outages
- **Manual entries:** Safety incidents, environmental data

**Data accuracy:** 99%+ (validated against source systems)

### Q50: Can I edit auto-populated data in compliance reports?

**A:** Yes! You can:
- **Edit values:** If telemetry data is incorrect
- **Add manual notes:** Commentary and explanations
- **Add manual sections:** Data not in dCMMS (e.g., regulatory changes)

All edits are tracked in audit log (who, when, what changed).

### Q51: What export formats are available?

**A:**
- **PDF:** For CEA (official format with digital signature support)
- **Excel:** For MNRE and internal analysis
- **Word:** For editing before finalization

### Q52: Can I schedule recurring compliance reports?

**A:** Yes!
1. Compliance → Reports → Schedule
2. Select:
   - Report type
   - Frequency: Monthly, quarterly, annually
   - Recipients (email addresses)
3. Reports auto-generate and email on schedule

### Q53: How do I submit reports to regulators?

**A:** dCMMS generates the report, but submission is manual:
1. Generate and download report (PDF/Excel)
2. Review and obtain approvals internally
3. Upload to regulator's portal (e.g., CEA portal, state websites)
4. Mark as "Submitted" in dCMMS with submission date

**Note:** Direct API integration with regulator portals is planned for Release 3.

### Q54: Can I see historical compliance reports?

**A:** Yes!
1. Compliance → Reports
2. View all past reports (sorted by date)
3. Filter by: Report type, site, period, status
4. Download or view any historical report

---

## Mobile App

### Q55: What platforms does the mobile app support?

**A:**
- **Android:** 8.0 (Oreo) or later
- **iOS:** 13.0 or later
- **Tablet:** Optimized for 7-10" tablets

### Q56: Does the mobile app work offline?

**A:** Yes! Full offline mode:
- Download work orders before going to field (auto-download when online)
- Complete work orders, capture photos, log parts/time offline
- Data queues locally and syncs automatically when connection restored
- Offline storage: Up to 500 work orders and 1,000 photos

### Q57: How do I enable offline mode?

**A:**
1. Open dCMMS mobile app
2. Tap **Settings** (gear icon)
3. Tap **Offline Mode**
4. Toggle **"Enable Offline Mode"**
5. App downloads your assigned work orders and asset data

**Note:** Requires initial online connection. Re-sync daily when online.

### Q58: Can I scan QR codes with the mobile app?

**A:** Yes! QR code scanner built-in:
1. Tap **Scan QR Code** button (camera icon)
2. Point camera at asset QR code
3. App opens asset details page
4. View info, create work order, or log inspection

### Q59: How do I take photos in the mobile app?

**A:**
1. Open work order
2. Tap **Camera** icon
3. Take photo (before, during, after)
4. Add annotation (optional): Circle, arrow, text
5. Photo attached to work order
6. Syncs when online

**Photo storage:** Unlimited (compressed to 2MB per photo)

### Q60: Can I use voice-to-text for work order notes?

**A:** Yes! When adding notes:
1. Tap in notes field
2. Tap microphone icon on keyboard
3. Speak your notes
4. Text auto-transcribed (requires online connection)

### Q61: How do I update the mobile app?

**A:**
- **Android:** Google Play Store → My Apps → dCMMS → Update
- **iOS:** App Store → Updates → dCMMS → Update

**Auto-update:** Enable in device settings for automatic updates.

### Q62: Can I use the mobile app on multiple devices?

**A:** Yes! Login with same credentials on phone, tablet, etc. Work orders sync across all devices.

### Q63: How much data does the mobile app use?

**A:**
- **Initial sync:** 50-100 MB (downloads work orders, asset data)
- **Daily sync:** 5-10 MB (upload photos, download new work orders)
- **Photos:** 2 MB per photo uploaded

**Tip:** Sync over Wi-Fi to avoid mobile data charges.

### Q64: Can I customize the mobile app home screen?

**A:** Limited customization:
- Show/hide widgets (work orders, recent activity)
- Sort work orders by: Priority, due date, asset
- Cannot rearrange layout (coming in Release 3)

---

## Analytics & Dashboards

### Q65: Can I create custom dashboards?

**A:** Yes! Release 2 introduces a **custom dashboard builder**:
1. Dashboards → Create New
2. Drag-and-drop widgets from library
3. Configure each widget (metric, time range, filters)
4. Resize and arrange widgets
5. Save and share with team

**No coding required!**

### Q66: What types of widgets are available?

**A:**
- **Metrics:** Single KPI values (OEE, availability, generation)
- **Charts:** Line, bar, pie, area, scatter
- **Tables:** Top assets, work orders, costs
- **Maps:** Geographic site view with performance overlay
- **Gauges:** Visual indicators (speedometer style)
- **Heatmaps:** Performance by time/location

**Total:** 15 widget types

### Q67: Can I schedule automated reports?

**A:** Yes!
1. Reports → Report Builder → Create report
2. Click **"Schedule Report"**
3. Set:
   - Frequency: Daily, weekly, monthly
   - Day/time
   - Recipients (email addresses)
   - Format: PDF, Excel, CSV
4. Save

Reports auto-generate and email on schedule.

### Q68: How do I share a dashboard with my team?

**A:**
1. Open dashboard
2. Click **Share** button
3. Select:
   - Specific users or
   - Role (all supervisors, all managers)
4. Set permissions: View only or Edit
5. Send

Shared users receive email notification with dashboard link.

### Q69: Can I export dashboard data to Excel?

**A:** Yes!
1. Open dashboard
2. Click widget menu (3 dots)
3. Export → Excel or CSV
4. Downloads data for that specific widget

To export entire dashboard: Use "Export All Widgets" button.

### Q70: What is the difference between dashboards and reports?

**A:**
- **Dashboards:** Real-time, interactive, multi-widget view (for monitoring)
- **Reports:** Static, scheduled, formatted for print/email (for analysis)

Use dashboards for day-to-day operations, reports for executive summaries and compliance.

### Q71: Can I set alerts based on dashboard metrics?

**A:** Yes!
1. Dashboard → Select widget
2. Widget menu → Create Alert
3. Set threshold (e.g., Availability <95%)
4. Set notification method (email, SMS)
5. Save

Alert triggers when metric crosses threshold.

### Q72: How do I filter dashboard data by date range?

**A:** Use global date filter:
1. Top-right corner: Date range selector
2. Choose: Today, Last 7 days, Last 30 days, Custom range
3. All widgets update automatically

Widgets can also have individual date filters (overrides global).

---

## Administration

### Q73: How do I add a new user?

**A:**
1. Admin → Users → Add User
2. Enter:
   - Name, email, phone
   - Role: Admin, Manager, Supervisor, Field Tech, Compliance
   - Sites: Assign site access
3. Set password (auto-generate or manual)
4. Enable MFA (required for Admin/Manager)
5. Send invitation email

User receives email with login link and password.

### Q74: What is role-based access control (RBAC)?

**A:** RBAC restricts access based on user role:
- **Admin:** Full system access (all features, all sites)
- **O&M Manager:** All sites, analytics, reporting (no admin functions)
- **Supervisor:** Assigned sites only, work orders, compliance
- **Field Tech:** Mobile app, assigned work orders only
- **Compliance Officer:** Compliance module only

**Principle of Least Privilege:** Users get minimum permissions needed for their job.

### Q75: Can I integrate dCMMS with our SSO (Single Sign-On)?

**A:** Yes! dCMMS supports:
- **SAML 2.0:** (e.g., Okta, Azure AD, Google Workspace)
- **OAuth 2.0 / OpenID Connect:** (e.g., Auth0)

**Setup:** Contact support@dcmms.com with your SSO provider details. Typical setup time: 1-2 weeks.

### Q76: How do I configure email notifications?

**A:**
1. Admin → Settings → Notifications
2. Configure:
   - SMTP server (or use dCMMS default)
   - Email templates (work order assignments, alerts, reports)
   - Notification frequency (immediate, daily digest, weekly)
3. Test email
4. Save

Users can customize their own notification preferences in Profile → Notifications.

### Q77: Can I white-label dCMMS with our company branding?

**A:** Yes! Enterprise customers can customize:
- Logo (top-left corner)
- Color scheme (primary, secondary, accent colors)
- Email templates (company branding)
- Custom domain (e.g., cmms.yourcompany.com instead of app.dcmms.com)

Contact sales@dcmms.com for white-label pricing.

### Q78: How do I backup dCMMS data?

**A:** For cloud deployments:
- **Automated:** Daily backups to AWS S3 (included in subscription)
- **Retention:** 30 days
- **Manual:** Admin → Backup → Create Backup

For on-premise deployments, you manage backups per your IT policy.

---

## Troubleshooting

### Q79: I forgot my password. How do I reset it?

**A:**
1. Go to login page
2. Click **"Forgot Password?"**
3. Enter your email
4. Click **"Send Reset Link"**
5. Check email for reset link (valid for 24 hours)
6. Click link and set new password

**No email received?** Check spam folder or contact support@dcmms.com.

### Q80: Why can't I log in? I'm getting "Invalid credentials" error.

**A:** Common causes:
1. **Wrong password:** Use "Forgot Password" to reset
2. **Account disabled:** Contact your admin
3. **MFA issue:** Check authenticator app time sync
4. **Caps Lock on:** Check keyboard
5. **Browser cache:** Clear cookies and try again

Still having issues? Contact support@dcmms.com.

### Q81: The dashboard is loading slowly. What should I do?

**A:**
1. **Check internet connection:** Run speed test (need >2 Mbps)
2. **Refresh page:** Ctrl+Shift+R (hard refresh)
3. **Clear browser cache:** Settings → Privacy → Clear cache
4. **Try different browser:** Use Chrome or Firefox
5. **Reduce widget count:** Remove unused widgets from dashboard

**Still slow?** Contact support@dcmms.com (may be server issue).

### Q82: Why am I not receiving email notifications?

**A:**
1. **Check spam folder:** dCMMS emails may be filtered
2. **Verify email address:** Profile → Settings → Email (correct?)
3. **Check notification settings:** Profile → Notifications (enabled?)
4. **Whitelist sender:** Add noreply@dcmms.com to contacts
5. **Contact IT:** Your company firewall may block emails

### Q83: My mobile app won't sync. What's wrong?

**A:**
1. **Check internet:** Enable Wi-Fi or mobile data
2. **Check app version:** Update to latest version
3. **Restart app:** Close completely and reopen
4. **Clear cache:** App Settings → Storage → Clear Cache
5. **Re-login:** Log out and log back in

**Still not syncing?** Contact support@dcmms.com.

### Q84: Work orders aren't showing up on the mobile app.

**A:**
1. **Check assignment:** Are work orders assigned to you?
2. **Check filters:** Remove filters (show all statuses, all sites)
3. **Sync data:** Pull down to refresh (force sync)
4. **Check offline mode:** Disable/re-enable to re-download data
5. **Check date range:** Expand date range filter

### Q85: Why can't I see certain menu items?

**A:** Likely a permissions issue:
- **Field Techs:** Can't see Analytics, Admin, Compliance (by design)
- **Supervisors:** Can't see Admin functions
- **Compliance Officers:** Only see Compliance module

**Solution:** Contact your admin to adjust your role/permissions.

### Q86: Telemetry data is missing for some assets.

**A:**
1. **Check asset configuration:** Assets → Select Asset → Telemetry Settings (configured?)
2. **Check data source:** Is equipment sending data? (check inverter/logger)
3. **Check connectivity:** MQTT/Modbus connection active?
4. **Check time range:** Expand time range (data may be older)
5. **Check permissions:** Do you have access to this asset?

**Still missing?** Contact support@dcmms.com with asset ID.

### Q87: Anomaly detection isn't flagging issues I can see.

**A:**
1. **Check threshold:** Admin → ML Settings → Anomaly threshold (may be too high)
2. **Check training period:** Model needs 30+ days of "normal" data
3. **Check issue severity:** Minor variations won't be flagged
4. **Provide feedback:** Mark missed issues as feedback (helps model learn)

**Note:** ML models are probabilistic and won't catch 100% of issues. Use in combination with rule-based alarms.

### Q88: I can't generate a compliance report. Getting an error.

**A:**
1. **Check data completeness:** Does site have telemetry data for entire period?
2. **Check permissions:** Do you have Compliance Officer or higher role?
3. **Check period:** Can only generate reports for completed periods (not future)
4. **Try different period:** Test with previous quarter
5. **Check browser:** Try Chrome (best compatibility)

**Error persists?** Contact support@dcmms.com with error message screenshot.

### Q89: Custom dashboard isn't saving.

**A:**
1. **Check internet connection:** Must be online to save
2. **Check dashboard name:** Must be unique (not already used)
3. **Check widget count:** Max 20 widgets per dashboard
4. **Try saving again:** May be temporary server issue
5. **Clear browser cache:** Then try saving

### Q90: Who do I contact for feature requests or bugs?

**A:**
- **Feature Requests:** features@dcmms.com or community.dcmms.com/feature-requests
- **Bugs:** support@dcmms.com (include screenshots, steps to reproduce)
- **Security Issues:** security@dcmms.com (do NOT post publicly)

We review feature requests quarterly and prioritize based on customer demand.

---

## Still Have Questions?

**Contact Support:**
- **Email:** support@dcmms.com
- **Phone:** 1-800-DCMMS-HELP
- **Live Chat:** In-app (Monday-Friday 9am-5pm)
- **Documentation:** docs.dcmms.com
- **Training Videos:** training.dcmms.com
- **Community Forum:** community.dcmms.com

**Response Times:**
- **Critical issues:** <1 hour (24/7)
- **Standard support:** <4 business hours
- **General inquiries:** <24 business hours

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Next Update:** Quarterly (based on common support tickets)
