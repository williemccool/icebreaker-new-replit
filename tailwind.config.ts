import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      colors: {
        icebreaker: {
          bg: '#0E0F13',
          surface: '#181B22',
          elevated: '#1F232C',
          text: '#F0F2F7',
          muted: '#8A8FA8',
          coral: '#FF5A5F',
          orchid: '#A855F7',
          teal: '#14C8A0',
          warning: '#FFB020',
          border: '#2A2D38',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'glow-coral': '0 0 20px rgba(255, 90, 95, 0.25)',
        'glow-orchid': '0 0 20px rgba(168, 85, 247, 0.25)',
        'glow-teal': '0 0 20px rgba(20, 200, 160, 0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-coral-orchid': 'linear-gradient(135deg, #FF5A5F 0%, #A855F7 100%)',
        'gradient-orchid-teal': 'linear-gradient(135deg, #A855F7 0%, #14C8A0 100%)',
        'gradient-nightlife': 'linear-gradient(180deg, #0E0F13 0%, #181B22 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
