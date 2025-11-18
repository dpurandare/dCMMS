# Dashboard Screen - High-Fidelity Mockup Specifications

## Layout Structure

### Main Container
```
Layout: Grid
Columns: 256px (sidebar) | 1fr (main content)
Height: 100vh
Background: slate-50 (#F8FAFC)
```

### Sidebar
```
Width: 256px
Background: white (#FFFFFF)
Border Right: 1px solid slate-200 (#E2E8F0)
Display: Flex column
Height: 100vh
Position: Fixed
Z-index: 40
```

### Main Content Area
```
Margin Left: 256px (desktop)
Padding: 24px
Min Height: 100vh
Overflow: auto
```

## Sidebar Components

### Logo Section
```
Padding: 24px 20px
Border Bottom: 1px solid slate-200 (#E2E8F0)

Logo:
  - dCMMS wordmark
  - Height: 32px
  - Color: slate-900 (#0F172A)

Site Selector (if multi-site):
  - Below logo
  - Margin Top: 12px
  - Width: Full
  - Height: 36px
  - Background: slate-50 (#F8FAFC)
  - Border: 1px solid slate-200 (#E2E8F0)
  - Border Radius: 6px
  - Padding: 8px 12px
  - Font: Inter, 14px, 500 weight
  - Icon: ChevronDown, 16px, right aligned
```

### Navigation Menu
```
Padding: 16px 12px
Flex: 1 (fills available space)
```

#### Nav Item (Default)
```
Width: Full
Height: 40px
Padding: 10px 12px
Border Radius: 6px
Margin Bottom: 4px
Flex: row, align center, gap 12px
Cursor: pointer
Transition: all 150ms

Icon:
  - Size: 20px
  - Color: slate-600 (#475569)
  - Stroke Width: 2px

Text:
  - Font: Inter, 14px, 500 weight
  - Color: slate-700 (#334155)

Hover:
  - Background: slate-100 (#F1F5F9)
  - Text Color: slate-900 (#0F172A)
  - Icon Color: slate-900 (#0F172A)
```

#### Nav Item (Active)
```
Background: blue-50 (#EFF6FF)
Border: 1px solid blue-200 (#BFDBFE)

Icon Color: blue-600 (#2563EB)
Text Color: blue-700 (#1D4ED8)

Active Indicator:
  - Position: Absolute left 0
  - Width: 3px
  - Height: 100%
  - Background: blue-600 (#2563EB)
  - Border Radius: 0 2px 2px 0
```

#### Nav Item with Badge
```
Layout: As default, but with badge right aligned

Badge:
  - Background: red-500 (#EF4444) for alerts
  - Background: blue-500 (#3B82F6) for info
  - Color: white (#FFFFFF)
  - Font: Inter, 12px, 600 weight
  - Padding: 2px 8px
  - Border Radius: 12px
  - Min Width: 20px
  - Text Align: Center
```

### Navigation Groups

#### Main Navigation
```
Home (LayoutDashboard icon)
Work Orders (Wrench icon) - Badge: 12
Assets (Package icon)
Alerts (Bell icon) - Badge: 8 (red)
Analytics (BarChart3 icon)
Reports (FileText icon)
```

#### Divider
```
Height: 1px
Background: slate-200 (#E2E8F0)
Margin: 16px 0
```

#### Settings & Support
```
Settings (Settings icon)
Help & Support (HelpCircle icon)
Documentation (Book icon)
```

### User Profile Section
```
Position: Bottom of sidebar
Padding: 16px
Border Top: 1px solid slate-200 (#E2E8F0)

Layout: Flex row, align center, gap 12px

Avatar:
  - Size: 40px × 40px
  - Border Radius: 50%
  - Background: blue-500 (#3B82F6) gradient
  - Initials: White, Inter, 14px, 600 weight
  - Border: 2px solid white (#FFFFFF)
  - Shadow: 0 2px 4px rgba(0, 0, 0, 0.1)

User Info:
  - Flex: 1
  - Layout: Flex column, gap 2px

  Name:
    - Font: Inter, 14px, 600 weight
    - Color: slate-900 (#0F172A)
    - Truncate: ellipsis

  Role:
    - Font: Inter, 12px, 400 weight
    - Color: slate-500 (#64748B)
    - Truncate: ellipsis

Menu Button:
  - Icon: MoreVertical (Lucide)
  - Size: 20px
  - Color: slate-400 (#94A3B8)
  - Hover: slate-600 (#475569)
  - Padding: 4px
  - Border Radius: 4px
  - Hover Background: slate-100 (#F1F5F9)
```

### User Dropdown Menu
```
Position: Absolute, bottom 80px, left 12px
Width: 232px (sidebar width - 24px)
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 8px
Shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)
Padding: 8px
Z-index: 50

Menu Item:
  - Height: 36px
  - Padding: 8px 12px
  - Border Radius: 4px
  - Flex: row, align center, gap 12px
  - Font: Inter, 14px, 500 weight
  - Color: slate-700 (#334155)
  - Hover Background: slate-100 (#F1F5F9)

Items:
  - Profile (User icon)
  - Settings (Settings icon)
  - Divider
  - Sign Out (LogOut icon, text-red-600)
```

