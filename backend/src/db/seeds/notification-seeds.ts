import { db } from "../index";
import { notificationTemplates, notificationRules, tenants } from "../schema";

export async function seedNotifications() {
  console.log("🔔 Seeding notification templates and rules...");

  // Get default tenant
  const defaultTenant = await db.query.tenants.findFirst({
    where: (tenants, { eq }) => eq(tenants.tenantId, "default"),
  });

  if (!defaultTenant) {
    console.error("Default tenant not found. Run main seed first.");
    return;
  }

  // Seed Email Templates
  const emailTemplates = [
    {
      tenantId: defaultTenant.id,
      templateId: "email_work_order_assigned",
      name: "Work Order Assigned",
      eventType: "work_order_assigned" as const,
      channel: "email" as const,
      subject: "Work Order Assigned: {wo_id}",
      bodyTemplate: `
        <html>
          <body>
            <h2>Work Order Assigned</h2>
            <p>Hello,</p>
            <p>A new work order has been assigned to you:</p>
            <ul>
              <li><strong>Work Order ID:</strong> {wo_id}</li>
              <li><strong>Asset:</strong> {asset_name}</li>
              <li><strong>Site:</strong> {site_name}</li>
              <li><strong>Priority:</strong> {priority}</li>
            </ul>
            <p>Please log in to the dCMMS system to view the details.</p>
            <p>Thank you,<br/>dCMMS Team</p>
          </body>
        </html>
      `,
      variables: JSON.stringify([
        "wo_id",
        "asset_name",
        "site_name",
        "priority",
      ]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "email_alert_critical",
      name: "Critical Alert",
      eventType: "alert_critical" as const,
      channel: "email" as const,
      subject: "CRITICAL ALERT: {asset_name}",
      bodyTemplate: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #dc2626;">⚠️ CRITICAL ALERT</h2>
            <p>A critical alert has been triggered:</p>
            <table style="border-collapse: collapse; width: 100%;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Asset:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{asset_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Site:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{site_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{alarm_severity}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Value:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{value}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Threshold:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{threshold}</td>
              </tr>
            </table>
            <p style="color: #dc2626;"><strong>Immediate action required!</strong></p>
            <p>Thank you,<br/>dCMMS Monitoring System</p>
          </body>
        </html>
      `,
      variables: JSON.stringify([
        "asset_name",
        "site_name",
        "alarm_severity",
        "value",
        "threshold",
      ]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "email_alert_high",
      name: "High Priority Alert",
      eventType: "alert_high" as const,
      channel: "email" as const,
      subject: "High Priority Alert: {asset_name}",
      bodyTemplate: `
        <html>
          <body>
            <h2 style="color: #ea580c;">⚠️ High Priority Alert</h2>
            <p>A high priority alert has been triggered:</p>
            <ul>
              <li><strong>Asset:</strong> {asset_name}</li>
              <li><strong>Site:</strong> {site_name}</li>
              <li><strong>Value:</strong> {value}</li>
              <li><strong>Threshold:</strong> {threshold}</li>
            </ul>
            <p>Please review and take necessary action.</p>
            <p>Thank you,<br/>dCMMS Team</p>
          </body>
        </html>
      `,
      variables: JSON.stringify([
        "asset_name",
        "site_name",
        "value",
        "threshold",
      ]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "email_work_order_overdue",
      name: "Work Order Overdue",
      eventType: "work_order_overdue" as const,
      channel: "email" as const,
      subject: "Work Order Overdue: {wo_id}",
      bodyTemplate: `
        <html>
          <body>
            <h2 style="color: #ea580c;">Work Order Overdue</h2>
            <p>The following work order is overdue:</p>
            <ul>
              <li><strong>Work Order ID:</strong> {wo_id}</li>
              <li><strong>Asset:</strong> {asset_name}</li>
              <li><strong>Assigned To:</strong> {assigned_to}</li>
            </ul>
            <p>Please complete this work order as soon as possible.</p>
            <p>Thank you,<br/>dCMMS Team</p>
          </body>
        </html>
      `,
      variables: JSON.stringify(["wo_id", "asset_name", "assigned_to"]),
    },
  ];

  // Seed SMS Templates
  const smsTemplates = [
    {
      tenantId: defaultTenant.id,
      templateId: "sms_alert_critical",
      name: "Critical Alert SMS",
      eventType: "alert_critical" as const,
      channel: "sms" as const,
      subject: null,
      bodyTemplate:
        "CRITICAL: {asset_name} at {site_name}. Value: {value}, Threshold: {threshold}. Immediate action required!",
      variables: JSON.stringify([
        "asset_name",
        "site_name",
        "value",
        "threshold",
      ]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "sms_alert_high",
      name: "High Alert SMS",
      eventType: "alert_high" as const,
      channel: "sms" as const,
      subject: null,
      bodyTemplate:
        "HIGH: {asset_name} alert. Value: {value}, Threshold: {threshold}. Please review.",
      variables: JSON.stringify(["asset_name", "value", "threshold"]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "sms_work_order_assigned",
      name: "Work Order Assigned SMS",
      eventType: "work_order_assigned" as const,
      channel: "sms" as const,
      subject: null,
      bodyTemplate:
        "WO {wo_id} assigned to you. Asset: {asset_name}, Priority: {priority}. Check dCMMS app.",
      variables: JSON.stringify(["wo_id", "asset_name", "priority"]),
    },
  ];

  // Seed Push Notification Templates
  const pushTemplates = [
    {
      tenantId: defaultTenant.id,
      templateId: "push_alert_critical",
      name: "Critical Alert Push",
      eventType: "alert_critical" as const,
      channel: "push" as const,
      subject: "CRITICAL ALERT",
      bodyTemplate: "{asset_name}: {value} exceeds threshold {threshold}",
      variables: JSON.stringify(["asset_name", "value", "threshold"]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "push_alert_high",
      name: "High Alert Push",
      eventType: "alert_high" as const,
      channel: "push" as const,
      subject: "High Priority Alert",
      bodyTemplate: "{asset_name} requires attention",
      variables: JSON.stringify(["asset_name"]),
    },
    {
      tenantId: defaultTenant.id,
      templateId: "push_work_order_assigned",
      name: "Work Order Assigned Push",
      eventType: "work_order_assigned" as const,
      channel: "push" as const,
      subject: "New Work Order",
      bodyTemplate: "WO {wo_id} assigned: {asset_name}",
      variables: JSON.stringify(["wo_id", "asset_name"]),
    },
  ];

  // Insert templates
  await db
    .insert(notificationTemplates)
    .values([...emailTemplates, ...smsTemplates, ...pushTemplates]);

  console.log(
    `✅ Created ${emailTemplates.length + smsTemplates.length + pushTemplates.length} notification templates`,
  );

  // Seed Notification Rules
  const rules = [
    {
      tenantId: defaultTenant.id,
      ruleId: "rule_critical_alert",
      name: "Critical Alert Notification",
      eventType: "alert_critical" as const,
      channels: JSON.stringify(["email", "sms", "push"]),
      conditions: JSON.stringify({ severity: "critical" }),
      priority: 1,
      escalationMinutes: 30,
      isActive: true,
    },
    {
      tenantId: defaultTenant.id,
      ruleId: "rule_high_alert",
      name: "High Alert Notification",
      eventType: "alert_high" as const,
      channels: JSON.stringify(["email", "push"]),
      conditions: JSON.stringify({ severity: "high" }),
      priority: 2,
      escalationMinutes: 60,
      isActive: true,
    },
    {
      tenantId: defaultTenant.id,
      ruleId: "rule_medium_alert",
      name: "Medium Alert Notification",
      eventType: "alert_medium" as const,
      channels: JSON.stringify(["email"]),
      conditions: JSON.stringify({ severity: "medium" }),
      priority: 3,
      escalationMinutes: null,
      isActive: true,
    },
    {
      tenantId: defaultTenant.id,
      ruleId: "rule_work_order_assigned",
      name: "Work Order Assigned Notification",
      eventType: "work_order_assigned" as const,
      channels: JSON.stringify(["email", "push"]),
      conditions: JSON.stringify({}),
      priority: 4,
      escalationMinutes: null,
      isActive: true,
    },
    {
      tenantId: defaultTenant.id,
      ruleId: "rule_work_order_overdue",
      name: "Work Order Overdue Notification",
      eventType: "work_order_overdue" as const,
      channels: JSON.stringify(["email", "sms"]),
      conditions: JSON.stringify({}),
      priority: 2,
      escalationMinutes: null,
      isActive: true,
    },
  ];

  await db.insert(notificationRules).values(rules);

  console.log(`✅ Created ${rules.length} notification rules`);
  console.log("✅ Notification seed completed");
}
