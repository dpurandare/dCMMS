# Work Orders Screens - High-Fidelity Mockup Specifications

## 1. Work Orders List View

### Page Header
```
Padding: 24px
Background: white (#FFFFFF)
Border Bottom: 1px solid slate-200 (#E2E8F0)

Title:
  - Font: Inter, 24px, 700 weight
  - Color: slate-900 (#0F172A)
  - Margin Bottom: 8px

Subtitle:
  - Font: Inter, 14px, 400 weight
  - Color: slate-600 (#475569)
  - Content: "Manage and track all maintenance work orders"
```

### Action Bar
```
Display: Flex row, justify space-between, align center
Padding: 16px 24px
Background: white (#FFFFFF)
Border Bottom: 1px solid slate-200 (#E2E8F0)

Left Section:
  - Flex: row, gap 12px

  Filter Button:
    - Height: 40px
    - Padding: 0 16px
    - Background: white (#FFFFFF)
    - Border: 1px solid slate-300 (#CBD5E1)
    - Border Radius: 8px
    - Font: Inter, 14px, 500 weight
    - Color: slate-700 (#334155)
    - Flex: row, align center, gap 8px

    Icon: Filter (Lucide), 20px

    Badge (if active filters):
      - Background: blue-500 (#3B82F6)
      - Color: white (#FFFFFF)
      - Size: 18px × 18px
      - Border Radius: 50%
      - Font: Inter, 11px, 600 weight
      - Margin Left: 4px

    Hover:
      - Background: slate-50 (#F8FAFC)
      - Border: slate-400 (#94A3B8)

  Sort Dropdown:
    - Same styling as Filter Button
    - Icon: ArrowUpDown (Lucide), 20px
    - Text: "Sort: Priority"
    - Chevron Down: 16px, right

  View Toggle:
    - Background: slate-100 (#F1F5F9)
    - Border Radius: 6px
    - Padding: 4px
    - Flex: row, gap 4px

    Button:
      - Size: 32px × 32px
      - Border Radius: 4px
      - Flex: center
      - Color: slate-600 (#475569)

      Active:
        - Background: white (#FFFFFF)
        - Color: slate-900 (#0F172A)
        - Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)

    Icons:
      - LayoutGrid (card view)
      - List (list view)
      - Columns (table view)

Right Section:
  - Create Work Order Button:
    - Height: 40px
    - Padding: 0 20px
    - Background: blue-600 (#2563EB)
    - Color: white (#FFFFFF)
    - Border Radius: 8px
    - Font: Inter, 14px, 600 weight
    - Flex: row, align center, gap 8px
    - Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)

    Icon: Plus (Lucide), 20px

    Hover:
      - Background: blue-700 (#1D4ED8)
      - Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
```

### Filter Panel (Slide-out)
```
Position: Fixed right 0, top 64px
Width: 360px
Height: calc(100vh - 64px)
Background: white (#FFFFFF)
Border Left: 1px solid slate-200 (#E2E8F0)
Shadow: -4px 0 6px rgba(0, 0, 0, 0.1)
Z-index: 40
Transform: translateX(100%) (hidden)
Transform: translateX(0) (visible)
Transition: transform 300ms ease

Header:
  - Padding: 20px
  - Border Bottom: 1px solid slate-200 (#E2E8F0)
  - Flex: row, justify space-between, align center

  Title:
    - Font: Inter, 18px, 600 weight
    - Color: slate-900 (#0F172A)

  Close Button:
    - Size: 32px × 32px
    - Border Radius: 6px
    - Flex: center
    - Hover Background: slate-100 (#F1F5F9)
    - Icon: X (Lucide), 20px, slate-600

Content:
  - Padding: 20px
  - Overflow: auto
  - Height: calc(100% - 140px)

Footer:
  - Padding: 16px 20px
  - Border Top: 1px solid slate-200 (#E2E8F0)
  - Flex: row, justify space-between, gap 12px

  Clear Filters Button:
    - Height: 40px
    - Padding: 0 16px
    - Background: white (#FFFFFF)
    - Border: 1px solid slate-300 (#CBD5E1)
    - Border Radius: 8px
    - Font: Inter, 14px, 500 weight
    - Color: slate-700 (#334155)

  Apply Filters Button:
    - Height: 40px
    - Padding: 0 20px
    - Background: blue-600 (#2563EB)
    - Color: white (#FFFFFF)
    - Border Radius: 8px
    - Font: Inter, 14px, 600 weight
    - Flex: 1
```

