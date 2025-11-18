# Component Library Documentation

## Overview

The dCMMS component library is built on **shadcn/ui** with **Tailwind CSS** and **Radix UI** primitives. All components follow the design tokens and mockup specifications defined in `design-tokens.json` and `mockups/`.

## Tech Stack

- **shadcn/ui**: Copy-paste component library (not npm package)
- **Tailwind CSS 3.4+**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible component primitives
- **class-variance-authority (CVA)**: Type-safe variant system
- **clsx + tailwind-merge**: Conditional class merging

## Component Structure

```
frontend/src/components/
├── ui/                     # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── label.tsx
│   ├── skeleton.tsx
│   └── ... (more as needed)
├── auth/                   # Authentication components
├── dashboard/              # Dashboard components
├── work-orders/            # Work order components
└── shared/                 # Shared business components
```

## Base Components

### Button

**File:** `src/components/ui/button.tsx`

**Variants:**
- `default` - Primary blue button with shadow
- `destructive` - Red button for delete/cancel actions
- `outline` - Bordered button with transparent background
- `secondary` - Secondary gray button
- `ghost` - Transparent button with hover effect
- `link` - Text button with underline on hover

**Sizes:**
- `default` - 40px height (base size)
- `sm` - 36px height (compact)
- `lg` - 44px height (prominent)
- `icon` - 40×40px square (icon only)

**Props:**
- `variant`: ButtonVariant
- `size`: ButtonSize
- `loading`: boolean (shows spinner, disables button)
- `asChild`: boolean (Radix Slot for composition)
- All native button attributes

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg">
  Sign In
</Button>

<Button variant="destructive" loading={isDeleting}>
  Delete
</Button>

<Button variant="outline" asChild>
  <Link href="/dashboard">Dashboard</Link>
</Button>
```

**States:**
- Default: Blue background, white text
- Hover: Darker blue, subtle shadow
- Active: Pressed effect (scale 0.98)
- Disabled: Gray background, reduced opacity
- Loading: Spinner animation, disabled interaction

### Card

**File:** `src/components/ui/card.tsx`

**Subcomponents:**
- `Card` - Container with border, shadow, rounded corners
- `CardHeader` - Top section with padding
- `CardTitle` - Large semibold heading
- `CardDescription` - Muted text subtitle
- `CardContent` - Main content area
- `CardFooter` - Bottom section (buttons, actions)

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Active Work Orders</CardTitle>
    <CardDescription>12% increase from last week</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold">142</div>
  </CardContent>
  <CardFooter>
    <Button variant="outline">View All</Button>
  </CardFooter>
</Card>
```

### Input

**File:** `src/components/ui/input.tsx`

**Props:**
- `error`: boolean (red border, red focus ring)
- All native input attributes

**Usage:**
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    error={!!errors.email}
  />
  {errors.email && (
    <p className="text-sm text-destructive mt-1">{errors.email}</p>
  )}
</div>
```

**States:**
- Default: 1px gray border
- Focus: 2px blue ring with 4px offset
- Error: 2px red border, red focus ring
- Disabled: Gray background, reduced opacity

### Badge

**File:** `src/components/ui/badge.tsx`

**Variants:**
- `default` - Blue badge
- `secondary` - Gray badge
- `destructive` - Red badge
- `outline` - Bordered badge
- `success` - Green badge (custom)
- `warning` - Orange badge (custom)
- `info` - Blue badge (custom)

**Usage:**
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="success">Completed</Badge>
<Badge variant="warning">High Priority</Badge>
<Badge variant="destructive">Overdue</Badge>
```

**Common Use Cases:**
- Work order status
- Priority levels
- Alert severity
- Notification counts
- Tags and labels

### Avatar

**File:** `src/components/ui/avatar.tsx`

**Subcomponents:**
- `Avatar` - Container (40×40px default)
- `AvatarImage` - User photo
- `AvatarFallback` - Initials when image unavailable

**Usage:**
```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

<Avatar>
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
</Avatar>
```

**Sizes (via className):**
- `h-8 w-8` - Small (32px)
- `h-10 w-10` - Default (40px)
- `h-12 w-12` - Large (48px)
- `h-16 w-16` - Extra large (64px)

