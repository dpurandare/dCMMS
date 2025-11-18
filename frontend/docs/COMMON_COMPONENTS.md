# Common Components Library

## Overview

Reusable UI components used across the dCMMS application. These components provide consistent patterns for common UI elements like page headers, empty states, loading indicators, error handling, confirmations, and status badges.

## Components

### 1. PageHeader

A standardized page header with title, description, breadcrumbs, and action buttons.

**File:** `src/components/common/page-header.tsx`

**Features:**
- Page title and optional description
- Breadcrumb navigation
- Action buttons area
- Responsive layout

**Usage:**
```tsx
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

<PageHeader
  title="Assets"
  description="Manage your asset inventory"
  breadcrumbs={[
    { label: 'Home', href: '/dashboard' },
    { label: 'Assets' }
  ]}
  actions={
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      New Asset
    </Button>
  }
/>
```

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}
```

---

### 2. EmptyState

A placeholder component for empty lists, tables, or sections.

**File:** `src/components/common/empty-state.tsx`

**Features:**
- Icon display
- Title and description
- Optional action button
- Dashed border styling

**Usage:**
```tsx
import { EmptyState } from '@/components/common';
import { Package } from 'lucide-react';

<EmptyState
  icon={Package}
  title="No assets found"
  description="Get started by creating your first asset"
  action={{
    label: 'Create Asset',
    onClick: () => router.push('/assets/new')
  }}
/>
```

**Props:**
```typescript
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

---

### 3. Loading Skeletons

Skeleton components for different loading states.

**File:** `src/components/common/loading-skeleton.tsx`

#### TableSkeleton
Shows loading state for tables.

```tsx
import { TableSkeleton } from '@/components/common';

<TableSkeleton rows={5} columns={4} showHeader={true} />
```

**Props:**
```typescript
{
  rows?: number;        // Default: 5
  columns?: number;     // Default: 4
  showHeader?: boolean; // Default: true
  className?: string;
}
```

#### CardSkeleton
Shows loading state for cards.

```tsx
import { CardSkeleton } from '@/components/common';

<CardSkeleton count={3} />
```

#### FormSkeleton
Shows loading state for forms.

```tsx
import { FormSkeleton } from '@/components/common';

<FormSkeleton fields={4} />
```

#### ListSkeleton
Shows loading state for lists.

```tsx
import { ListSkeleton } from '@/components/common';

<ListSkeleton items={5} showAvatar={true} />
```

#### StatsCardSkeleton
Shows loading state for stat cards.

```tsx
import { StatsCardSkeleton } from '@/components/common';

<StatsCardSkeleton count={4} />
```

---

### 4. ErrorBoundary

React error boundary component for catching and handling errors gracefully.

**File:** `src/components/common/error-boundary.tsx`

**Features:**
- Catches React component errors
- Custom error UI
- Retry and reload options
- Development mode error details
- Custom error handler callback

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/common';

