# UX Design System and Training Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design System](#2-design-system)
3. [User Onboarding](#3-user-onboarding)
4. [Training Materials](#4-training-materials)
5. [Help System](#5-help-system)
6. [Accessibility](#6-accessibility)
7. [Responsive Design](#7-responsive-design)
8. [User Personas](#8-user-personas)
9. [Usability Testing](#9-usability-testing)

---

## 1. Overview

### 1.1 Purpose

Establish a comprehensive UX design system and training framework for dCMMS to ensure consistent user experience, efficient onboarding, and ongoing user support across web and mobile platforms.

### 1.2 Key Requirements

- **Design system:** Reusable component library with design tokens for consistent UI
- **Onboarding flows:** Guided tours and progressive disclosure for new users
- **Training materials:** Role-specific training modules, videos, and documentation
- **Help system:** Contextual help, tooltips, and searchable knowledge base
- **Accessibility:** WCAG 2.1 AA compliance for inclusive design
- **Responsive design:** Mobile-first approach for field technicians
- **Documentation:** Comprehensive user guides and API documentation
- **Continuous improvement:** Usability testing and feedback loops

### 1.3 Design Principles

```yaml
design_principles:
  clarity:
    description: "Clear, concise interfaces that communicate purpose immediately"
    examples:
      - "Use action-oriented labels (Submit Work Order, not Submit)"
      - "Provide immediate feedback for user actions"
      - "Show status indicators prominently"

  efficiency:
    description: "Minimize clicks and cognitive load for common tasks"
    examples:
      - "Bulk actions for work order management"
      - "Keyboard shortcuts for power users"
      - "Smart defaults based on user context"

  consistency:
    description: "Predictable patterns across all modules"
    examples:
      - "Consistent navigation structure"
      - "Uniform color coding for status"
      - "Standard form layouts"

  feedback:
    description: "Immediate, informative responses to user actions"
    examples:
      - "Loading states for async operations"
      - "Success/error toasts with clear messages"
      - "Progress indicators for multi-step workflows"

  forgiveness:
    description: "Prevent errors and allow easy recovery"
    examples:
      - "Confirmation dialogs for destructive actions"
      - "Undo functionality for critical operations"
      - "Auto-save for long forms"

  mobile_first:
    description: "Design for mobile constraints, enhance for desktop"
    examples:
      - "Touch-friendly targets (min 44x44px)"
      - "Thumb-zone optimization for critical actions"
      - "Offline-first architecture"
```

---

## 2. Design System

### 2.1 Design Tokens

```json
{
  "colors": {
    "primary": {
      "50": "#E3F2FD",
      "100": "#BBDEFB",
      "200": "#90CAF9",
      "300": "#64B5F6",
      "400": "#42A5F5",
      "500": "#2196F3",
      "600": "#1E88E5",
      "700": "#1976D2",
      "800": "#1565C0",
      "900": "#0D47A1"
    },
    "success": {
      "light": "#81C784",
      "main": "#4CAF50",
      "dark": "#388E3C"
    },
    "warning": {
      "light": "#FFB74D",
      "main": "#FF9800",
      "dark": "#F57C00"
    },
    "error": {
      "light": "#E57373",
      "main": "#F44336",
      "dark": "#D32F2F"
    },
    "info": {
      "light": "#64B5F6",
      "main": "#2196F3",
      "dark": "#1976D2"
    },
    "neutral": {
      "50": "#FAFAFA",
      "100": "#F5F5F5",
      "200": "#EEEEEE",
      "300": "#E0E0E0",
      "400": "#BDBDBD",
      "500": "#9E9E9E",
      "600": "#757575",
      "700": "#616161",
      "800": "#424242",
      "900": "#212121"
    },
    "status": {
      "draft": "#9E9E9E",
      "in_progress": "#2196F3",
      "on_hold": "#FF9800",
      "completed": "#4CAF50",
      "cancelled": "#F44336",
      "operational": "#4CAF50",
      "degraded": "#FF9800",
      "failed": "#F44336",
      "maintenance": "#9E9E9E"
    }
  },

  "typography": {
    "fontFamily": {
      "primary": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "monospace": "'Roboto Mono', 'Courier New', monospace"
    },
    "fontSize": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem"
    },
    "fontWeight": {
      "light": 300,
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "lineHeight": {
      "tight": 1.25,
      "normal": 1.5,
      "relaxed": 1.75
    }
  },

  "spacing": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem"
  },

  "borderRadius": {
    "none": "0",
    "sm": "0.125rem",
    "md": "0.375rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "full": "9999px"
  },

  "shadows": {
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  },

  "breakpoints": {
    "xs": "320px",
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px",
    "2xl": "1536px"
  }
}
```

### 2.2 Component Library

```yaml
components:
  buttons:
    variants:
      - primary: "Main call-to-action (Submit, Save, Create)"
      - secondary: "Secondary actions (Cancel, Back)"
      - tertiary: "Low-emphasis actions (Clear, Reset)"
      - danger: "Destructive actions (Delete, Remove)"
      - ghost: "Minimal style (Icon buttons, menu items)"

    sizes:
      - xs: "24px height, 8px padding"
      - sm: "32px height, 12px padding"
      - md: "40px height, 16px padding (default)"
      - lg: "48px height, 20px padding"

    states:
      - default: "Normal interactive state"
      - hover: "Slight darkening/lightening"
      - active: "Pressed state"
      - disabled: "Reduced opacity, no interaction"
      - loading: "Spinner, disabled interaction"

  inputs:
    types:
      - text: "Single-line text input"
      - textarea: "Multi-line text input"
      - number: "Numeric input with steppers"
      - select: "Dropdown selection"
      - multiselect: "Multiple selection with chips"
      - date: "Date picker"
      - time: "Time picker"
      - datetime: "Combined date and time"
      - file: "File upload with drag-drop"
      - checkbox: "Boolean selection"
      - radio: "Single selection from group"
      - switch: "Toggle on/off"

    validation:
      - required: "Red asterisk, error on submit if empty"
      - pattern: "Real-time validation with regex"
      - custom: "API validation with debounce"
      - error_display: "Below field, red text, icon"

  cards:
    variants:
      - default: "White background, subtle shadow"
      - outlined: "Border, no shadow"
      - elevated: "Larger shadow for hierarchy"

    sections:
      - header: "Title, optional actions"
      - body: "Main content"
      - footer: "Actions, metadata"

  tables:
    features:
      - sorting: "Click column headers"
      - filtering: "Per-column filters"
      - pagination: "10, 20, 50, 100 rows"
      - row_selection: "Checkbox, bulk actions"
      - row_actions: "Dropdown menu per row"
      - expandable_rows: "Show/hide details"
      - sticky_header: "Fixed on scroll"
      - responsive: "Horizontal scroll on mobile"

  modals:
    sizes:
      - sm: "400px width"
      - md: "600px width (default)"
      - lg: "800px width"
      - xl: "1200px width"
      - fullscreen: "100% viewport"

    structure:
      - backdrop: "Semi-transparent overlay"
      - header: "Title, close button"
      - body: "Content, forms"
      - footer: "Action buttons (right-aligned)"

  navigation:
    patterns:
      - top_nav: "Logo, global search, user menu"
      - side_nav: "Collapsible menu with icons"
      - breadcrumbs: "Current location context"
      - tabs: "Section navigation within page"

  notifications:
    types:
      - toast: "Temporary, auto-dismiss (3-5s)"
      - banner: "Persistent, dismissible"
      - inline: "Contextual to section"

    severities:
      - info: "Blue, informational updates"
      - success: "Green, confirmation messages"
      - warning: "Orange, cautionary messages"
      - error: "Red, error messages"

  badges:
    use_cases:
      - status: "Work order status, asset status"
      - count: "Notification count, item count"
      - label: "Tags, categories"

  loaders:
    types:
      - spinner: "Small, inline loading"
      - skeleton: "Content placeholder"
      - progress_bar: "Determinate progress"
      - overlay: "Full-screen loading"
```

### 2.3 Component Example: Button

```jsx
// Button component with design system integration
import React from 'react';
import styled from 'styled-components';
import { designTokens } from './designTokens';

const StyledButton = styled.button`
  /* Base styles */
  font-family: ${designTokens.typography.fontFamily.primary};
  font-size: ${designTokens.typography.fontSize.base};
  font-weight: ${designTokens.typography.fontWeight.medium};
  border-radius: ${designTokens.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;

  /* Size variants */
  ${props => props.size === 'sm' && `
    padding: ${designTokens.spacing[2]} ${designTokens.spacing[3]};
    height: 32px;
  `}

  ${props => props.size === 'md' && `
    padding: ${designTokens.spacing[3]} ${designTokens.spacing[4]};
    height: 40px;
  `}

  ${props => props.size === 'lg' && `
    padding: ${designTokens.spacing[4]} ${designTokens.spacing[5]};
    height: 48px;
  `}

  /* Variant styles */
  ${props => props.variant === 'primary' && `
    background-color: ${designTokens.colors.primary[500]};
    color: white;

    &:hover:not(:disabled) {
      background-color: ${designTokens.colors.primary[600]};
    }

    &:active {
      background-color: ${designTokens.colors.primary[700]};
    }
  `}

  ${props => props.variant === 'secondary' && `
    background-color: transparent;
    color: ${designTokens.colors.primary[500]};
    border: 1px solid ${designTokens.colors.neutral[300]};

    &:hover:not(:disabled) {
      background-color: ${designTokens.colors.neutral[50]};
    }
  `}

  ${props => props.variant === 'danger' && `
    background-color: ${designTokens.colors.error.main};
    color: white;

    &:hover:not(:disabled) {
      background-color: ${designTokens.colors.error.dark};
    }
  `}

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loading state */
  ${props => props.loading && `
    position: relative;
    color: transparent;

    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      top: 50%;
      left: 50%;
      margin-left: -8px;
      margin-top: -8px;
      border: 2px solid white;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}
`;

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      loading={loading}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledButton>
  );
};
```

---

## 3. User Onboarding

### 3.1 Onboarding Flow

```yaml
onboarding_stages:
  stage_1_welcome:
    title: "Welcome to dCMMS"
    duration: "30 seconds"
    content:
      - "Brief intro video (30s)"
      - "Key benefits: real-time monitoring, work order management, compliance tracking"
      - "Role-specific customization message"

  stage_2_profile_setup:
    title: "Complete Your Profile"
    duration: "2 minutes"
    steps:
      - upload_photo: "Optional profile photo"
      - contact_info: "Phone number for SMS alerts"
      - notification_preferences: "Email, SMS, push notification settings"
      - timezone: "Auto-detected, confirm or change"

  stage_3_site_selection:
    title: "Select Your Sites"
    duration: "1 minute"
    content:
      - "List of assigned sites"
      - "Set default site for quick access"
      - "Bookmark frequently accessed assets"

  stage_4_guided_tour:
    title: "Interactive Product Tour"
    duration: "5-10 minutes"
    tours:
      field_technician:
        steps:
          - dashboard: "Your work orders and recent alerts"
          - mobile_app: "Download mobile app for offline access"
          - work_order_detail: "View work order, add notes, upload photos"
          - submit_work_order: "Mark work order as completed"
          - safety_checklist: "Complete safety checklist before starting work"

      operations_manager:
        steps:
          - dashboard: "Real-time KPIs and site overview"
          - work_order_queue: "Assign and prioritize work orders"
          - alerts: "Review and acknowledge critical alerts"
          - reports: "Access daily production reports"
          - schedule: "View team schedules and on-call rotation"

      asset_owner:
        steps:
          - portfolio_dashboard: "Multi-site generation overview"
          - financial_reports: "Revenue and OPEX summaries"
          - compliance_status: "Regulatory reporting status"
          - performance_analysis: "PR trends and underperformance investigation"

  stage_5_first_task:
    title: "Complete Your First Task"
    content:
      - "Guided task based on role (e.g., acknowledge an alert, review a work order)"
      - "Celebration animation on completion"
      - "Badge awarded: 'First Task Complete'"
```

### 3.2 Progressive Disclosure

```javascript
// Contextual onboarding hints
const onboardingHints = {
  work_order_creation: {
    trigger: "user_creates_first_work_order",
    hints: [
      {
        element: "#priority-select",
        message: "Set priority based on urgency. High priority work orders appear at the top of the queue.",
        position: "right"
      },
      {
        element: "#asset-select",
        message: "Link this work order to an asset to track maintenance history.",
        position: "bottom"
      },
      {
        element: "#attachment-upload",
        message: "Attach photos, diagrams, or documents to provide context for technicians.",
        position: "left"
      }
    ]
  },

  alert_acknowledgment: {
    trigger: "user_views_alert_for_first_time",
    hints: [
      {
        element: "#acknowledge-button",
        message: "Acknowledge this alert to stop escalation and notify your team you're handling it.",
        position: "top"
      },
      {
        element: "#create-wo-button",
        message: "Create a work order directly from this alert to track resolution.",
        position: "top"
      }
    ]
  },

  report_builder: {
    trigger: "user_opens_report_builder",
    hints: [
      {
        element: "#data-sources",
        message: "Drag fields from data sources to build your custom report.",
        position: "right"
      },
      {
        element: "#filters",
        message: "Add filters to narrow down your data (e.g., specific site, date range).",
        position: "right"
      },
      {
        element: "#visualization",
        message: "Choose how to visualize your data: table, chart, or both.",
        position: "left"
      }
    ]
  }
};

// Hint display component
class OnboardingHintManager {
  constructor() {
    this.displayedHints = new Set();
    this.loadDisplayedHints();
  }

  async loadDisplayedHints() {
    const hints = await localStorage.getItem('displayedHints');
    this.displayedHints = new Set(JSON.parse(hints || '[]'));
  }

  shouldShowHint(hintId, userId) {
    const key = `${userId}:${hintId}`;
    return !this.displayedHints.has(key);
  }

  async showHint(hintId, userId, hint) {
    if (!this.shouldShowHint(hintId, userId)) return;

    // Show tooltip
    const tooltip = new Tooltip({
      target: document.querySelector(hint.element),
      content: hint.message,
      position: hint.position,
      actions: [
        {
          label: 'Got it',
          onClick: () => {
            this.markHintAsDisplayed(hintId, userId);
            tooltip.hide();
          }
        },
        {
          label: "Don't show again",
          onClick: () => {
            this.markHintAsDisplayed(hintId, userId);
            this.disableHintsForUser(userId);
            tooltip.hide();
          }
        }
      ]
    });

    tooltip.show();
  }

  markHintAsDisplayed(hintId, userId) {
    const key = `${userId}:${hintId}`;
    this.displayedHints.add(key);
    localStorage.setItem('displayedHints', JSON.stringify([...this.displayedHints]));
  }
}
```

---

## 4. Training Materials

### 4.1 Training Module Structure

```yaml
training_modules:
  getting_started:
    target_roles: ["all"]
    duration: "30 minutes"
    format: ["video", "interactive"]
    lessons:
      - introduction: "dCMMS overview and key features"
      - navigation: "Navigating the interface"
      - profile_setup: "Customizing your profile and preferences"
      - mobile_app: "Installing and using the mobile app"

  work_order_management:
    target_roles: ["field_technician", "site_supervisor", "operations_manager"]
    duration: "45 minutes"
    format: ["video", "hands-on"]
    lessons:
      - creating_work_orders: "Creating and scheduling work orders"
      - assignment: "Assigning work orders to team members"
      - execution: "Completing work orders and uploading documentation"
      - closure: "Reviewing and closing work orders"
      - reporting: "Work order analytics and KPIs"

  asset_management:
    target_roles: ["asset_manager", "operations_manager"]
    duration: "1 hour"
    format: ["video", "hands-on"]
    lessons:
      - asset_hierarchy: "Understanding asset hierarchy and relationships"
      - maintenance_schedules: "Creating preventive maintenance schedules"
      - condition_monitoring: "Setting up condition-based monitoring"
      - lifecycle_management: "Asset lifecycle and replacement planning"
      - performance_analysis: "Analyzing asset performance and identifying issues"

  inventory_management:
    target_roles: ["inventory_manager", "site_supervisor"]
    duration: "45 minutes"
    format: ["video", "hands-on"]
    lessons:
      - stock_management: "Managing stock levels and reorder points"
      - consumption_tracking: "Tracking part consumption against work orders"
      - procurement: "Creating purchase requests and managing suppliers"
      - audits: "Conducting inventory audits"

  alerting_and_notifications:
    target_roles: ["operations_manager", "site_manager"]
    duration: "30 minutes"
    format: ["video", "interactive"]
    lessons:
      - alert_rules: "Creating and configuring alert rules"
      - escalation: "Setting up escalation chains and on-call schedules"
      - acknowledgment: "Acknowledging and resolving alerts"
      - analytics: "Analyzing alert trends and patterns"

  reporting_and_analytics:
    target_roles: ["operations_manager", "data_analyst", "asset_owner"]
    duration: "1 hour"
    format: ["video", "hands-on"]
    lessons:
      - pre_built_reports: "Using pre-built report templates"
      - custom_reports: "Building custom reports with report builder"
      - dashboards: "Creating personalized dashboards"
      - scheduling: "Scheduling automated report delivery"
      - exporting: "Exporting data in various formats"

  compliance_and_regulatory:
    target_roles: ["compliance_officer", "operations_manager"]
    duration: "1 hour"
    format: ["video", "documentation"]
    lessons:
      - frameworks: "Understanding applicable regulatory frameworks (NERC, OSHA, CEA)"
      - automated_reporting: "Configuring automated compliance workflows"
      - submissions: "Submitting compliance reports to regulatory portals"
      - audit_trails: "Accessing and exporting audit logs"

  mobile_app_advanced:
    target_roles: ["field_technician", "site_supervisor"]
    duration: "30 minutes"
    format: ["video", "hands-on"]
    lessons:
      - offline_mode: "Working offline and syncing data"
      - barcode_scanning: "Scanning asset barcodes for quick access"
      - photo_annotations: "Taking and annotating photos"
      - safety_checklists: "Completing digital safety checklists"

  admin_and_configuration:
    target_roles: ["system_admin", "tenant_admin"]
    duration: "2 hours"
    format: ["video", "documentation"]
    lessons:
      - user_management: "Creating users, roles, and permissions"
      - site_configuration: "Setting up sites, assets, and hierarchies"
      - integrations: "Configuring ERP, IdP, and MDM integrations"
      - data_import: "Bulk importing assets and work orders"
      - backup_and_recovery: "Backup procedures and disaster recovery"
```

### 4.2 Training Delivery Methods

```yaml
delivery_methods:
  video_library:
    platform: "Vimeo / YouTube unlisted"
    features:
      - chapters: "Timestamped sections for easy navigation"
      - subtitles: "English, Spanish, Portuguese, Hindi"
      - playback_speed: "0.5x, 1x, 1.5x, 2x"
      - transcripts: "Searchable text transcripts"
    storage: "s3://dcmms-training-videos/"

  interactive_tutorials:
    platform: "In-app guided tours (Intro.js, Shepherd.js)"
    features:
      - step_by_step: "Highlight elements, provide instructions"
      - hands_on: "User performs actions in sandbox environment"
      - progress_tracking: "Track completion per user"
      - quizzes: "Knowledge checks at end of each module"

  documentation:
    platform: "Knowledge base (Confluence, GitBook)"
    structure:
      - user_guides: "Step-by-step instructions with screenshots"
      - faq: "Common questions and answers"
      - troubleshooting: "Error messages and resolutions"
      - release_notes: "What's new in each release"
      - api_docs: "Technical documentation for integrations"

  live_training:
    platform: "Zoom / Microsoft Teams"
    schedule:
      - weekly_webinars: "New feature demos and Q&A"
      - onboarding_sessions: "Live onboarding for new tenants"
      - office_hours: "Drop-in support sessions"
    recording: "All sessions recorded and added to library"

  certification:
    levels:
      - basic: "Complete Getting Started + role-specific module"
      - advanced: "Complete all modules + pass assessment"
      - admin: "Complete admin module + practical exam"
    benefits:
      - badge: "Display certification badge in profile"
      - priority_support: "Access to dedicated support channel"
```

### 4.3 Training Progress Tracking

```javascript
class TrainingProgressTracker {
  async trackModuleCompletion(userId, moduleId, lessonId) {
    const progress = await db.trainingProgress.findOne({ userId, moduleId });

    if (!progress) {
      // First lesson in module
      await db.trainingProgress.insert({
        userId,
        moduleId,
        startedAt: new Date(),
        completedLessons: [lessonId],
        status: 'in_progress',
        progress: this.calculateProgress(moduleId, [lessonId])
      });
    } else {
      // Add lesson to completed list
      const completedLessons = [...progress.completedLessons, lessonId];
      const moduleProgress = this.calculateProgress(moduleId, completedLessons);

      await db.trainingProgress.update(
        { userId, moduleId },
        {
          completedLessons,
          progress: moduleProgress,
          status: moduleProgress === 100 ? 'completed' : 'in_progress',
          completedAt: moduleProgress === 100 ? new Date() : null
        }
      );

      // Award badge if module completed
      if (moduleProgress === 100) {
        await this.awardBadge(userId, moduleId);
      }
    }
  }

  calculateProgress(moduleId, completedLessons) {
    const module = trainingModules[moduleId];
    const totalLessons = Object.keys(module.lessons).length;
    return (completedLessons.length / totalLessons) * 100;
  }

  async awardBadge(userId, moduleId) {
    await db.userBadges.insert({
      userId,
      badgeId: `badge_${moduleId}`,
      badgeName: `${trainingModules[moduleId].title} Certified`,
      awardedAt: new Date()
    });

    // Notify user
    await notificationService.send({
      userId,
      templateId: 'TPL-BADGE-AWARDED',
      context: { badgeName: `${trainingModules[moduleId].title} Certified` }
    });
  }
}
```

---

## 5. Help System

### 5.1 Contextual Help

```javascript
// Contextual help tooltips
const helpContent = {
  work_order_priority: {
    title: "Work Order Priority",
    content: "Priority determines the order in which work orders appear in queues.\n\n" +
             "• Emergency: Safety hazards, grid compliance issues (response within 1 hour)\n" +
             "• High: Equipment failures affecting generation (response within 4 hours)\n" +
             "• Medium: Degraded performance, non-critical faults (response within 24 hours)\n" +
             "• Low: Preventive maintenance, inspections (scheduled)",
    relatedLinks: [
      { label: "Work Order Management Guide", url: "/help/work-orders" },
      { label: "SLA Definitions", url: "/help/sla" }
    ]
  },

  performance_ratio: {
    title: "Performance Ratio (PR)",
    content: "Performance Ratio is the ratio of actual generation to expected generation, " +
             "accounting for irradiation and temperature.\n\n" +
             "PR = (Actual Generation / Expected Generation) × 100%\n\n" +
             "Typical values:\n" +
             "• Excellent: > 85%\n" +
             "• Good: 80-85%\n" +
             "• Fair: 75-80%\n" +
             "• Poor: < 75% (investigation required)",
    formula: "PR = (E_ac / E_expected) × 100",
    relatedLinks: [
      { label: "Performance Analysis Guide", url: "/help/performance" },
      { label: "Troubleshooting Low PR", url: "/help/troubleshooting/low-pr" }
    ]
  },

  alert_escalation: {
    title: "Alert Escalation",
    content: "Escalation automatically notifies higher-level staff if an alert is not acknowledged " +
             "within a specified timeframe.\n\n" +
             "Example escalation chain:\n" +
             "• Level 1 (0 min): Field technician (push + SMS)\n" +
             "• Level 2 (15 min): Site supervisor (push + SMS + voice)\n" +
             "• Level 3 (45 min): Operations manager + OEM (all channels)\n\n" +
             "Acknowledge alerts promptly to prevent unnecessary escalations.",
    relatedLinks: [
      { label: "Escalation Configuration", url: "/help/alerts/escalation" },
      { label: "On-Call Schedules", url: "/help/on-call" }
    ]
  }
};

// Help icon component
const HelpIcon = ({ contentKey }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const help = helpContent[contentKey];

  return (
    <Tooltip
      content={
        <div style={{ maxWidth: '400px' }}>
          <h4>{help.title}</h4>
          <p style={{ whiteSpace: 'pre-line' }}>{help.content}</p>
          {help.formula && (
            <code style={{ display: 'block', padding: '8px', background: '#f5f5f5', margin: '8px 0' }}>
              {help.formula}
            </code>
          )}
          {help.relatedLinks && (
            <div style={{ marginTop: '12px' }}>
              <strong>Related:</strong>
              <ul>
                {help.relatedLinks.map(link => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
      position="top"
    >
      <Icon name="help-circle" size={16} color="#757575" />
    </Tooltip>
  );
};
```

### 5.2 In-App Search

```javascript
class HelpSearchEngine {
  constructor() {
    this.index = null;
    this.buildSearchIndex();
  }

  async buildSearchIndex() {
    const lunr = require('lunr');

    // Index all help articles
    const articles = await this.fetchAllHelpArticles();

    this.index = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('content');
      this.field('tags', { boost: 5 });
      this.ref('id');

      articles.forEach(article => {
        this.add(article);
      });
    });
  }

  search(query) {
    const results = this.index.search(query);

    return results.map(result => ({
      ...this.getArticle(result.ref),
      score: result.score
    }));
  }

  async fetchAllHelpArticles() {
    return [
      {
        id: 'work-orders-101',
        title: 'Work Order Management Basics',
        content: 'Learn how to create, assign, and complete work orders...',
        tags: ['work orders', 'basics', 'getting started'],
        url: '/help/work-orders-101'
      },
      {
        id: 'offline-sync',
        title: 'Mobile Offline Sync Troubleshooting',
        content: 'If your mobile app is not syncing, try these steps...',
        tags: ['mobile', 'offline', 'troubleshooting', 'sync'],
        url: '/help/offline-sync'
      },
      // ... more articles
    ];
  }
}

// Help search component
const HelpSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const searchEngine = new HelpSearchEngine();

  const handleSearch = (q) => {
    setQuery(q);
    if (q.length >= 3) {
      const searchResults = searchEngine.search(q);
      setResults(searchResults.slice(0, 5)); // Top 5 results
    } else {
      setResults([]);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search help articles..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {results.length > 0 && (
        <ul>
          {results.map(result => (
            <li key={result.id}>
              <a href={result.url}>{result.title}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## 6. Accessibility

### 6.1 WCAG 2.1 AA Compliance

```yaml
accessibility_requirements:
  perceivable:
    text_alternatives:
      - all_images: "Provide alt text for all images"
      - icons: "Use aria-label for icon-only buttons"
      - charts: "Provide data tables as alternative to charts"

    adaptable:
      - semantic_html: "Use proper HTML5 semantic elements (header, nav, main, aside, footer)"
      - heading_hierarchy: "Logical heading structure (h1 → h2 → h3)"
      - reading_order: "Meaningful sequence when navigating with screen reader"

    distinguishable:
      - color_contrast: "Minimum 4.5:1 for normal text, 3:1 for large text"
      - resize_text: "Support up to 200% zoom without loss of functionality"
      - color_not_only: "Don't rely on color alone to convey information"
      - audio_control: "Provide controls for any audio that plays automatically"

  operable:
    keyboard_accessible:
      - keyboard_navigation: "All functionality available via keyboard"
      - focus_visible: "Clear visual focus indicator (2px solid outline)"
      - no_keyboard_trap: "Users can navigate away from any element"
      - shortcuts: "Provide keyboard shortcuts for common actions"

    enough_time:
      - adjustable: "Provide option to extend session timeout"
      - pause_animations: "Allow users to pause auto-updating content"

    navigable:
      - skip_links: "Skip to main content link at top of page"
      - page_titles: "Descriptive, unique page titles"
      - focus_order: "Logical focus order matching visual layout"
      - link_purpose: "Clear link text (avoid 'click here')"

  understandable:
    readable:
      - language: "Specify language of page (<html lang='en'>)"
      - labels: "Clear, descriptive form labels"
      - error_identification: "Clearly identify input errors"

    predictable:
      - on_focus: "No context change on focus"
      - on_input: "No context change on input (unless warned)"
      - consistent_navigation: "Navigation in same order on all pages"

  robust:
    compatible:
      - valid_html: "Use valid, well-formed HTML"
      - aria_attributes: "Proper use of ARIA landmarks and roles"
      - status_messages: "Use aria-live for dynamic content updates"
```

### 6.2 Accessibility Implementation

```jsx
// Accessible form component
const AccessibleForm = () => {
  const [errors, setErrors] = useState({});

  return (
    <form onSubmit={handleSubmit} aria-labelledby="form-title">
      <h2 id="form-title">Create Work Order</h2>

      {/* Text input with proper labeling */}
      <div className="form-group">
        <label htmlFor="wo-title">
          Work Order Title <span aria-label="required">*</span>
        </label>
        <input
          id="wo-title"
          type="text"
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && (
          <span id="title-error" role="alert" className="error">
            {errors.title}
          </span>
        )}
      </div>

      {/* Select with proper labeling */}
      <div className="form-group">
        <label htmlFor="wo-priority">Priority</label>
        <select id="wo-priority" aria-required="true">
          <option value="">Select priority</option>
          <option value="emergency">Emergency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Accessible button */}
      <button
        type="submit"
        aria-label="Submit work order"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Submitting...</span>
          </>
        ) : (
          'Submit Work Order'
        )}
      </button>
    </form>
  );
};

// Accessible data table
const AccessibleTable = ({ data, columns }) => {
  return (
    <table role="table" aria-label="Work Orders">
      <caption>List of work orders for Site AZ-001</caption>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} scope="col" aria-sort={col.sortDirection}>
              {col.label}
              {col.sortable && (
                <button
                  aria-label={`Sort by ${col.label}`}
                  onClick={() => handleSort(col.key)}
                >
                  <Icon name="sort" aria-hidden="true" />
                </button>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={row.id}>
            {columns.map(col => (
              <td key={col.key}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Live region for dynamic updates
const LiveRegion = ({ message, type = 'polite' }) => {
  return (
    <div
      role="status"
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};
```

---

## 7. Responsive Design

### 7.1 Breakpoint Strategy

```css
/* Mobile-first responsive design */

/* Extra small devices (phones, < 640px) */
@media (max-width: 639px) {
  .sidebar {
    display: none; /* Hide sidebar on mobile */
  }

  .mobile-nav {
    display: block; /* Show bottom navigation */
  }

  .table {
    display: block;
    overflow-x: auto; /* Horizontal scroll for tables */
  }

  .card {
    margin: 0 -16px; /* Full-width cards on mobile */
    border-radius: 0;
  }
}

/* Small devices (tablets, 640px - 767px) */
@media (min-width: 640px) and (max-width: 767px) {
  .sidebar {
    width: 60px; /* Collapsed sidebar */
  }

  .main-content {
    margin-left: 60px;
  }
}

/* Medium devices (tablets, 768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar {
    width: 200px;
  }

  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr); /* 2-column layout */
  }
}

/* Large devices (desktops, 1024px and up) */
@media (min-width: 1024px) {
  .sidebar {
    width: 250px; /* Full sidebar */
  }

  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr); /* 3-column layout */
  }
}

/* Extra large devices (large desktops, 1280px and up) */
@media (min-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr); /* 4-column layout */
  }
}
```

### 7.2 Touch Optimization

```yaml
touch_targets:
  minimum_size: "44x44px (iOS HIG, Android Material Design)"
  spacing: "8px minimum between targets"
  feedback: "Visual feedback on tap (ripple effect, color change)"

  examples:
    buttons: "48px height, full-width on mobile"
    checkboxes: "24px visible, 44px tap target (with padding)"
    list_items: "56px minimum height for tappable rows"
    tabs: "48px height, min 90px width"

gestures:
  swipe:
    - "Swipe left on list item to reveal actions (archive, delete)"
    - "Swipe to navigate between tabs"
    - "Pull-to-refresh for data updates"

  pinch:
    - "Pinch to zoom on charts and images"

  long_press:
    - "Long press on item to enter selection mode"
    - "Long press on map to drop pin"

offline_indicators:
  - "Clear visual indicator when offline (banner at top)"
  - "Disable actions that require connectivity"
  - "Queue actions for sync when online"
  - "Show sync status (syncing, synced, pending)"
```

---

## 8. User Personas

### 8.1 Persona Definitions

```yaml
personas:
  field_technician:
    name: "Carlos Rodriguez"
    age: 28
    role: "Solar Technician"
    experience: "3 years in solar O&M"
    technical_skill: "Medium"
    primary_device: "Mobile (90%), Desktop (10%)"

    goals:
      - "Complete work orders efficiently"
      - "Access equipment manuals in the field"
      - "Document work with photos and notes"
      - "Avoid safety incidents"

    pain_points:
      - "Poor cellular coverage at remote sites"
      - "Difficulty finding equipment history"
      - "Time-consuming paperwork"
      - "Unclear work instructions"

    usage_patterns:
      - "Checks work orders in morning"
      - "Uses mobile app offline throughout day"
      - "Syncs data at end of shift"
      - "Prefers voice-to-text for notes"

  operations_manager:
    name: "Jennifer Chen"
    age: 42
    role: "Operations Manager"
    experience: "15 years in renewable energy"
    technical_skill: "High"
    primary_device: "Desktop (70%), Mobile (30%)"

    goals:
      - "Maximize fleet availability and performance"
      - "Minimize operational costs"
      - "Ensure regulatory compliance"
      - "Provide data-driven insights to stakeholders"

    pain_points:
      - "Data scattered across multiple systems"
      - "Manual report generation time-consuming"
      - "Difficulty identifying underperforming assets"
      - "Alert fatigue from non-critical notifications"

    usage_patterns:
      - "Reviews daily dashboard at 8 AM"
      - "Triages critical alerts throughout day"
      - "Generates weekly reports on Friday"
      - "Uses mobile for after-hours critical alerts"

  asset_owner:
    name: "David Kim"
    age: 55
    role: "Portfolio Manager"
    experience: "20 years in energy finance"
    technical_skill: "Low"
    primary_device: "Desktop (80%), Tablet (20%)"

    goals:
      - "Track portfolio performance and revenue"
      - "Ensure compliance with PPA obligations"
      - "Identify opportunities for optimization"
      - "Report to investors and stakeholders"

    pain_points:
      - "Too much technical detail, need high-level view"
      - "Difficulty comparing performance across sites"
      - "Manual compilation of investor reports"
      - "Uncertainty about regulatory compliance status"

    usage_patterns:
      - "Reviews monthly performance reports"
      - "Checks compliance dashboard weekly"
      - "Downloads financial reports for board meetings"
      - "Receives email summaries, rarely logs in to platform"
```

### 8.2 User Journey Maps

```yaml
field_technician_journey:
  scenario: "Complete preventive maintenance work order"

  stages:
    receive_assignment:
      actions:
        - "Open mobile app"
        - "Review assigned work orders"
        - "Check work order details and location"
      thoughts: "What equipment am I working on? Do I have the right parts?"
      emotions: "Neutral"
      pain_points:
        - "Unclear work order description"
      opportunities:
        - "Auto-populate required parts based on work order type"

    prepare:
      actions:
        - "Download equipment manual"
        - "Check inventory for required parts"
        - "Review safety checklist"
      thoughts: "Do I have everything I need? What are the safety hazards?"
      emotions: "Focused"
      pain_points:
        - "Manual not available offline"
        - "Parts not in inventory"
      opportunities:
        - "Offline manual download"
        - "Reorder notification for low-stock parts"

    travel:
      actions:
        - "Navigate to site using GPS"
        - "Check in at gate"
      thoughts: "How long will this take? What's the traffic like?"
      emotions: "Neutral"
      pain_points:
        - "Poor GPS directions to remote sites"
      opportunities:
        - "Integrate with preferred navigation app"

    execute:
      actions:
        - "Complete safety checklist"
        - "Perform maintenance tasks"
        - "Take photos of work"
        - "Add notes and observations"
      thoughts: "Am I following the procedure correctly? Did I document everything?"
      emotions: "Focused, sometimes frustrated"
      pain_points:
        - "Difficult to type notes with gloves on"
        - "Forgot to take photo before starting work"
      opportunities:
        - "Voice-to-text for notes"
        - "Photo prompts at each step"

    complete:
      actions:
        - "Mark work order complete"
        - "Submit for review"
      thoughts: "Did I fill out everything correctly? Will this be approved?"
      emotions: "Relieved"
      pain_points:
        - "Work order rejected due to missing info"
      opportunities:
        - "Validation before submission"
        - "Required field indicators"

    sync:
      actions:
        - "Return to truck/office"
        - "Sync mobile app"
      thoughts: "Did everything sync correctly?"
      emotions: "Anxious"
      pain_points:
        - "Sync failures, lost data"
      opportunities:
        - "Clear sync status, conflict resolution UI"
```

---

## 9. Usability Testing

### 9.1 Testing Framework

```yaml
testing_types:
  moderated_usability_testing:
    frequency: "Quarterly"
    participants: "5-8 users per persona"
    duration: "60 minutes per session"
    format: "Remote (Zoom + screen share)"
    tasks:
      - "Create a high-priority work order"
      - "Assign work order to technician"
      - "Complete work order on mobile app"
      - "Generate monthly availability report"
      - "Configure alert escalation chain"
    metrics:
      - task_completion_rate: "% of users who complete task successfully"
      - time_on_task: "Average time to complete task"
      - error_rate: "Number of errors per task"
      - satisfaction: "Post-task satisfaction rating (1-5)"

  unmoderated_remote_testing:
    frequency: "Monthly"
    participants: "15-20 users"
    platform: "UserTesting.com, Maze"
    scenarios:
      - "First-time user onboarding"
      - "Mobile app offline workflow"
      - "Report builder usability"

  a_b_testing:
    frequency: "Ongoing"
    platform: "Optimizely, Google Optimize"
    tests:
      - dashboard_layout: "Widget grid vs list view"
      - cta_button_text: "'Submit' vs 'Create Work Order'"
      - navigation: "Top nav vs side nav"
    success_metric: "Conversion rate, time to complete task"

  accessibility_testing:
    frequency: "Every release"
    tools:
      - automated: "axe DevTools, WAVE, Lighthouse"
      - manual: "Screen reader testing (JAWS, NVDA, VoiceOver)"
      - user_testing: "Test with users with disabilities"

  performance_testing:
    frequency: "Every release"
    metrics:
      - page_load_time: "< 2 seconds (desktop), < 3 seconds (mobile)"
      - time_to_interactive: "< 3 seconds"
      - first_contentful_paint: "< 1 second"
    tools: "Lighthouse, WebPageTest, Chrome DevTools"
```

### 9.2 Feedback Collection

```javascript
// In-app feedback widget
const FeedbackWidget = () => {
  const [showWidget, setShowWidget] = useState(false);
  const [feedback, setFeedback] = useState({
    type: 'bug', // bug, feature, improvement
    message: '',
    screenshot: null
  });

  const captureSreenshot = async () => {
    const html2canvas = await import('html2canvas');
    const canvas = await html2canvas.default(document.body);
    return canvas.toDataURL();
  };

  const submitFeedback = async () => {
    const screenshot = await captureScreenshot();

    await api.post('/feedback', {
      ...feedback,
      screenshot,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userId: currentUser.userId,
      timestamp: new Date()
    });

    // Show thank you message
    showToast('Thank you for your feedback!');
    setShowWidget(false);
  };

  return (
    <>
      {/* Floating feedback button */}
      <button
        className="feedback-button"
        onClick={() => setShowWidget(true)}
        aria-label="Provide feedback"
      >
        <Icon name="message-circle" />
      </button>

      {/* Feedback modal */}
      {showWidget && (
        <Modal onClose={() => setShowWidget(false)}>
          <h3>Send Feedback</h3>

          <div className="feedback-type">
            <label>
              <input
                type="radio"
                value="bug"
                checked={feedback.type === 'bug'}
                onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
              />
              Report a Bug
            </label>
            <label>
              <input
                type="radio"
                value="feature"
                checked={feedback.type === 'feature'}
                onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
              />
              Request a Feature
            </label>
            <label>
              <input
                type="radio"
                value="improvement"
                checked={feedback.type === 'improvement'}
                onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
              />
              Suggest Improvement
            </label>
          </div>

          <textarea
            placeholder="Describe your feedback..."
            value={feedback.message}
            onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
            rows={5}
          />

          <div className="actions">
            <button onClick={submitFeedback}>Submit Feedback</button>
            <button onClick={() => setShowWidget(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
};
```

---

## Summary

This specification provides comprehensive UX design system and training for dCMMS:

1. **Design system** with design tokens, component library, and consistent patterns
2. **User onboarding** with guided tours, progressive disclosure, and first-task completion
3. **Training materials** with role-specific modules, videos, interactive tutorials, and certification
4. **Help system** with contextual tooltips, searchable knowledge base, and in-app search
5. **Accessibility** with WCAG 2.1 AA compliance, keyboard navigation, and screen reader support
6. **Responsive design** with mobile-first approach, touch optimization, and offline indicators
7. **User personas** and journey maps for field technicians, operations managers, and asset owners
8. **Usability testing** framework with moderated testing, A/B testing, and feedback collection

**Lines:** ~1,600
**Status:** Complete
**Next:** Commit and push all P1 specifications
