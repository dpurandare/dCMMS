# Authentication Screens - High-Fidelity Mockup Specifications

## 1. Login Screen

### Layout
- **Container:** Centered card on gradient background
- **Max Width:** 440px
- **Padding:** 48px (desktop), 24px (mobile)
- **Background:** Linear gradient from slate-900 to slate-800

### Components

#### Logo Section
```
Position: Top center
Logo: dCMMS wordmark + icon
Size: 48px height
Color: White (#FFFFFF)
Margin Bottom: 32px
```

#### Heading
```
Text: "Sign in to your account"
Font: Inter, 28px, 700 weight
Color: slate-900 (#0F172A)
Text Align: Center
Margin Bottom: 8px
```

#### Subheading
```
Text: "Welcome back! Please enter your details."
Font: Inter, 14px, 400 weight
Color: slate-600 (#475569)
Text Align: Center
Margin Bottom: 32px
```

#### Email Input
```
Label: "Email address"
  - Font: Inter, 14px, 500 weight
  - Color: slate-700 (#334155)
  - Margin Bottom: 8px

Input:
  - Type: email
  - Placeholder: "you@example.com"
  - Border: 1px solid slate-300 (#CBD5E1)
  - Border Radius: 8px
  - Padding: 12px 16px
  - Font: Inter, 16px
  - Focus State:
    * Border: 2px solid blue-500 (#3B82F6)
    * Shadow: 0 0 0 4px rgba(59, 130, 246, 0.1)
  - Error State:
    * Border: 2px solid red-500 (#EF4444)
    * Shadow: 0 0 0 4px rgba(239, 68, 68, 0.1)
```

#### Password Input
```
Label: "Password"
  - Font: Inter, 14px, 500 weight
  - Color: slate-700 (#334155)
  - Margin Bottom: 8px

Input Container:
  - Position: Relative

Input:
  - Type: password
  - Placeholder: "••••••••"
  - Border: 1px solid slate-300 (#CBD5E1)
  - Border Radius: 8px
  - Padding: 12px 16px (right: 48px for icon)
  - Font: Inter, 16px

Toggle Icon:
  - Position: Absolute right 16px, vertical center
  - Icon: Eye / EyeOff (Lucide icons)
  - Size: 20px
  - Color: slate-400 (#94A3B8)
  - Hover: slate-600 (#475569)
  - Cursor: pointer
```

#### Remember Me & Forgot Password Row
```
Layout: Flex row, space between
Margin: 16px 0 24px 0

Remember Me Checkbox:
  - Checkbox: 16px × 16px, rounded-sm
  - Label: "Remember me"
  - Font: Inter, 14px, 400 weight
  - Color: slate-700 (#334155)

Forgot Password Link:
  - Text: "Forgot password?"
  - Font: Inter, 14px, 500 weight
  - Color: blue-600 (#2563EB)
  - Hover: blue-700 (#1D4ED8)
  - Text Decoration: None (underline on hover)
```

#### Sign In Button
```
Text: "Sign in"
Width: Full (100%)
Height: 44px
Background: blue-600 (#2563EB)
Color: White (#FFFFFF)
Font: Inter, 16px, 600 weight
Border Radius: 8px
Border: None
Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)

States:
  - Hover:
    * Background: blue-700 (#1D4ED8)
    * Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
  - Active:
    * Background: blue-800 (#1E40AF)
    * Transform: scale(0.98)
  - Loading:
    * Background: blue-600 (#2563EB)
    * Cursor: not-allowed
    * Opacity: 0.7
    * Text: "Signing in..."
    * Spinner: Inline, 16px, white
  - Disabled:
    * Background: slate-300 (#CBD5E1)
    * Cursor: not-allowed
    * Color: slate-500 (#64748B)
```

#### Divider
```
Margin: 24px 0
Layout: Flex row, align center

Line:
  - Height: 1px
  - Background: slate-200 (#E2E8F0)
  - Flex: 1

Text:
  - Content: "or"
  - Padding: 0 16px
  - Font: Inter, 14px, 400 weight
  - Color: slate-500 (#64748B)
```