#### Filter Groups
```
Margin Bottom: 24px

Label:
  - Font: Inter, 13px, 600 weight
  - Color: slate-900 (#0F172A)
  - Text Transform: uppercase
  - Letter Spacing: 0.5px
  - Margin Bottom: 12px

Filter Items:
  - Display: Flex column
  - Gap: 8px
```

##### Status Filter (Checkboxes)
```
Checkbox Item:
  - Height: 36px
  - Padding: 0 12px
  - Border Radius: 6px
  - Flex: row, align center, gap 12px
  - Hover Background: slate-50 (#F8FAFC)
  - Cursor: pointer

  Checkbox:
    - Size: 18px × 18px
    - Border: 2px solid slate-300 (#CBD5E1)
    - Border Radius: 4px
    - Transition: all 150ms

    Checked:
      - Background: blue-600 (#2563EB)
      - Border: blue-600 (#2563EB)
      - Icon: Check (Lucide), 14px, white

  Label:
    - Font: Inter, 14px, 500 weight
    - Color: slate-700 (#334155)
    - Flex: 1

  Count:
    - Font: Inter, 13px, 500 weight
    - Color: slate-500 (#64748B)
    - Background: slate-100 (#F1F5F9)
    - Padding: 2px 8px
    - Border Radius: 10px

Options:
  - Open (12)
  - In Progress (45)
  - On Hold (3)
  - Completed (89)
  - Cancelled (2)
```

##### Priority Filter (Radio Buttons)
```
Options:
  - All
  - Critical
  - High
  - Medium
  - Low

Radio Item: Similar to checkbox but with radio button styling
```

##### Type Filter (Multi-select)
```
Options:
  - Corrective
  - Preventive
  - Predictive
  - Inspection
  - Emergency
```

##### Date Range Picker
```
From Date:
  - Input with calendar icon
  - Format: MM/DD/YYYY
  - Opens calendar popover

To Date:
  - Same as From Date

Presets:
  - Today
  - Last 7 days
  - Last 30 days
  - This Month
  - Last Month
  - Custom Range
```

##### Assigned To (Multi-select Dropdown)
```
Input:
  - Height: 40px
  - Border: 1px solid slate-300 (#CBD5E1)
  - Border Radius: 8px
  - Padding: 8px 12px
  - Placeholder: "Select users..."
  - Icon: ChevronDown, right aligned

Dropdown:
  - Max Height: 300px
  - Overflow: auto
  - Background: white (#FFFFFF)
  - Border: 1px solid slate-200 (#E2E8F0)
  - Border Radius: 8px
  - Shadow: 0 10px 15px rgba(0, 0, 0, 0.1)
  - Margin Top: 4px

  Search Input:
    - Padding: 8px 12px
    - Border Bottom: 1px solid slate-200 (#E2E8F0)
    - Font: Inter, 14px
    - Placeholder: "Search users..."

  Option:
    - Height: 40px
    - Padding: 8px 12px
    - Flex: row, align center, gap 12px
    - Hover Background: slate-50 (#F8FAFC)

    Avatar: 24px × 24px, circle
    Name: Inter, 14px, 500 weight
    Checkbox: Right aligned

Selected Items Display:
  - Flex: row, wrap, gap 8px
  - Margin Top: 8px

  Tag:
    - Padding: 4px 8px
    - Background: blue-50 (#EFF6FF)
    - Border: 1px solid blue-200 (#BFDBFE)
    - Border Radius: 6px
    - Font: Inter, 13px, 500 weight
    - Color: blue-700 (#1D4ED8)
    - Flex: row, align center, gap 6px

    Remove Button:
      - Icon: X (Lucide), 14px
      - Hover Color: blue-900 (#1E3A8A)
      - Cursor: pointer
```

