import type { Config } from 'tailwindcss';

// Tokens come from docs/stitch_resq_emergency_assistant/emergency_response_systems/DESIGN.md
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#d0dbed',
          lowest: '#ffffff',
          low: '#eff4ff',
          container: '#e6eeff',
          high: '#dee9fc',
          highest: '#d9e3f6',
        },
        onSurface: {
          DEFAULT: '#121c2a',
          variant: '#43474f',
        },
        outline: {
          DEFAULT: '#737780',
          variant: '#c3c6d0',
        },
        primary: {
          DEFAULT: '#002c57',
          container: '#1b4372',
          on: '#ffffff',
          fixed: '#d4e3ff',
        },
        secondary: {
          container: '#dce3eb',
          on: '#5e656c',
        },
        // Green signals calm/safe (never urgency; red owns that).
        tertiary: {
          DEFAULT: '#004e10',
          bright: '#0d7a2a',
          container: '#e3f3e4',
          on: '#ffffff',
        },
        // Red is reserved strictly for life-threatening states.
        critical: {
          DEFAULT: '#ba1a1a',
          on: '#ffffff',
          container: '#ffdad6',
          onContainer: '#93000a',
        },
        warning: {
          DEFAULT: '#8a5300',
          container: '#ffdfb0',
        },
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'var(--font-devanagari)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'instruction-xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '600' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'label-sm': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.05em', fontWeight: '500' }],
      },
      borderRadius: {
        md: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        gutter: '1rem',
      },
      maxWidth: {
        container: '768px',
      },
      minHeight: {
        touch: '56px',
      },
    },
  },
  plugins: [],
};

export default config;