#### SSO Buttons (if IdP enabled)
```
Google Sign-in:
  - Width: Full (100%)
  - Height: 44px
  - Background: White (#FFFFFF)
  - Border: 1px solid slate-300 (#CBD5E1)
  - Border Radius: 8px
  - Padding: 12px 16px
  - Flex: row, center, gap 12px
  - Margin Bottom: 12px

  Icon:
    - Google logo
    - Size: 20px

  Text:
    - "Continue with Google"
    - Font: Inter, 16px, 500 weight
    - Color: slate-700 (#334155)

  Hover:
    - Background: slate-50 (#F8FAFC)
    - Border: slate-400 (#94A3B8)

Microsoft Sign-in:
  - Same as Google but with Microsoft logo
  - Text: "Continue with Microsoft"

Azure AD Sign-in:
  - Same pattern
  - Text: "Continue with Azure AD"
```

#### Footer Text
```
Margin Top: 32px
Text Align: Center

Text: "Don't have an account? "
Font: Inter, 14px, 400 weight
Color: slate-600 (#475569)

Link: "Contact your administrator"
Font: Inter, 14px, 500 weight
Color: blue-600 (#2563EB)
Hover: blue-700 (#1D4ED8)
Text Decoration: None (underline on hover)
```

### Validation & Error States

#### Inline Field Errors
```
Position: Below input field
Margin Top: 4px
Font: Inter, 14px, 400 weight
Color: red-600 (#DC2626)
Icon: AlertCircle (Lucide), 16px, inline left

Examples:
  - "Please enter a valid email address"
  - "Password must be at least 8 characters"
  - "This field is required"
```

#### Global Error Banner
```
Position: Above form, below heading
Background: red-50 (#FEF2F2)
Border: 1px solid red-200 (#FECACA)
Border Radius: 8px
Padding: 12px 16px
Margin Bottom: 24px
Flex: row, align start, gap 12px

Icon:
  - AlertCircle (Lucide)
  - Size: 20px
  - Color: red-600 (#DC2626)

Text:
  - Font: Inter, 14px, 400 weight
  - Color: red-800 (#991B1B)

Examples:
  - "Invalid email or password. Please try again."
  - "Too many failed attempts. Please try again in 5 minutes."
  - "Your account has been locked. Contact your administrator."
```

### Loading States

#### Full Page Loader (Initial Auth Check)
```
Background: slate-50 (#F8FAFC)
Layout: Flex center, full viewport height

Spinner:
  - Size: 48px
  - Color: blue-600 (#2563EB)
  - Animation: Spin 1s linear infinite

Text (below spinner):
  - "Loading..."
  - Font: Inter, 14px, 500 weight
  - Color: slate-600 (#475569)
  - Margin Top: 16px
```

### Responsive Behavior

#### Desktop (≥1024px)
- Card: 440px max width, centered
- Background gradient visible
- All spacing as specified

#### Tablet (768px - 1023px)
- Card: 90% width, max 440px
- Reduced side padding to 32px

#### Mobile (<768px)
- Card: Full width, no border radius
- Padding: 24px
- Heading: 24px font size
- Button height: 48px (easier touch target)
- Background: solid white (no gradient)

### Accessibility

- **ARIA Labels:** All inputs have associated labels
- **Tab Order:** Email → Password → Remember Me → Forgot Password → Sign In → SSO Buttons
- **Focus Indicators:** Visible 2px blue outline on all interactive elements
- **Error Announcements:** Live region for screen readers
- **Keyboard Navigation:** Enter key submits form from any input
- **High Contrast:** Meets WCAG AA standards (4.5:1 minimum)

### Dark Mode Variant

```
Background: slate-950 (#020617)
Card Background: slate-900 (#0F172A)
Heading: white (#FFFFFF)
Subheading: slate-400 (#94A3B8)
Labels: slate-300 (#CBD5E1)
Inputs:
  - Background: slate-800 (#1E293B)
  - Border: slate-700 (#334155)
  - Text: white (#FFFFFF)
  - Placeholder: slate-500 (#64748B)
Links: blue-400 (#60A5FA)
Button: blue-600 → blue-700 gradient
```

## 2. Forgot Password Screen

