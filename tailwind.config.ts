import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "2.5rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chat: {
          background: "hsl(var(--chat-background))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-glass': 'var(--gradient-glass)',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'glass': 'var(--shadow-glass)',
        'glow': 'var(--shadow-glow)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '12px',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.75rem',
        DEFAULT: '1rem',
        'md': '1.25rem',
        'lg': 'var(--radius)',
        'xl': '1.75rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        'full': '9999px',
      },
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "slide-in-bottom": {
          "0%": { 
            transform: "translateY(100%)",
            opacity: "0"
          },
          "100%": { 
            transform: "translateY(0)",
            opacity: "1"
          }
        },
        // Premium message animations
        "message-in": {
          "0%": { 
            opacity: "0", 
            transform: "translateY(8px) scale(0.96)"
          },
          "100%": { 
            opacity: "1", 
            transform: "translateY(0) scale(1)"
          }
        },
        "message-out": {
          "0%": { 
            opacity: "0", 
            transform: "translateY(8px) scale(0.96)"
          },
          "100%": { 
            opacity: "1", 
            transform: "translateY(0) scale(1)"
          }
        },
        // Premium typing dots
        "typing-dot": {
          "0%, 60%, 100%": { 
            transform: "translateY(0)",
            opacity: "0.4"
          },
          "30%": { 
            transform: "translateY(-6px)",
            opacity: "1"
          }
        },
        // Premium pulse glow
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)"
          },
          "50%": { 
            boxShadow: "0 0 0 8px hsl(var(--primary) / 0)"
          }
        },
        // Premium skeleton wave
        "skeleton-wave": {
          "0%": { 
            backgroundPosition: "-200% 0"
          },
          "100%": { 
            backgroundPosition: "200% 0"
          }
        },
        // Checkmark animation
        "checkmark-draw": {
          "0%": { 
            strokeDashoffset: "20"
          },
          "100%": { 
            strokeDashoffset: "0"
          }
        },
        // Floating date header
        "float-in": {
          "0%": { 
            opacity: "0",
            transform: "translateY(-8px) scale(0.9)"
          },
          "100%": { 
            opacity: "1",
            transform: "translateY(0) scale(1)"
          }
        },
        // Button press
        "button-press": {
          "0%, 100%": { 
            transform: "scale(1)"
          },
          "50%": { 
            transform: "scale(0.95)"
          }
        },
        // Ripple effect
        "ripple": {
          "0%": { 
            transform: "scale(0)",
            opacity: "0.5"
          },
          "100%": { 
            transform: "scale(4)",
            opacity: "0"
          }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "shimmer": "shimmer 2s infinite",
        // Premium animations
        "message-in": "message-in 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "message-out": "message-out 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "typing-dot": "typing-dot 1.4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "skeleton-wave": "skeleton-wave 1.5s ease-in-out infinite",
        "checkmark": "checkmark-draw 0.3s ease-out forwards",
        "float-in": "float-in 0.2s ease-out",
        "button-press": "button-press 0.15s ease-out",
        "ripple": "ripple 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