### Label

**File:** `src/components/ui/label.tsx`

**Usage:**
```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="username">Username</Label>
<Input id="username" />
```

**Accessibility:**
- Associates label with input via `htmlFor`
- Screen readers announce label when input is focused
- Clicking label focuses input

### Skeleton

**File:** `src/components/ui/skeleton.tsx`

**Usage:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Loading card
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-1/2 mt-2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>

// Loading list
{[...Array(5)].map((_, i) => (
  <div key={i} className="flex items-center gap-4">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
))}
```

## Utility Functions

**File:** `src/lib/utils.ts`

### `cn(...inputs)`
Merge Tailwind classes with conflict resolution

```tsx
cn('px-4 py-2', 'px-6') // Result: 'py-2 px-6'
cn('text-red-500', someCondition && 'text-blue-500') // Conditional classes
```

### `formatDate(date, options?)`
Format date to locale string

```tsx
formatDate(new Date()) // "Nov 18, 2025"
formatDate(workOrder.dueDate, { month: 'short', day: 'numeric' }) // "Nov 18"
```

### `formatRelativeTime(date)`
Format to relative time

```tsx
formatRelativeTime(new Date(Date.now() - 3600000)) // "1h ago"
formatRelativeTime(new Date(Date.now() - 86400000)) // "1d ago"
```

### `truncate(text, length)`
Truncate with ellipsis

```tsx
truncate("Long work order title that needs truncation", 30)
// "Long work order title that..."
```

### `getInitials(name)`
Generate initials for avatars

```tsx
getInitials("John Doe") // "JD"
getInitials("Admin User") // "AU"
```

### `debounce(func, wait)`
Debounce function calls

```tsx
const debouncedSearch = debounce((query: string) => {
  fetchSearchResults(query);
}, 300);
```

## Configuration

### shadcn/ui Config

**File:** `components.json`

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### Tailwind Config

**File:** `tailwind.config.ts`

- Extends Tailwind with design tokens from `design-tokens.json`
- Custom color palette (primary, success, warning, error)
- Custom font families (Inter, JetBrains Mono)
- Plugins: `tailwindcss-animate`, `@tailwindcss/forms`

## Adding New Components

### Using shadcn/ui CLI

```bash
# Add a specific component
npx shadcn-ui@latest add dropdown-menu

# Add multiple components
npx shadcn-ui@latest add dialog select tabs

# List available components
npx shadcn-ui@latest add
```

### Manual Addition

1. Create file in `src/components/ui/`
2. Use Radix UI primitive if available
3. Style with Tailwind classes
4. Use CVA for variants
5. Export from index (if creating barrel exports)

### Example: Dropdown Menu

```tsx
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));

// ... more subcomponents

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, ... };
```

## Best Practices

### Accessibility
- Use semantic HTML (`<button>`, `<input>`, `<label>`)
- Provide ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers

### Performance
- Lazy load components with `React.lazy()` and `Suspense`
- Use `React.memo()` for expensive components
- Avoid inline function definitions in props
- Use `useMemo()` and `useCallback()` appropriately

### Styling
- Use Tailwind utility classes
- Extract repeated patterns to components
- Use CVA for variant management
- Follow design tokens strictly

### Type Safety
- Define prop interfaces for all components
- Use generics for reusable components
- Extend native HTML element types when appropriate
- Export types for consumers

### Testing
- Unit test individual components (Vitest + React Testing Library)
- Test all variants and states
- Test keyboard interactions
- Test accessibility

## Next Components to Add

Priority components for Sprint 1:

1. **Dialog** - Modals for forms and confirmations
2. **Dropdown Menu** - User menu, action menus
3. **Select** - Form dropdowns
4. **Table** - Work orders table view
5. **Tabs** - Dashboard sections
6. **Toast** - Success/error notifications
7. **Popover** - Filter panels, tooltips
8. **Command** - Global search (⌘K)
9. **Checkbox** - Filter selections
10. **Radio Group** - Priority selectors

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [CVA Documentation](https://cva.style)
- [Design Tokens](../design-tokens.json)
- [UI Mockups](./mockups/)
