# Vendor and Procurement Management Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Vendor Management](#2-vendor-management)
3. [Procurement Workflows](#3-procurement-workflows)
4. [Purchase Orders](#4-purchase-orders)
5. [Contract Management](#5-contract-management)
6. [Supplier Performance](#6-supplier-performance)
7. [RFQ/RFP Process](#7-rfqrfp-process)
8. [Integration with Finance](#8-integration-with-finance)

---

## 1. Overview

### 1.1 Purpose

Manage vendors, procurement processes, purchase orders, and contracts for renewable energy O&M operations.

### 1.2 Key Requirements

```yaml
requirements:
  vendor_management:
    - "Vendor registration and onboarding"
    - "Vendor categorization (OEM, spare parts, services)"
    - "Vendor performance tracking"
    - "Certifications and compliance tracking"

  procurement:
    - "Purchase requisition workflows"
    - "Multi-level approval chains"
    - "Purchase order generation"
    - "Receipt and inspection"
    - "Three-way matching (PO, receipt, invoice)"

  contracts:
    - "Contract creation and templates"
    - "Contract lifecycle management"
    - "Renewal reminders"
    - "SLA tracking"

  integration:
    - "ERP integration for financial posting"
    - "Inventory integration for stock replenishment"
    - "Work order integration for direct procurement"
```

---

## 2. Vendor Management

### 2.1 Vendor Schema

```json
{
  "vendorId": "VENDOR-001",
  "name": "SolarTech Components Inc.",
  "type": "manufacturer",
  "categories": ["inverters", "modules", "spare_parts"],
  "status": "active",

  "contact_info": {
    "primary_contact": {
      "name": "John Smith",
      "email": "john.smith@solartech.com",
      "phone": "+1-555-0101"
    },
    "addresses": [
      {
        "type": "headquarters",
        "street": "123 Solar Way",
        "city": "Phoenix",
        "state": "AZ",
        "zip": "85001",
        "country": "USA"
      },
      {
        "type": "warehouse",
        "street": "456 Distribution Blvd",
        "city": "Las Vegas",
        "state": "NV",
        "zip": "89101",
        "country": "USA"
      }
    ]
  },

  "financial_info": {
    "payment_terms": "net_30",
    "currency": "USD",
    "tax_id": "12-3456789",
    "bank_account": {
      "account_number": "****1234",
      "routing_number": "****5678",
      "bank_name": "First National Bank"
    }
  },

  "certifications": [
    {
      "type": "iso_9001",
      "issuing_body": "ISO",
      "issue_date": "2024-01-15",
      "expiry_date": "2027-01-15",
      "document_url": "s3://dcmms-vendors/VENDOR-001/iso9001.pdf"
    },
    {
      "type": "ul_listing",
      "issuing_body": "UL",
      "issue_date": "2023-06-01",
      "expiry_date": "2026-06-01"
    }
  },

  "insurance": [
    {
      "type": "general_liability",
      "provider": "Acme Insurance",
      "policy_number": "GL-12345",
      "coverage_amount": 2000000,
      "expiry_date": "2025-12-31"
    }
  ],

  "performance_metrics": {
    "average_lead_time_days": 14,
    "on_time_delivery_rate": 0.92,
    "quality_rating": 4.5,
    "total_orders": 152,
    "total_spend_ytd": 485000.00
  },

  "contracts": ["CONTRACT-001", "CONTRACT-002"],
  "approved_by": "user-procurement-mgr-001",
  "approved_at": "2024-03-01T10:00:00Z",
  "created_at": "2024-02-15T09:00:00Z",
  "updated_at": "2025-11-10T14:30:00Z"
}
```

### 2.2 Vendor Categories

```yaml
vendor_categories:
  oem:
    description: "Original Equipment Manufacturers"
    examples: ["inverter_manufacturers", "module_manufacturers", "tracker_manufacturers"]
    required_certifications: ["iso_9001", "ul_listing"]

  spare_parts:
    description: "Spare parts and component suppliers"
    examples: ["electrical_components", "mechanical_parts", "consumables"]
    required_certifications: ["iso_9001"]

  services:
    description: "Service providers"
    subcategories:
      - maintenance_contractors
      - engineering_consultants
      - testing_labs
      - training_providers
    required_insurance: ["general_liability", "professional_liability"]

  logistics:
    description: "Shipping and logistics providers"
    examples: ["freight_forwarders", "warehousing", "last_mile_delivery"]
    required_certifications: ["hazmat_certification"]
```

### 2.3 Vendor Onboarding

```javascript
class VendorOnboarding {
  async startOnboarding(vendorData) {
    const onboarding = {
      onboardingId: uuidv4(),
      vendorName: vendorData.name,
      status: 'pending',
      steps: [
        { step: 'company_info', status: 'completed', completedAt: new Date() },
        { step: 'financial_info', status: 'pending' },
        { step: 'certifications', status: 'pending' },
        { step: 'insurance', status: 'pending' },
        { step: 'approval', status: 'pending' }
      ],
      createdAt: new Date()
    };

    await db.vendorOnboarding.insert(onboarding);

    // Send onboarding email
    await emailService.send({
      to: vendorData.primaryContact.email,
      template: 'vendor_onboarding',
      context: { onboardingId: onboarding.onboardingId, vendorName: vendorData.name }
    });

    return onboarding;
  }

  async submitDocuments(onboardingId, documents) {
    // Validate required documents
    const required = ['tax_certificate', 'insurance_certificate', 'w9_form'];
    const missing = required.filter(doc => !documents[doc]);

    if (missing.length > 0) {
      throw new Error(`Missing required documents: ${missing.join(', ')}`);
    }

    // Store documents
    for (const [docType, file] of Object.entries(documents)) {
      await s3.upload({
        Bucket: 'dcmms-vendor-documents',
        Key: `${onboardingId}/${docType}.pdf`,
        Body: file
      });
    }

    // Update onboarding status
    await db.vendorOnboarding.update(
      { onboardingId },
      { 'steps.$.status': 'completed' }
    );
  }

  async approveVendor(onboardingId, approverId) {
    const onboarding = await db.vendorOnboarding.findOne({ onboardingId });

    // Create vendor record
    const vendor = {
      vendorId: `VENDOR-${Date.now()}`,
      ...onboarding.vendorData,
      status: 'active',
      approvedBy: approverId,
      approvedAt: new Date()
    };

    await db.vendors.insert(vendor);

    // Update onboarding status
    await db.vendorOnboarding.update(
      { onboardingId },
      { status: 'approved', approvedAt: new Date() }
    );

    return vendor;
  }
}
```

---

## 3. Procurement Workflows

### 3.1 Purchase Requisition

```json
{
  "requisitionId": "PR-2025-001",
  "type": "spare_parts",
  "requestedBy": "user-tech-001",
  "department": "operations",
  "siteId": "SITE-AZ-001",
  "status": "pending_approval",

  "items": [
    {
      "itemId": "item-001",
      "description": "Inverter cooling fan - Model XYZ-123",
      "partNumber": "FAN-XYZ-123",
      "quantity": 5,
      "unit": "each",
      "estimatedUnitPrice": 150.00,
      "estimatedTotal": 750.00,
      "justification": "Replacement for failed fans in INV-3A",
      "urgency": "high",
      "suggestedVendor": "VENDOR-001"
    },
    {
      "itemId": "item-002",
      "description": "DC disconnect switch",
      "partNumber": "DC-DISC-500A",
      "quantity": 2,
      "unit": "each",
      "estimatedUnitPrice": 320.00,
      "estimatedTotal": 640.00
    }
  ],

  "totalEstimated": 1390.00,
  "currency": "USD",
  "budgetCode": "OPEX-MAINT-2025",
  "budgetAvailable": 50000.00,

  "approvals": [
    {
      "level": 1,
      "approver": "user-supervisor-001",
      "requiredRole": "site_supervisor",
      "status": "approved",
      "approvedAt": "2025-11-10T10:00:00Z",
      "comments": "Approved - critical for operations"
    },
    {
      "level": 2,
      "approver": "user-procurement-001",
      "requiredRole": "procurement_manager",
      "status": "pending",
      "threshold": 1000.00
    }
  ],

  "linkedWorkOrder": "WO-5678",
  "deliverTo": {
    "location": "SITE-AZ-001 - Main Warehouse",
    "contact": "user-warehouse-001",
    "address": "123 Solar Farm Rd, Phoenix, AZ 85001"
  },

  "createdAt": "2025-11-10T09:00:00Z",
  "updatedAt": "2025-11-10T10:05:00Z"
}
```

### 3.2 Approval Workflows

```yaml
approval_thresholds:
  tier_1:
    amount_max: 1000
    approvers:
      - role: "site_supervisor"
        required: true

  tier_2:
    amount_max: 10000
    approvers:
      - role: "site_supervisor"
        required: true
      - role: "procurement_manager"
        required: true

  tier_3:
    amount_max: 50000
    approvers:
      - role: "site_supervisor"
        required: true
      - role: "procurement_manager"
        required: true
      - role: "operations_director"
        required: true

  tier_4:
    amount_min: 50000
    approvers:
      - role: "site_supervisor"
        required: true
      - role: "procurement_manager"
        required: true
      - role: "operations_director"
        required: true
      - role: "cfo"
        required: true
```

```javascript
class ProcurementApprovalEngine {
  async routeForApproval(requisition) {
    const totalAmount = requisition.totalEstimated;
    const approvalTier = this.determineApprovalTier(totalAmount);

    const approvalChain = {
      requisitionId: requisition.requisitionId,
      totalAmount,
      tier: approvalTier,
      approvals: approvalTier.approvers.map((approver, index) => ({
        level: index + 1,
        requiredRole: approver.role,
        status: index === 0 ? 'pending' : 'not_started',
        assignedTo: this.findUserByRole(approver.role, requisition.siteId)
      }))
    };

    await db.approvalChains.insert(approvalChain);

    // Notify first approver
    await this.notifyApprover(approvalChain.approvals[0]);

    return approvalChain;
  }

  async processApproval(requisitionId, approverId, decision, comments) {
    const requisition = await db.requisitions.findOne({ requisitionId });
    const chain = await db.approvalChains.findOne({ requisitionId });

    // Find current approval level
    const currentApproval = chain.approvals.find(a => a.status === 'pending');

    if (!currentApproval) {
      throw new Error('No pending approval found');
    }

    // Update approval
    currentApproval.status = decision;
    currentApproval.approvedAt = new Date();
    currentApproval.approvedBy = approverId;
    currentApproval.comments = comments;

    await db.approvalChains.update({ requisitionId }, chain);

    if (decision === 'rejected') {
      // Rejection - stop approval chain
      await db.requisitions.update(
        { requisitionId },
        { status: 'rejected', rejectedBy: approverId, rejectedAt: new Date() }
      );

      await this.notifyRequester(requisition, 'rejected', comments);
    } else if (decision === 'approved') {
      // Check if more approvals needed
      const nextApproval = chain.approvals.find(a => a.status === 'not_started');

      if (nextApproval) {
        // Route to next approver
        nextApproval.status = 'pending';
        await db.approvalChains.update({ requisitionId }, chain);
        await this.notifyApprover(nextApproval);
      } else {
        // All approvals complete - create PO
        await db.requisitions.update(
          { requisitionId },
          { status: 'approved', approvedAt: new Date() }
        );

        await this.createPurchaseOrder(requisition);
      }
    }
  }
}
```

---

## 4. Purchase Orders

### 4.1 Purchase Order Schema

```json
{
  "purchaseOrderId": "PO-2025-0123",
  "requisitionId": "PR-2025-001",
  "vendorId": "VENDOR-001",
  "vendorName": "SolarTech Components Inc.",
  "status": "sent",

  "orderDetails": {
    "orderDate": "2025-11-10T14:00:00Z",
    "deliveryDate": "2025-11-25T00:00:00Z",
    "paymentTerms": "net_30",
    "currency": "USD",
    "shippingMethod": "ground",
    "incoterms": "DAP"
  },

  "items": [
    {
      "lineNumber": 1,
      "partNumber": "FAN-XYZ-123",
      "description": "Inverter cooling fan - Model XYZ-123",
      "quantity": 5,
      "unit": "each",
      "unitPrice": 145.00,
      "totalPrice": 725.00,
      "taxRate": 0.08,
      "tax": 58.00,
      "receivedQuantity": 0,
      "receivedDate": null
    },
    {
      "lineNumber": 2,
      "partNumber": "DC-DISC-500A",
      "description": "DC disconnect switch",
      "quantity": 2,
      "unit": "each",
      "unitPrice": 315.00,
      "totalPrice": 630.00,
      "taxRate": 0.08,
      "tax": 50.40,
      "receivedQuantity": 0,
      "receivedDate": null
    }
  ],

  "pricing": {
    "subtotal": 1355.00,
    "tax": 108.40,
    "shipping": 75.00,
    "total": 1538.40
  },

  "shipping_address": {
    "name": "Arizona Solar Farm",
    "street": "123 Solar Farm Rd",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85001",
    "country": "USA",
    "contact": "John Warehouse",
    "phone": "+1-602-555-0201"
  },

  "billing_address": {
    "name": "Clean Energy Corp - Accounts Payable",
    "street": "456 Corporate Blvd",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85002",
    "country": "USA"
  },

  "notes": "Please include packing slip with shipment. Contact warehouse before delivery.",

  "tracking": {
    "trackingNumber": null,
    "carrier": null,
    "estimatedDelivery": "2025-11-25"
  },

  "invoices": [],
  "receipts": [],

  "createdBy": "user-procurement-001",
  "createdAt": "2025-11-10T14:00:00Z",
  "sentToVendorAt": "2025-11-10T14:15:00Z"
}
```

### 4.2 Purchase Order Lifecycle

```javascript
class PurchaseOrderManager {
  async createPO(requisition) {
    // Get vendor quote if available
    const quote = await this.getBestQuote(requisition);

    const po = {
      purchaseOrderId: this.generatePONumber(),
      requisitionId: requisition.requisitionId,
      vendorId: quote.vendorId,
      status: 'draft',
      orderDetails: {
        orderDate: new Date(),
        deliveryDate: this.calculateDeliveryDate(quote.leadTimeDays),
        paymentTerms: quote.paymentTerms,
        currency: 'USD'
      },
      items: requisition.items.map((item, index) => ({
        lineNumber: index + 1,
        ...item,
        unitPrice: quote.items[index].unitPrice,
        totalPrice: quote.items[index].unitPrice * item.quantity
      })),
      pricing: this.calculatePricing(requisition.items, quote),
      shippingAddress: requisition.deliverTo,
      createdAt: new Date()
    };

    await db.purchaseOrders.insert(po);

    return po;
  }

  async sendPO(purchaseOrderId) {
    const po = await db.purchaseOrders.findOne({ purchaseOrderId });

    // Generate PDF
    const pdfBuffer = await this.generatePOPDF(po);

    // Send to vendor
    await emailService.send({
      to: po.vendor.primaryContact.email,
      subject: `Purchase Order ${purchaseOrderId}`,
      body: `Please find attached purchase order ${purchaseOrderId}. Expected delivery: ${po.orderDetails.deliveryDate}`,
      attachments: [
        {
          filename: `PO-${purchaseOrderId}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    // Update status
    await db.purchaseOrders.update(
      { purchaseOrderId },
      {
        status: 'sent',
        sentToVendorAt: new Date()
      }
    );

    // Audit log
    await auditLogger.log({
      action: 'purchase_order.sent',
      resource: { type: 'purchase_order', id: purchaseOrderId },
      details: { vendorId: po.vendorId, total: po.pricing.total }
    });
  }

  async receiveItems(purchaseOrderId, receipt) {
    const po = await db.purchaseOrders.findOne({ purchaseOrderId });

    // Validate receipt
    for (const item of receipt.items) {
      const poItem = po.items.find(i => i.lineNumber === item.lineNumber);

      if (!poItem) {
        throw new Error(`Line ${item.lineNumber} not found in PO`);
      }

      if (item.receivedQuantity > poItem.quantity - poItem.receivedQuantity) {
        throw new Error(`Over-receipt not allowed for line ${item.lineNumber}`);
      }
    }

    // Create receipt record
    const receiptRecord = {
      receiptId: uuidv4(),
      purchaseOrderId,
      receivedBy: receipt.receivedBy,
      receivedAt: new Date(),
      items: receipt.items,
      notes: receipt.notes,
      photos: receipt.photos
    };

    await db.receipts.insert(receiptRecord);

    // Update PO line items
    for (const item of receipt.items) {
      await db.purchaseOrders.update(
        { purchaseOrderId, 'items.lineNumber': item.lineNumber },
        {
          $inc: { 'items.$.receivedQuantity': item.receivedQuantity },
          $set: { 'items.$.receivedDate': new Date() }
        }
      );

      // Update inventory
      await inventoryService.addStock({
        partNumber: item.partNumber,
        quantity: item.receivedQuantity,
        location: po.shippingAddress.siteId,
        receiptId: receiptRecord.receiptId
      });
    }

    // Check if PO fully received
    const updatedPO = await db.purchaseOrders.findOne({ purchaseOrderId });
    const fullyReceived = updatedPO.items.every(
      item => item.receivedQuantity === item.quantity
    );

    if (fullyReceived) {
      await db.purchaseOrders.update(
        { purchaseOrderId },
        { status: 'received', receivedAt: new Date() }
      );
    } else {
      await db.purchaseOrders.update(
        { purchaseOrderId },
        { status: 'partial_receipt' }
      );
    }

    return receiptRecord;
  }

  async processInvoice(purchaseOrderId, invoice) {
    const po = await db.purchaseOrders.findOne({ purchaseOrderId });

    // Three-way matching: PO, Receipt, Invoice
    const matchResult = await this.threeWayMatch(po, invoice);

    if (!matchResult.matched) {
      // Flag for review
      await this.flagForReview(po, invoice, matchResult.discrepancies);
      return { status: 'flagged', discrepancies: matchResult.discrepancies };
    }

    // Post to ERP
    await erpService.postInvoice({
      invoiceNumber: invoice.invoiceNumber,
      vendorId: po.vendorId,
      amount: invoice.total,
      dueDate: this.calculateDueDate(po.orderDetails.paymentTerms),
      glAccount: po.glAccount,
      costCenter: po.costCenter
    });

    await db.purchaseOrders.update(
      { purchaseOrderId },
      { status: 'invoiced', invoicedAt: new Date() }
    );

    return { status: 'posted' };
  }

  threeWayMatch(po, invoice) {
    const discrepancies = [];

    // Match PO total vs Invoice total
    if (Math.abs(po.pricing.total - invoice.total) > 0.01) {
      discrepancies.push({
        type: 'price_mismatch',
        po_amount: po.pricing.total,
        invoice_amount: invoice.total,
        difference: invoice.total - po.pricing.total
      });
    }

    // Match quantities
    for (const invoiceLine of invoice.lineItems) {
      const poLine = po.items.find(i => i.lineNumber === invoiceLine.lineNumber);

      if (!poLine) {
        discrepancies.push({
          type: 'line_not_found',
          line: invoiceLine.lineNumber
        });
        continue;
      }

      if (poLine.receivedQuantity !== invoiceLine.quantity) {
        discrepancies.push({
          type: 'quantity_mismatch',
          line: invoiceLine.lineNumber,
          received: poLine.receivedQuantity,
          invoiced: invoiceLine.quantity
        });
      }

      if (Math.abs(poLine.unitPrice - invoiceLine.unitPrice) > 0.01) {
        discrepancies.push({
          type: 'price_mismatch',
          line: invoiceLine.lineNumber,
          po_price: poLine.unitPrice,
          invoice_price: invoiceLine.unitPrice
        });
      }
    }

    return {
      matched: discrepancies.length === 0,
      discrepancies
    };
  }
}
```

---

## 5. Contract Management

### 5.1 Contract Schema

```json
{
  "contractId": "CONTRACT-2025-001",
  "type": "service_agreement",
  "title": "Annual Preventive Maintenance Services",
  "vendorId": "VENDOR-OEM-001",
  "status": "active",

  "dates": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "signedDate": "2024-12-15",
    "renewalDate": "2025-10-01",
    "noticePeriodDays": 60
  },

  "financial": {
    "totalValue": 250000.00,
    "currency": "USD",
    "paymentSchedule": "monthly",
    "monthlyAmount": 20833.33,
    "escalationClause": "3% annual increase"
  },

  "scope": {
    "description": "Preventive maintenance for all inverters and trackers",
    "sites": ["SITE-AZ-001", "SITE-AZ-002"],
    "assets": ["INV-*", "TRK-*"],
    "serviceLevel": {
      "responseTime": "4 hours",
      "resolutionTime": "24 hours",
      "availability": "99.5%"
    }
  },

  "slas": [
    {
      "metric": "response_time",
      "target": "< 4 hours",
      "measurement": "Time from alert to technician dispatch",
      "penalty": "5% monthly fee reduction per hour delay"
    },
    {
      "metric": "uptime",
      "target": "> 99.5%",
      "measurement": "Monthly asset availability",
      "penalty": "10% monthly fee reduction per 0.1% below target"
    }
  ],

  "milestones": [
    {
      "name": "Q1 Inspection Complete",
      "dueDate": "2025-03-31",
      "status": "completed",
      "completedDate": "2025-03-28"
    },
    {
      "name": "Q2 Inspection Complete",
      "dueDate": "2025-06-30",
      "status": "in_progress"
    }
  ],

  "documents": [
    {
      "type": "signed_contract",
      "filename": "CONTRACT-2025-001_signed.pdf",
      "uploadedAt": "2024-12-15T10:00:00Z",
      "url": "s3://dcmms-contracts/CONTRACT-2025-001/signed_contract.pdf"
    }
  ],

  "renewalReminders": [
    {
      "notifyAt": "2025-09-01",
      "notifyTo": ["user-procurement-mgr-001", "user-ops-director-001"],
      "sent": false
    }
  ],

  "createdBy": "user-procurement-mgr-001",
  "createdAt": "2024-12-01T09:00:00Z"
}
```

### 5.2 Contract Renewal Workflow

```javascript
class ContractManager {
  async checkRenewalsDue() {
    const today = new Date();
    const contracts = await db.contracts.find({
      status: 'active',
      'dates.renewalDate': { $lte: addDays(today, 90) }, // 90 days notice
      'renewalReminders.sent': false
    });

    for (const contract of contracts) {
      await this.sendRenewalReminder(contract);
    }
  }

  async sendRenewalReminder(contract) {
    const daysUntilRenewal = Math.floor(
      (new Date(contract.dates.renewalDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    await notificationService.send({
      recipients: contract.renewalReminders[0].notifyTo,
      template: 'contract_renewal_reminder',
      context: {
        contractId: contract.contractId,
        contractTitle: contract.title,
        vendor: contract.vendorName,
        renewalDate: contract.dates.renewalDate,
        daysUntilRenewal,
        totalValue: contract.financial.totalValue
      },
      channels: ['email']
    });

    await db.contracts.update(
      { contractId: contract.contractId },
      { 'renewalReminders.0.sent': true, 'renewalReminders.0.sentAt': new Date() }
    );
  }

  async trackSLA(contractId, metric, actualValue) {
    const contract = await db.contracts.findOne({ contractId });
    const sla = contract.slas.find(s => s.metric === metric);

    if (!sla) return;

    const met = this.evaluateSLA(sla, actualValue);

    // Record SLA measurement
    await db.slaMeasurements.insert({
      contractId,
      metric,
      target: sla.target,
      actual: actualValue,
      met,
      measuredAt: new Date()
    });

    if (!met) {
      // Calculate penalty
      const penalty = this.calculatePenalty(sla, actualValue);

      await this.notifySLABreach(contract, sla, actualValue, penalty);
    }
  }
}
```

---

## 6. Supplier Performance

### 6.1 Performance Metrics

```yaml
performance_metrics:
  on_time_delivery:
    calculation: "Deliveries on time / Total deliveries"
    target: "> 95%"
    measurement_period: "trailing 12 months"

  quality_rating:
    calculation: "Average rating from received goods inspections"
    scale: "1-5 stars"
    target: "> 4.0"

  lead_time:
    calculation: "Average days from PO to delivery"
    unit: "days"
    target: "< vendor_quoted_lead_time"

  defect_rate:
    calculation: "Defective items / Total items received"
    target: "< 2%"

  responsiveness:
    calculation: "Response time to inquiries and issues"
    target: "< 24 hours"

  cost_competitiveness:
    calculation: "Price vs market average"
    target: "within 10% of market"
```

### 6.2 Vendor Scorecard

```javascript
class VendorScorecardGenerator {
  async generateScorecard(vendorId, period) {
    const vendor = await db.vendors.findOne({ vendorId });
    const orders = await this.getPurchaseOrders(vendorId, period);
    const receipts = await this.getReceipts(vendorId, period);

    const scorecard = {
      vendorId,
      vendorName: vendor.name,
      period,
      generatedAt: new Date(),

      metrics: {
        on_time_delivery: this.calculateOnTimeDelivery(orders, receipts),
        quality_rating: await this.calculateQualityRating(receipts),
        average_lead_time: this.calculateAverageLeadTime(orders, receipts),
        defect_rate: await this.calculateDefectRate(receipts),
        total_spend: this.calculateTotalSpend(orders)
      },

      overall_score: 0, // Calculated below
      grade: '', // A, B, C, D, F
      recommendation: ''
    };

    // Calculate weighted overall score
    scorecard.overall_score = (
      scorecard.metrics.on_time_delivery * 0.3 +
      scorecard.metrics.quality_rating / 5 * 0.3 +
      (scorecard.metrics.defect_rate < 0.02 ? 1 : 0) * 0.2 +
      (scorecard.metrics.average_lead_time <= vendor.quotedLeadTime ? 1 : 0.5) * 0.2
    );

    // Assign grade
    if (scorecard.overall_score >= 0.9) scorecard.grade = 'A';
    else if (scorecard.overall_score >= 0.8) scorecard.grade = 'B';
    else if (scorecard.overall_score >= 0.7) scorecard.grade = 'C';
    else if (scorecard.overall_score >= 0.6) scorecard.grade = 'D';
    else scorecard.grade = 'F';

    // Recommendation
    if (scorecard.grade === 'A' || scorecard.grade === 'B') {
      scorecard.recommendation = 'Preferred vendor - maintain relationship';
    } else if (scorecard.grade === 'C') {
      scorecard.recommendation = 'Acceptable - monitor performance';
    } else {
      scorecard.recommendation = 'Review vendor - consider alternatives';
    }

    await db.vendorScorecards.insert(scorecard);

    return scorecard;
  }

  calculateOnTimeDelivery(orders, receipts) {
    let onTime = 0;
    let total = 0;

    for (const order of orders) {
      const receipt = receipts.find(r => r.purchaseOrderId === order.purchaseOrderId);

      if (receipt) {
        total++;
        if (new Date(receipt.receivedAt) <= new Date(order.orderDetails.deliveryDate)) {
          onTime++;
        }
      }
    }

    return total > 0 ? onTime / total : 0;
  }
}
```

---

## 7. RFQ/RFP Process

### 7.1 Request for Quotation (RFQ)

```json
{
  "rfqId": "RFQ-2025-012",
  "title": "Solar Modules - 500 kW Expansion",
  "type": "request_for_quotation",
  "status": "published",

  "schedule": {
    "publishedDate": "2025-11-01",
    "submissionDeadline": "2025-11-15T17:00:00Z",
    "evaluationPeriod": "2025-11-16 to 2025-11-22",
    "awardDate": "2025-11-25"
  },

  "items": [
    {
      "lineNumber": 1,
      "description": "Monocrystalline solar modules, 450W, with 25-year warranty",
      "quantity": 1112,
      "unit": "each",
      "specifications": {
        "power_rating": "450W ±3%",
        "efficiency": "> 20%",
        "dimensions": "2094 x 1038 x 35 mm",
        "weight": "< 25 kg",
        "certifications": ["IEC 61215", "IEC 61730", "UL 1703"]
      },
      "deliveryRequired": "2025-12-31"
    }
  ],

  "requirements": {
    "delivery_location": "Phoenix, AZ",
    "payment_terms": "net_30",
    "warranty": "25 years performance, 10 years product",
    "installation_support": "Optional"
  },

  "evaluation_criteria": [
    { "criterion": "Price", "weight": 40 },
    { "criterion": "Quality/Specs", "weight": 30 },
    { "criterion": "Delivery Timeline", "weight": 15 },
    { "criterion": "Warranty Terms", "weight": 10 },
    { "criterion": "Vendor Experience", "weight": 5 }
  ],

  "invited_vendors": ["VENDOR-MOD-001", "VENDOR-MOD-002", "VENDOR-MOD-003"],
  "submitted_quotes": 0,
  "createdBy": "user-procurement-mgr-001"
}
```

### 7.2 Quote Evaluation

```javascript
class RFQManager {
  async evaluateQuotes(rfqId) {
    const rfq = await db.rfqs.findOne({ rfqId });
    const quotes = await db.quotes.find({ rfqId });

    const evaluations = [];

    for (const quote of quotes) {
      const scores = {};

      // Price score (lower is better)
      const minPrice = Math.min(...quotes.map(q => q.totalPrice));
      scores.price = (minPrice / quote.totalPrice) * rfq.evaluation_criteria.find(c => c.criterion === 'Price').weight;

      // Quality/Specs score (manual evaluation)
      scores.quality = quote.qualityScore * rfq.evaluation_criteria.find(c => c.criterion === 'Quality/Specs').weight / 100;

      // Delivery timeline score
      const earliestDelivery = Math.min(...quotes.map(q => new Date(q.deliveryDate)));
      const quoteDelivery = new Date(quote.deliveryDate);
      const daysDiff = (quoteDelivery - earliestDelivery) / (1000 * 60 * 60 * 24);
      scores.delivery = Math.max(0, (1 - daysDiff / 30)) * rfq.evaluation_criteria.find(c => c.criterion === 'Delivery Timeline').weight;

      // Warranty score
      scores.warranty = (quote.warrantyYears / 25) * rfq.evaluation_criteria.find(c => c.criterion === 'Warranty Terms').weight;

      // Vendor experience score
      const vendor = await db.vendors.findOne({ vendorId: quote.vendorId });
      scores.experience = (vendor.performanceMetrics.quality_rating / 5) * rfq.evaluation_criteria.find(c => c.criterion === 'Vendor Experience').weight;

      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

      evaluations.push({
        quoteId: quote.quoteId,
        vendorId: quote.vendorId,
        vendorName: quote.vendorName,
        totalPrice: quote.totalPrice,
        scores,
        totalScore,
        rank: 0 // Assigned after sorting
      });
    }

    // Rank quotes
    evaluations.sort((a, b) => b.totalScore - a.totalScore);
    evaluations.forEach((eval, index) => eval.rank = index + 1);

    // Save evaluation
    await db.rfqEvaluations.insert({
      rfqId,
      evaluations,
      evaluatedAt: new Date(),
      evaluatedBy: 'user-procurement-mgr-001'
    });

    return evaluations;
  }

  async awardRFQ(rfqId, winningQuoteId) {
    const quote = await db.quotes.findOne({ quoteId: winningQuoteId });
    const rfq = await db.rfqs.findOne({ rfqId });

    // Create purchase requisition from winning quote
    const requisition = {
      requisitionId: `PR-${Date.now()}`,
      type: 'rfq_award',
      rfqId,
      items: quote.items,
      totalEstimated: quote.totalPrice,
      suggestedVendor: quote.vendorId,
      status: 'approved' // Pre-approved through RFQ process
    };

    await db.requisitions.insert(requisition);

    // Update RFQ status
    await db.rfqs.update(
      { rfqId },
      { status: 'awarded', awardedTo: quote.vendorId, awardedAt: new Date() }
    );

    // Notify winning vendor
    await notificationService.send({
      to: quote.vendor.primaryContact.email,
      template: 'rfq_award',
      context: { rfq, quote }
    });

    // Notify losing vendors
    const losingQuotes = await db.quotes.find({
      rfqId,
      quoteId: { $ne: winningQuoteId }
    });

    for (const losingQuote of losingQuotes) {
      await notificationService.send({
        to: losingQuote.vendor.primaryContact.email,
        template: 'rfq_not_awarded',
        context: { rfq }
      });
    }
  }
}
```

---

## 8. Integration with Finance

### 8.1 ERP Integration

```javascript
class FinanceIntegration {
  async postPurchaseOrder(po) {
    // Post commitment to ERP (encumbrance)
    const commitment = {
      documentType: 'PO',
      documentNumber: po.purchaseOrderId,
      vendorId: po.vendorId,
      amount: po.pricing.total,
      glAccount: po.glAccount || '5100', // OPEX - Maintenance
      costCenter: po.costCenter || po.siteId,
      commitmentDate: new Date()
    };

    await erpService.postCommitment(commitment);
  }

  async postReceipt(receipt) {
    // Post goods receipt to ERP (inventory value)
    const goodsReceipt = {
      documentType: 'GR',
      documentNumber: receipt.receiptId,
      purchaseOrder: receipt.purchaseOrderId,
      items: receipt.items.map(item => ({
        materialNumber: item.partNumber,
        quantity: item.receivedQuantity,
        unit: item.unit,
        storageLocation: receipt.location
      })),
      postingDate: new Date()
    };

    await erpService.postGoodsReceipt(goodsReceipt);
  }

  async postInvoice(po, invoice) {
    // Post invoice to ERP (accounts payable)
    const apInvoice = {
      documentType: 'AP',
      invoiceNumber: invoice.invoiceNumber,
      vendorId: po.vendorId,
      purchaseOrder: po.purchaseOrderId,
      invoiceDate: invoice.invoiceDate,
      amount: invoice.total,
      dueDate: this.calculateDueDate(po.orderDetails.paymentTerms, invoice.invoiceDate),
      glAccount: po.glAccount,
      costCenter: po.costCenter,
      taxAmount: invoice.tax,
      taxCode: invoice.taxCode
    };

    await erpService.postInvoice(apInvoice);
  }
}
```

---

## Summary

This specification provides comprehensive vendor and procurement management:

1. **Vendor Management** with registration, onboarding, certifications, performance tracking
2. **Procurement Workflows** with purchase requisitions, multi-level approvals, budget control
3. **Purchase Orders** with PO generation, sending, receipt tracking, three-way matching
4. **Contract Management** with SLA tracking, renewal reminders, milestone tracking
5. **Supplier Performance** with scorecards, on-time delivery, quality ratings
6. **RFQ/RFP Process** with quote evaluation, scoring, vendor selection
7. **Finance Integration** with ERP posting for commitments, receipts, invoices

**Lines:** ~1,100
**Status:** Complete
**Next:** Edge Computing (Spec 21)
