# High-Fidelity UI Mockup Specifications

## Overview

This directory contains comprehensive mockup specifications for all major screens in the dCMMS platform. These specifications are design-system-first, ensuring consistency across the entire application.

## Completed Mockups

### ✅ 01. Authentication Screens
**File:** `01-authentication.md`

Screens:
- Login page with SSO options
- Forgot password flow
- Two-factor authentication (2FA)
- Email/password validation
- Success/error states
- Loading states
- Responsive layouts (mobile, tablet, desktop)
- Dark mode variants
- Accessibility specifications (WCAG AA compliance)

Key Features:
- OAuth2/OIDC integration (Google, Microsoft, Azure AD)
- Custom form validation with inline errors
- Auto-focus and keyboard navigation
- Password visibility toggle
- Remember me functionality
- 30-second countdown for 2FA resend
- Auto-submit on 6-digit OTP completion

### ✅ 02. Dashboard
**File:** `02-dashboard.md`

Components:
- Sidebar navigation (fixed, collapsible)
- Top bar with search and quick actions
- Stats cards (4 KPIs with trend indicators)
- Charts section (time-series data visualization)
- Recent activity feed
- User profile dropdown
- Notifications panel

Layouts:
- Desktop (≥1280px): Full sidebar, 4-column stats grid
- Tablet (768-1279px): Collapsed sidebar (icons only), 2-column stats grid
- Mobile (<768px): Off-canvas sidebar, 1-column stats grid

Key Features:
- Sticky top bar with global search (⌘K shortcut)
- Real-time notification badge
- Multi-site selector (if applicable)
- Keyboard navigation (Tab, Enter, Escape)
- Infinite scroll activity feed
- Customizable time range selectors (7D, 30D, 3M, 1Y)

### ✅ 03. Work Orders
**File:** `03-work-orders.md`

Views:
- Card view (grid layout, default)
- List view (dense, quick scan)
- Table view (data-heavy, sortable)

Features:
- Advanced filtering (slide-out panel)
  * Status multi-select
  * Priority levels
  * Type categories
  * Date range picker with presets
  * Assigned user multi-select
- Sorting (Priority, Due Date, Created Date, Status)
- Bulk selection with actions
- Quick actions (view, edit, more options)
- Pagination (20 items per page)
- Empty state with CTA
- Loading skeletons

Filters:
- Status: Open, In Progress, On Hold, Completed, Cancelled
- Priority: Critical, High, Medium, Low
- Type: Corrective, Preventive, Predictive, Inspection, Emergency
- Date Range: Today, Last 7 days, Last 30 days, This Month, Custom
- Assigned To: Multi-select dropdown with search

Visual Hierarchy:
- Priority color indicators (left border)
- Status badges with icons
- Due date color coding (overdue = red, due soon = orange)
- User avatars with initials
- Work order ID as secondary identifier

## Design Tokens

All mockups reference the centralized design tokens defined in `design-tokens.json`. This ensures:
- **Consistency:** Same colors, spacing, typography across all screens
- **Maintainability:** Update once, apply everywhere
- **Scalability:** Easy to extend with new tokens
- **Accessibility:** WCAG AA contrast ratios enforced
- **Themability:** Dark mode ready

### Token Categories
1. **Colors:** Primary, slate, success, warning, error, info
2. **Typography:** Font families, sizes, weights, line heights, letter spacing
3. **Spacing:** 0-20 scale (4px increments)
4. **Border Radius:** None, sm, base, md, lg, xl, full
5. **Shadows:** xs, sm, base, md, lg, xl, inner, focus
6. **Transitions:** Fast (150ms), base (200ms), slow (300ms)
7. **Z-Index:** Layering hierarchy for overlays
8. **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
9. **Component-specific:** Button heights, input heights, card padding, modal widths, sidebar widths

## Implementation Notes

### Priority Order (Sprint 1)
1. **Authentication Screens** - Entry point, critical for all users
2. **Dashboard** - Main landing page after login
3. **Work Orders** - Core CMMS functionality

### Next Screens (Sprint 2+)
- Work Order Detail/Edit
- Asset List and Detail
- Alert Management
- Settings and User Profile
- Analytics and Reports

### Component Reusability
Many components are shared across screens:
- **Buttons:** Primary, secondary, ghost, link
- **Inputs:** Text, email, password, select, multi-select, date picker
- **Cards:** Stat card, activity card, work order card
- **Badges:** Status, priority, count
- **Avatars:** User profile images with fallback initials
- **Tables:** Sortable columns, pagination, row actions
- **Modals:** Confirmation dialogs, forms
- **Dropdowns:** User menu, action menus, filters
- **Toasts:** Success, error, warning, info notifications

### Accessibility Requirements
All screens must meet:
- **WCAG 2.1 AA Standards**
- **Keyboard Navigation:** All interactive elements accessible via Tab, Enter, Escape
- **Screen Reader Support:** ARIA labels, live regions, semantic HTML
- **Focus Indicators:** Visible 2px outline on focus-visible
- **Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components
- **Touch Targets:** Minimum 44×44px on mobile (48×48px recommended)
- **Motion Respect:** Reduced motion mode for animations

### Responsive Breakpoints
```
Mobile:    < 768px   (single column, touch-optimized)
Tablet:    768-1023px (2 columns, hybrid input)
Desktop:   1024px+    (multi-column, mouse/keyboard)
```

### Dark Mode
All screens have dark mode variants specified. Implementation uses:
- CSS custom properties (CSS variables)
- `prefers-color-scheme` media query
- Manual toggle in user settings

### Performance Targets
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **First Input Delay (FID):** < 100ms

## Using These Specifications

### For Designers
1. Use these specs as a starting point for high-fidelity mockups in Figma/Sketch
2. Follow the design tokens strictly for consistency
3. Create component libraries from shared elements
4. Export assets at 1x, 2x, 3x for various DPIs

### For Developers
1. Implement using Tailwind CSS with custom config (see `tailwind.config.ts`)
2. Use shadcn/ui components as base (modify to match specs)
3. Extract reusable components early (Button, Card, Input, etc.)
4. Test accessibility with automated tools (axe, Lighthouse)
5. Test responsive layouts on real devices
6. Implement loading and error states for all screens

### For QA
1. Verify visual specifications match implementations
2. Test all interactive states (hover, focus, active, disabled)
3. Verify keyboard navigation works correctly
4. Run accessibility audits (WCAG 2.1 AA)
5. Test responsive layouts on various screen sizes
6. Verify dark mode rendering
7. Test with screen readers (NVDA, JAWS, VoiceOver)

## Changelog

### Version 1.0.0 (2025-11-18)
- Initial mockup specifications
- Authentication screens (login, forgot password, 2FA)
- Dashboard with stats, charts, activity feed
- Work Orders list with card/list/table views
- Comprehensive design tokens
- Accessibility guidelines
- Responsive breakpoints
- Dark mode specifications

### Planned Updates
- Work Order Detail/Edit screens
- Asset Management screens
- Alert Management screens
- Settings and Profile screens
- Analytics and Reporting screens
- Mobile app screens (React Native/Flutter variants)