## Top Bar

### Container
```
Height: 64px
Background: white (#FFFFFF)
Border Bottom: 1px solid slate-200 (#E2E8F0)
Padding: 0 24px
Display: Flex row, align center, justify space-between
Position: Sticky top 0
Z-index: 30
```

### Left Section

#### Page Title
```
Font: Inter, 20px, 700 weight
Color: slate-900 (#0F172A)
```

#### Breadcrumbs (if applicable)
```
Font: Inter, 14px, 400 weight
Color: slate-500 (#64748B)
Flex: row, align center, gap 8px

Separator:
  - Icon: ChevronRight (Lucide)
  - Size: 16px
  - Color: slate-400 (#94A3B8)

Active Item:
  - Color: slate-900 (#0F172A)
  - Font Weight: 500
```

### Right Section
```
Flex: row, align center, gap 16px
```

#### Search Bar
```
Width: 320px
Height: 40px
Background: slate-100 (#F1F5F9)
Border: 1px solid transparent
Border Radius: 8px
Padding: 0 12px
Flex: row, align center, gap 8px
Transition: all 150ms

Icon:
  - Search (Lucide)
  - Size: 20px
  - Color: slate-400 (#94A3B8)

Input:
  - Background: transparent
  - Border: none
  - Font: Inter, 14px, 400 weight
  - Color: slate-900 (#0F172A)
  - Placeholder: "Search work orders, assets..."
  - Placeholder Color: slate-500 (#64748B)
  - Flex: 1

Shortcut Hint:
  - Text: "⌘K"
  - Font: Inter, 12px, 500 weight
  - Color: slate-400 (#94A3B8)
  - Background: white (#FFFFFF)
  - Border: 1px solid slate-300 (#CBD5E1)
  - Border Radius: 4px
  - Padding: 2px 6px

Focus State:
  - Background: white (#FFFFFF)
  - Border: 1px solid blue-300 (#93C5FD)
  - Shadow: 0 0 0 4px rgba(59, 130, 246, 0.1)
```

#### Quick Actions Button
```
Height: 40px
Padding: 0 16px
Background: blue-600 (#2563EB)
Color: white (#FFFFFF)
Border Radius: 8px
Font: Inter, 14px, 600 weight
Flex: row, align center, gap 8px
Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)

Icon:
  - Plus (Lucide)
  - Size: 20px

Text: "New Work Order"

Hover:
  - Background: blue-700 (#1D4ED8)
  - Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
```

#### Notifications Button
```
Width: 40px
Height: 40px
Background: transparent
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 8px
Flex: center
Position: Relative

Icon:
  - Bell (Lucide)
  - Size: 20px
  - Color: slate-600 (#475569)

Badge (if unread):
  - Position: Absolute top -4px, right -4px
  - Size: 18px × 18px
  - Background: red-500 (#EF4444)
  - Color: white (#FFFFFF)
  - Border: 2px solid white (#FFFFFF)
  - Border Radius: 50%
  - Font: Inter, 11px, 600 weight
  - Display count (max 9+)

Hover:
  - Background: slate-50 (#F8FAFC)
  - Border Color: slate-300 (#CBD5E1)
```

## Dashboard Content

### Stats Cards Row
```
Display: Grid
Grid Template Columns: repeat(4, 1fr)
Gap: 24px
Margin Bottom: 24px

Responsive:
  - Desktop (≥1280px): 4 columns
  - Tablet (768px-1279px): 2 columns
  - Mobile (<768px): 1 column
```

#### Stat Card
```
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px
Padding: 24px
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
Transition: all 150ms

Hover:
  - Border Color: slate-300 (#CBD5E1)
  - Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
  - Transform: translateY(-2px)

Header:
  - Flex: row, justify space-between, align start
  - Margin Bottom: 16px

  Title:
    - Font: Inter, 14px, 500 weight
    - Color: slate-600 (#475569)

  Icon Container:
    - Size: 40px × 40px
    - Background: blue-50 (#EFF6FF) (varies by card)
    - Border Radius: 8px
    - Flex: center

    Icon:
      - Size: 24px
      - Color: blue-600 (#2563EB) (varies by card)

Value:
  - Font: Inter, 36px, 700 weight
  - Color: slate-900 (#0F172A)
  - Margin Bottom: 8px

Change Indicator:
  - Font: Inter, 14px, 500 weight
  - Flex: row, align center, gap 4px

  Icon:
    - TrendingUp / TrendingDown (Lucide)
    - Size: 16px

  Positive:
    - Color: green-600 (#16A34A)
    - Icon: TrendingUp

  Negative:
    - Color: red-600 (#DC2626)
    - Icon: TrendingDown

  Neutral:
    - Color: slate-600 (#475569)
    - Icon: Minus
```