<ErrorBoundary
  onError={(error, errorInfo) => {
    // Log to error tracking service
    console.error(error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

**With HOC:**
```tsx
import { withErrorBoundary } from '@/components/common';

const SafeComponent = withErrorBoundary(YourComponent, {
  onError: (error, errorInfo) => {
    console.error(error, errorInfo);
  }
});
```

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

---

### 5. ConfirmDialog

Confirmation dialog for destructive or important actions.

**File:** `src/components/common/confirm-dialog.tsx`

**Features:**
- Default and destructive variants
- Loading state support
- Customizable labels
- Warning icon for destructive actions

**Usage:**
```tsx
import { ConfirmDialog } from '@/components/common';
import { useState } from 'react';

const [open, setOpen] = useState(false);

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete Asset"
  description="Are you sure you want to delete this asset? This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={async () => {
    await deleteAsset(id);
  }}
/>
```

**With Hook:**
```tsx
import { useConfirmDialog } from '@/components/common';

const { open, setOpen, loading, confirm } = useConfirmDialog();

<Button onClick={() => setOpen(true)}>Delete</Button>

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete Asset"
  description="Are you sure?"
  variant="destructive"
  onConfirm={() => confirm(async () => {
    await deleteAsset(id);
  })}
  loading={loading}
/>
```

**Props:**
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;     // Default: "Confirm"
  cancelLabel?: string;      // Default: "Cancel"
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}
```

---

### 6. StatusBadge

Status badges for work orders, assets, and priorities.

**File:** `src/components/common/status-badge.tsx`

**Features:**
- Pre-configured colors for common statuses
- Work order status support
- Asset status support
- Priority badge support
- Custom status fallback

#### Work Order Status

```tsx
import { WorkOrderStatusBadge } from '@/components/common';

<WorkOrderStatusBadge status="in_progress" />
```

**Statuses:**
- `draft` - Gray
- `scheduled` - Blue
- `assigned` - Cyan
- `in_progress` - Yellow
- `on_hold` - Orange
- `completed` - Green
- `closed` - Slate
- `cancelled` - Red

#### Asset Status

```tsx
import { AssetStatusBadge } from '@/components/common';

<AssetStatusBadge status="operational" />
```

**Statuses:**
- `operational` - Green
- `maintenance` - Yellow
- `failed` - Red
- `offline` - Slate
- `decommissioned` - Gray

#### Priority Badge

```tsx
import { PriorityBadge } from '@/components/common';

<PriorityBadge priority="critical" />
```

**Priorities:**
- `critical` - Red background, white text
- `high` - Orange background, white text
- `medium` - Yellow background, white text
- `low` - Gray background, white text

#### Generic Status Badge

```tsx
import { StatusBadge } from '@/components/common';

<StatusBadge status="custom_status" type="custom" />
```

---

## Design Patterns

### Consistent Spacing
All components use Tailwind's spacing scale for consistency:
- Margins: `mb-6` (24px) for major sections
- Gaps: `gap-4` (16px) for component spacing
- Padding: `p-4`, `p-6` for card/dialog interiors

### Color Scheme
Following the dCMMS design system:
- **Success:** Green-100 bg, Green-700 text
- **Warning:** Yellow-100 bg, Yellow-700 text
- **Error:** Red-100 bg, Red-700 text
- **Info:** Blue-100 bg, Blue-700 text
- **Neutral:** Slate-100 bg, Slate-700 text

### Responsive Design
Components are mobile-first and responsive:
- Stack vertically on mobile
- Flex layout on tablet/desktop
- Responsive text sizes

## Accessibility

All components follow WCAG 2.1 AA standards:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus visible states
- Sufficient color contrast (4.5:1 minimum)

## Usage Examples

### Complete Page Example

```tsx
import {
  PageHeader,
  EmptyState,
  TableSkeleton,
  ErrorBoundary,
  ConfirmDialog,
  StatusBadge,
} from '@/components/common';

export default function AssetsPage() {
  const [deleteDialog, setDeleteDialog] = useState(false);
  const { data, isLoading, error } = useAssets();

  return (
    <ErrorBoundary>
      <DashboardLayout title="Assets">
        <PageHeader
          title="Assets"
          description="Manage your asset inventory"
          breadcrumbs={[
            { label: 'Home', href: '/dashboard' },
            { label: 'Assets' }
          ]}
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Button>
          }
        />

        {isLoading && <TableSkeleton rows={5} columns={5} />}

        {!isLoading && data.length === 0 && (
          <EmptyState
            icon={Package}
            title="No assets found"
            description="Get started by creating your first asset"
          />
        )}

        {!isLoading && data.length > 0 && (
          <div>
            {data.map((asset) => (
              <div key={asset.id}>
                <StatusBadge status={asset.status} type="asset" />
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          title="Delete Asset"
          description="Are you sure?"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </DashboardLayout>
    </ErrorBoundary>
  );
}
```

## Files Created

1. `src/components/common/page-header.tsx`
2. `src/components/common/empty-state.tsx`
3. `src/components/common/loading-skeleton.tsx`
4. `src/components/common/error-boundary.tsx`
5. `src/components/common/confirm-dialog.tsx`
6. `src/components/common/status-badge.tsx`
7. `src/components/common/index.ts` (barrel export)

## Dependencies

- shadcn/ui: dialog, card, button, badge, skeleton
- lucide-react: icons
- Tailwind CSS: styling
- React: core library

## Testing

To test the components:

```bash
npm run dev
```

Visit the Storybook (if configured) or create test pages for each component.

## Related Documentation

- Design System: `docs/design/component-library.md`
- Dashboard Layout: `frontend/docs/DASHBOARD_LAYOUT.md`
- Sprint 3 Tasks: `IMPLEMENTATION_TASK_LIST.md` (DCMMS-033)
