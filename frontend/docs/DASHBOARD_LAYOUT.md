# Dashboard Layout Implementation

## Overview

The dashboard layout provides a comprehensive, responsive navigation structure for the dCMMS application following the high-fidelity mockup specifications from `docs/design/mockups/02-dashboard.md`.

## Components

### 1. DashboardLayout (`src/components/layout/dashboard-layout.tsx`)

Main layout wrapper component that combines all layout elements.

**Features:**
- Responsive sidebar (desktop: fixed, mobile: sheet overlay)
- Top bar with navigation controls
- Content area with padding
- Mobile hamburger menu support

**Props:**
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  showSearch?: boolean;
  showNewButton?: boolean;
  newButtonText?: string;
  onNewClick?: () => void;
}
```

**Usage:**
```tsx
<DashboardLayout
  title="Dashboard"
  breadcrumbs={[{ label: 'Home' }]}
  showNewButton={true}
  newButtonText="New Work Order"
  onNewClick={() => router.push('/work-orders/new')}
>
  {/* Your page content */}
</DashboardLayout>
```

### 2. Sidebar (`src/components/layout/sidebar.tsx`)

Fixed-width navigation sidebar with user profile section.

**Features:**
- Logo section at top
- Scrollable navigation menu with two groups:
  - Main navigation (Dashboard, Work Orders, Assets, Alerts, Analytics, Reports)
  - Secondary navigation (Settings, Help & Support, Documentation)
- Active route highlighting with blue accent
- Badge support for counts and alerts
- User profile dropdown at bottom
- Smooth transitions and hover states

**Navigation Items:**
- Automatically highlights based on current route
- Supports badge indicators (numerical and destructive variants)
- Icons from lucide-react

**User Profile Section:**
- Avatar with initials
- User name and role
- Dropdown menu with:
  - Profile
  - Settings
  - Sign Out

### 3. TopBar (`src/components/layout/top-bar.tsx`)

Sticky top bar with search, actions, and notifications.

**Features:**
- Page title display
- Breadcrumb navigation
- Global search bar (with ⌘K shortcut indicator)
- "New Work Order" action button
- Notifications bell with badge counter
- Mobile menu button (visible on small screens)

**Responsive Behavior:**
- Desktop (≥768px): Full search bar and action button visible
- Mobile (<768px): Hamburger menu, search and action button hidden

### 4. Breadcrumbs (`src/components/layout/breadcrumbs.tsx`)

Navigation breadcrumb component for showing page hierarchy.

**Features:**
- Linked intermediate items
- Non-linked final item (current page)
- ChevronRight separators
- Hover states on links

**Props:**
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string; // Optional for the last item
}
```

## Responsive Design

### Breakpoints
- **Mobile:** < 768px
- **Tablet:** 768px - 1023px
- **Desktop:** ≥ 1024px (lg breakpoint)

### Mobile Adaptations
- Sidebar hidden by default
- Hamburger menu button in top bar
- Sheet component for mobile sidebar overlay
- Search bar hidden on mobile
- Action button hidden on mobile

### Desktop Layout
- Fixed sidebar (256px width)
- Main content area with left margin
- Full search bar visible
- All action buttons visible

## Color Scheme

Following the design mockups:
- **Sidebar Background:** White (#FFFFFF)
- **Border:** Slate-200 (#E2E8F0)
- **Active Navigation:** Blue-50 background, Blue-600 accent
- **Hover States:** Slate-100 (#F1F5F9)
- **Text Primary:** Slate-900 (#0F172A)
- **Text Secondary:** Slate-600 (#475569)
- **Badge (Default):** Blue-500 (#3B82F6)
- **Badge (Destructive):** Red-500 (#EF4444)

## Accessibility

- Semantic HTML structure
- ARIA labels on icon buttons
- Keyboard navigation support
- Focus visible states
- Screen reader friendly
- Color contrast meets WCAG 2.1 AA standards

## Future Enhancements

- [ ] Dark mode toggle implementation
- [ ] Command palette (⌘K search)
- [ ] Notification dropdown panel
- [ ] User preferences persistence
- [ ] Collapsible sidebar
- [ ] Keyboard shortcuts
- [ ] Site selector (multi-site support)

## Files Created

1. `src/components/layout/dashboard-layout.tsx` - Main layout wrapper
2. `src/components/layout/sidebar.tsx` - Navigation sidebar
3. `src/components/layout/top-bar.tsx` - Top bar with search and actions
4. `src/components/layout/breadcrumbs.tsx` - Breadcrumb navigation

## Dependencies

- shadcn/ui components: dropdown-menu, separator, sheet, scroll-area
- lucide-react icons
- next/link and next/navigation
- Tailwind CSS for styling

## Testing

To test the dashboard layout:

1. Run the development server: `npm run dev`
2. Navigate to `/dashboard`
3. Verify:
   - Sidebar navigation works
   - Active route is highlighted
   - User dropdown menu opens
   - Mobile hamburger menu works
   - Breadcrumbs display correctly
   - Responsive breakpoints work

## Related Documentation

- Design mockups: `docs/design/mockups/02-dashboard.md`
- Component library: `docs/design/component-library.md`
- Sprint 3 tasks: `IMPLEMENTATION_TASK_LIST.md` (DCMMS-028)