### Layout
Same container as login screen

### Components

#### Heading
```
Text: "Reset your password"
Font: Inter, 28px, 700 weight
Color: slate-900 (#0F172A)
Text Align: Center
Margin Bottom: 8px
```

#### Subheading
```
Text: "Enter your email and we'll send you a reset link"
Font: Inter, 14px, 400 weight
Color: slate-600 (#475569)
Text Align: Center
Margin Bottom: 32px
```

#### Email Input
Same as login screen

#### Send Reset Link Button
```
Text: "Send reset link"
Width: Full (100%)
Height: 44px
Background: blue-600 (#2563EB)
Color: White (#FFFFFF)
Font: Inter, 16px, 600 weight
Border Radius: 8px
Margin Top: 24px

Success State:
  - Background: green-600 (#16A34A)
  - Text: "Email sent! Check your inbox"
  - Icon: Check (Lucide), 20px, inline left
```

#### Back to Login Link
```
Margin Top: 24px
Text Align: Center

Icon: ArrowLeft (Lucide), 16px, inline
Text: "Back to login"
Font: Inter, 14px, 500 weight
Color: slate-600 (#475569)
Hover: slate-900 (#0F172A)
```

#### Success Message (after submission)
```
Background: green-50 (#F0FDF4)
Border: 1px solid green-200 (#BBF7D0)
Border Radius: 8px
Padding: 16px
Margin Bottom: 24px

Icon: Mail (Lucide), 24px, green-600
Heading: "Check your email"
  - Font: Inter, 18px, 600 weight
  - Color: green-900 (#14532D)

Text: "We've sent a password reset link to your@email.com"
  - Font: Inter, 14px, 400 weight
  - Color: green-800 (#166534)

Subtext: "Didn't receive the email? Check your spam folder or request a new link"
  - Font: Inter, 12px, 400 weight
  - Color: green-700 (#15803D)
  - Margin Top: 8px
```

## 3. Two-Factor Authentication Screen

### Layout
Same container as login screen

### Components

#### Heading
```
Text: "Two-factor authentication"
Font: Inter, 28px, 700 weight
Color: slate-900 (#0F172A)
Text Align: Center
Margin Bottom: 8px
```

#### Subheading
```
Text: "Enter the 6-digit code from your authenticator app"
Font: Inter, 14px, 400 weight
Color: slate-600 (#475569)
Text Align: Center
Margin Bottom: 32px
```

#### OTP Input
```
Layout: Flex row, gap 12px, justify center

Each Input:
  - Width: 56px
  - Height: 64px
  - Border: 2px solid slate-300 (#CBD5E1)
  - Border Radius: 8px
  - Font: Inter, 32px, 700 weight
  - Text Align: Center
  - Color: slate-900 (#0F172A)

  Focus:
    - Border: 2px solid blue-500 (#3B82F6)
    - Shadow: 0 0 0 4px rgba(59, 130, 246, 0.1)

  Filled:
    - Background: blue-50 (#EFF6FF)
    - Border: 2px solid blue-500 (#3B82F6)

  Error:
    - Border: 2px solid red-500 (#EF4444)
    - Shake animation
```

#### Verify Button
Same as Sign In button, text: "Verify"

#### Resend Code Link
```
Margin Top: 24px
Text Align: Center

Text: "Didn't receive a code? "
Font: Inter, 14px, 400 weight
Color: slate-600 (#475569)

Link: "Resend code (30s)"
Font: Inter, 14px, 500 weight
Color: blue-600 (#2563EB) when active
Color: slate-400 (#94A3B8) when disabled (countdown)
Cursor: pointer when active, not-allowed when disabled
```

#### Back to Login Link
Same as forgot password screen

### Behavior

- **Auto-focus:** First input is focused on load
- **Auto-advance:** Moves to next input after digit entered
- **Paste Support:** Pasting 6-digit code fills all inputs
- **Countdown Timer:** 30-second countdown for resend code
- **Auto-submit:** Form submits when all 6 digits entered
- **Error Animation:** Shake animation on invalid code
- **Clear on Error:** Inputs clear and focus returns to first input

This completes the authentication screens mockup specification.