### Card View (Default)
```
Padding: 24px
Display: Grid
Grid Template Columns: repeat(auto-fill, minmax(360px, 1fr))
Gap: 24px
```

#### Work Order Card
```
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px
Padding: 20px
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
Cursor: pointer
Transition: all 150ms

Hover:
  - Border Color: blue-300 (#93C5FD)
  - Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
  - Transform: translateY(-2px)

Header:
  - Flex: row, justify space-between, align start
  - Margin Bottom: 12px

  Work Order ID:
    - Font: Inter, 12px, 600 weight
    - Color: slate-500 (#64748B)
    - Text Transform: uppercase
    - Letter Spacing: 0.5px

  Priority Badge:
    - Padding: 4px 10px
    - Border Radius: 12px
    - Font: Inter, 12px, 600 weight
    - Text Transform: uppercase
    - Letter Spacing: 0.3px

    Critical:
      - Background: red-100 (#FEE2E2)
      - Color: red-700 (#B91C1C)
      - Border: 1px solid red-300 (#FCA5A5)

    High:
      - Background: orange-100 (#FFEDD5)
      - Color: orange-700 (#C2410C)
      - Border: 1px solid orange-300 (#FDBA74)

    Medium:
      - Background: yellow-100 (#FEF9C3)
      - Color: yellow-700 (#A16207)
      - Border: 1px solid yellow-300 (#FDE047)

    Low:
      - Background: green-100 (#DCFCE7)
      - Color: green-700 (#15803D)
      - Border: 1px solid green-300 (#86EFAC)

Title:
  - Font: Inter, 16px, 600 weight
  - Color: slate-900 (#0F172A)
  - Margin Bottom: 8px
  - Line Clamp: 2 lines
  - Overflow: ellipsis

Description:
  - Font: Inter, 14px, 400 weight
  - Color: slate-600 (#475569)
  - Line Clamp: 2 lines
  - Margin Bottom: 16px

Meta Row:
  - Display: Grid
  - Grid Template Columns: repeat(2, 1fr)
  - Gap: 12px
  - Margin Bottom: 16px

  Meta Item:
    - Flex: column, gap 4px

    Label:
      - Font: Inter, 12px, 500 weight
      - Color: slate-500 (#64748B)

    Value:
      - Font: Inter, 14px, 500 weight
      - Color: slate-900 (#0F172A)

Status & Assignment Row:
  - Flex: row, justify space-between, align center

  Status Badge:
    - Padding: 6px 12px
    - Border Radius: 6px
    - Font: Inter, 13px, 500 weight
    - Flex: row, align center, gap 6px

    Icon:
      - Size: 14px
      - Circle (Lucide)
      - Filled

    Open:
      - Background: blue-50 (#EFF6FF)
      - Color: blue-700 (#1D4ED8)
      - Icon Color: blue-500 (#3B82F6)

    In Progress:
      - Background: purple-50 (#FAF5FF)
      - Color: purple-700 (#7E22CE)
      - Icon Color: purple-500 (#A855F7)

    On Hold:
      - Background: orange-50 (#FFF7ED)
      - Color: orange-700 (#C2410C)
      - Icon Color: orange-500 (#F97316)

    Completed:
      - Background: green-50 (#F0FDF4)
      - Color: green-700 (#15803D)
      - Icon Color: green-500 (#22C55E)

    Cancelled:
      - Background: slate-100 (#F1F5F9)
      - Color: slate-700 (#334155)
      - Icon Color: slate-500 (#64748B)

  Assigned User:
    - Flex: row, align center, gap 8px

    Avatar:
      - Size: 32px × 32px
      - Border Radius: 50%
      - Background: blue-500 gradient
      - Initials: white, Inter, 12px, 600 weight
      - Border: 2px solid white (#FFFFFF)

    Name:
      - Font: Inter, 13px, 500 weight
      - Color: slate-700 (#334155)
      - Max Width: 120px
      - Truncate: ellipsis

Footer:
  - Padding Top: 16px
  - Border Top: 1px solid slate-100 (#F1F5F9)
  - Flex: row, justify space-between, align center

  Due Date:
    - Flex: row, align center, gap 6px
    - Font: Inter, 13px, 500 weight

    Icon: Calendar (Lucide), 16px

    Text: "Due: Apr 15, 2025"
      - Color: slate-600 (#475569)

    Overdue:
      - Color: red-600 (#DC2626)
      - Icon Color: red-600 (#DC2626)

    Due Soon (< 24h):
      - Color: orange-600 (#EA580C)
      - Icon Color: orange-600 (#EA580C)

  More Actions Button:
    - Size: 28px × 28px
    - Border Radius: 6px
    - Flex: center
    - Hover Background: slate-100 (#F1F5F9)
    - Icon: MoreVertical (Lucide), 18px, slate-600
```

