import type { Config } from 'tailwindcss';
import designTokens from '../docs/design/design-tokens.json';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: designTokens.colors.primary['50'].value,
          100: designTokens.colors.primary['100'].value,
          200: designTokens.colors.primary['200'].value,
          300: designTokens.colors.primary['300'].value,
          400: designTokens.colors.primary['400'].value,
          500: designTokens.colors.primary['500'].value,
          600: designTokens.colors.primary['600'].value,
          700: designTokens.colors.primary['700'].value,
          800: designTokens.colors.primary['800'].value,
          900: designTokens.colors.primary['900'].value,
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Design system colors
        success: {
          50: designTokens.colors.success['50'].value,
          100: designTokens.colors.success['100'].value,
          500: designTokens.colors.success['500'].value,
          600: designTokens.colors.success['600'].value,
          700: designTokens.colors.success['700'].value,
        },
        warning: {
          50: designTokens.colors.warning['50'].value,
          100: designTokens.colors.warning['100'].value,
          300: designTokens.colors.warning['300'].value,
          500: designTokens.colors.warning['500'].value,
          600: designTokens.colors.warning['600'].value,
          700: designTokens.colors.warning['700'].value,
        },
        error: {
          50: designTokens.colors.error['50'].value,
          100: designTokens.colors.error['100'].value,
          200: designTokens.colors.error['200'].value,
          500: designTokens.colors.error['500'].value,
          600: designTokens.colors.error['600'].value,
          700: designTokens.colors.error['700'].value,
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: designTokens.typography.fontFamily.sans.value.split(', '),
        mono: designTokens.typography.fontFamily.mono.value.split(', '),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/forms')],
} satisfies Config;

export default config;