### Example Stat Cards

#### 1. Active Work Orders
```
Icon: Wrench, orange-600 (#EA580C)
Background: orange-50 (#FFF7ED)
Value: "142"
Change: "+12% from last week" (green, trending up)
```

#### 2. Critical Alerts
```
Icon: AlertTriangle, red-600 (#DC2626)
Background: red-50 (#FEF2F2)
Value: "8"
Change: "-3 from yesterday" (green, trending down)
```

#### 3. Assets Operational
```
Icon: CheckCircle, green-600 (#16A34A)
Background: green-50 (#F0FDF4)
Value: "98.5%"
Change: "+0.3% from last month" (green, trending up)
```

#### 4. Avg Response Time
```
Icon: Clock, blue-600 (#2563EB)
Background: blue-50 (#EFF6FF)
Value: "2.4h"
Change: "-15min from average" (green, trending down)
```

### Charts Section
```
Display: Grid
Grid Template Columns: 2fr 1fr
Gap: 24px
Margin Bottom: 24px

Responsive:
  - Desktop (≥1024px): 2 columns
  - Mobile (<1024px): 1 column
```

#### Chart Card
```
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px
Padding: 24px
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

Header:
  - Flex: row, justify space-between, align center
  - Margin Bottom: 24px

  Title:
    - Font: Inter, 18px, 600 weight
    - Color: slate-900 (#0F172A)

  Time Range Selector:
    - Background: slate-100 (#F1F5F9)
    - Border Radius: 6px
    - Padding: 4px
    - Flex: row, gap 4px

    Button:
      - Padding: 6px 12px
      - Border Radius: 4px
      - Font: Inter, 13px, 500 weight
      - Color: slate-600 (#475569)
      - Background: transparent

      Active:
        - Background: white (#FFFFFF)
        - Color: slate-900 (#0F172A)
        - Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)

    Options: "7D", "30D", "3M", "1Y"

Chart Content:
  - Height: 300px
  - Library: Recharts / Chart.js
  - Colors: blue-600, green-500, orange-500, red-500
  - Grid: slate-200 (#E2E8F0)
  - Axes: slate-500 (#64748B)
  - Tooltips: white background, shadow, rounded
```

### Recent Activity Section
```
Display: Grid
Grid Template Columns: 1fr
Margin Bottom: 24px
```

#### Activity Card
```
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px
Padding: 24px
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

Header:
  - Flex: row, justify space-between, align center
  - Margin Bottom: 20px

  Title:
    - Font: Inter, 18px, 600 weight
    - Color: slate-900 (#0F172A)

  View All Link:
    - Font: Inter, 14px, 500 weight
    - Color: blue-600 (#2563EB)
    - Hover: blue-700 (#1D4ED8)
    - Icon: ArrowRight (Lucide), 16px

Activity List:
  - Display: Flex column
  - Gap: 16px
```

#### Activity Item
```
Flex: row, gap 16px
Padding: 12px 0
Border Bottom: 1px solid slate-100 (#F1F5F9)
Last Item: No border

Icon Container:
  - Size: 40px × 40px
  - Border Radius: 8px
  - Flex: center, shrink 0
  - Background: Varies by type

  Icon:
    - Size: 20px
    - Color: Varies by type

Type Variants:
  - Work Order Created: blue-50, blue-600, Wrench icon
  - Alert Triggered: red-50, red-600, AlertTriangle icon
  - Asset Updated: green-50, green-600, Package icon
  - User Action: slate-100, slate-600, User icon

Content:
  - Flex: 1, column, gap 4px

  Title:
    - Font: Inter, 14px, 500 weight
    - Color: slate-900 (#0F172A)

  Description:
    - Font: Inter, 14px, 400 weight
    - Color: slate-600 (#475569)

  Timestamp:
    - Font: Inter, 12px, 400 weight
    - Color: slate-500 (#64748B)
    - Margin Top: 4px

Action Button (if applicable):
  - Padding: 6px 12px
  - Background: slate-100 (#F1F5F9)
  - Border Radius: 6px
  - Font: Inter, 13px, 500 weight
  - Color: slate-700 (#334155)
  - Hover: slate-200 (#E2E8F0)
```

### Mobile Responsive Behavior

#### < 768px (Mobile)
```
Sidebar:
  - Off-canvas, slides in from left
  - Overlay: rgba(0, 0, 0, 0.5)
  - Trigger: Hamburger menu button in top bar

Top Bar:
  - Height: 56px
  - Left: Hamburger menu (24px icon)
  - Center: Logo
  - Right: Notifications only

Stats Cards:
  - 1 column
  - Reduced padding: 16px

Charts:
  - 1 column
  - Height: 250px
```

#### 768px - 1023px (Tablet)
```
Sidebar:
  - Collapsed to 64px width (icons only)
  - Expands on hover to 256px
  - Tooltips on icons

Stats Cards:
  - 2 columns

Charts:
  - 1 column
```

This completes the dashboard mockup specification.