### List View
```
Padding: 24px
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px
```

#### List Item
```
Height: 80px
Padding: 16px 20px
Border Bottom: 1px solid slate-100 (#F1F5F9)
Flex: row, align center, gap 16px
Cursor: pointer
Transition: background 150ms

Last Item: No border

Hover:
  - Background: slate-50 (#F8FAFC)

Selected:
  - Background: blue-50 (#EFF6FF)
  - Border Right: 3px solid blue-600 (#2563EB)

Checkbox:
  - Size: 18px × 18px
  - Border: 2px solid slate-300 (#CBD5E1)
  - Border Radius: 4px
  - Margin Right: 12px

Priority Indicator:
  - Width: 4px
  - Height: 100%
  - Border Radius: 2px
  - Margin Right: 16px

  Critical: red-600 (#DC2626)
  High: orange-600 (#EA580C)
  Medium: yellow-600 (#CA8A04)
  Low: green-600 (#16A34A)

Content:
  - Flex: 1, column, gap 6px

  Row 1:
    - Flex: row, align center, gap 12px

    Work Order ID:
      - Font: Inter, 13px, 600 weight
      - Color: slate-500 (#64748B)
      - Min Width: 80px

    Title:
      - Font: Inter, 15px, 600 weight
      - Color: slate-900 (#0F172A)
      - Flex: 1
      - Truncate: ellipsis

    Status Badge: Same as card view, smaller padding (4px 10px)

  Row 2:
    - Flex: row, align center, gap 16px
    - Font: Inter, 13px, 400 weight
    - Color: slate-600 (#475569)

    Item:
      - Flex: row, align center, gap 6px
      - Icon: 14px, slate-400

    Type: Wrench icon
    Asset: Package icon
    Due Date: Calendar icon

Meta Column:
  - Min Width: 200px
  - Flex: column, align end, gap 6px

  Assigned User:
    - Flex: row, align center, gap 8px
    - Avatar: 28px × 28px
    - Name: Inter, 13px, 500 weight

  Last Updated:
    - Font: Inter, 12px, 400 weight
    - Color: slate-500 (#64748B)
    - Content: "Updated 2h ago"

Actions:
  - Flex: row, gap 8px

  Quick Action Buttons:
    - Size: 32px × 32px
    - Border Radius: 6px
    - Border: 1px solid slate-200 (#E2E8F0)
    - Flex: center
    - Hover Background: slate-100 (#F1F5F9)

    Icons:
      - Eye (view)
      - Edit (edit)
      - MoreVertical (more options)
```

### Table View
```
Padding: 24px
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px
Overflow: auto

Table:
  - Width: 100%
  - Border Collapse: collapse

  Header Row:
    - Height: 48px
    - Background: slate-50 (#F8FAFC)
    - Border Bottom: 2px solid slate-200 (#E2E8F0)

    Header Cell:
      - Padding: 12px 16px
      - Font: Inter, 13px, 600 weight
      - Color: slate-700 (#334155)
      - Text Transform: uppercase
      - Letter Spacing: 0.5px
      - Cursor: pointer (if sortable)

      Sort Icon:
        - ArrowUpDown (Lucide), 14px
        - Margin Left: 4px
        - Opacity: 0 (visible on hover/active)

  Body Row:
    - Height: 64px
    - Border Bottom: 1px solid slate-100 (#F1F5F9)
    - Transition: background 150ms

    Hover:
      - Background: slate-50 (#F8FAFC)

    Cell:
      - Padding: 12px 16px
      - Font: Inter, 14px, 400 weight
      - Color: slate-900 (#0F172A)
      - Vertical Align: middle

Columns:
  1. Checkbox (40px)
  2. Priority (60px) - Color indicator
  3. WO ID (120px)
  4. Title (300px)
  5. Type (120px)
  6. Status (140px) - Badge
  7. Priority (100px) - Badge
  8. Assigned To (180px) - Avatar + name
  9. Due Date (140px)
  10. Actions (100px)

Pagination:
  - Padding: 16px 20px
  - Border Top: 1px solid slate-200 (#E2E8F0)
  - Flex: row, justify space-between, align center

  Info Text:
    - Font: Inter, 14px, 400 weight
    - Color: slate-600 (#475569)
    - Content: "Showing 1-20 of 145 work orders"

  Page Controls:
    - Flex: row, gap 8px

    Button:
      - Size: 36px × 36px
      - Border: 1px solid slate-300 (#CBD5E1)
      - Border Radius: 6px
      - Flex: center
      - Font: Inter, 14px, 500 weight
      - Color: slate-700 (#334155)

      Active:
        - Background: blue-600 (#2563EB)
        - Color: white (#FFFFFF)
        - Border: blue-600 (#2563EB)

      Disabled:
        - Opacity: 0.5
        - Cursor: not-allowed

    Options: Previous, 1, 2, 3, ..., 10, Next
```

### Empty State
```
Padding: 80px 24px
Text Align: center
Background: white (#FFFFFF)
Border: 1px solid slate-200 (#E2E8F0)
Border Radius: 12px

Icon:
  - Inbox (Lucide)
  - Size: 64px
  - Color: slate-300 (#CBD5E1)
  - Margin Bottom: 24px

Heading:
  - Font: Inter, 20px, 600 weight
  - Color: slate-900 (#0F172A)
  - Margin Bottom: 8px
  - Content: "No work orders found"

Description:
  - Font: Inter, 14px, 400 weight
  - Color: slate-600 (#475569)
  - Margin Bottom: 24px
  - Content: "Get started by creating your first work order"

Create Button:
  - Height: 40px
  - Padding: 0 20px
  - Background: blue-600 (#2563EB)
  - Color: white (#FFFFFF)
  - Border Radius: 8px
  - Font: Inter, 14px, 600 weight
  - Flex: row, align center, gap 8px
  - Icon: Plus (Lucide), 20px
```

### Loading State
```
Each Card/Row Skeleton:
  - Background: slate-100 (#F1F5F9)
  - Border Radius: Same as actual card/row
  - Animation: Pulse (opacity 1 → 0.5 → 1, 2s infinite)

Skeleton Elements:
  - Header: Height 20px, width 40%
  - Title: Height 24px, width 80%
  - Description: Height 16px, width 100% (2 lines)
  - Meta: Height 14px, various widths
```

This completes the Work Orders List View mockup specification.
