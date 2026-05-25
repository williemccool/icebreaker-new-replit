import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      colors: {
        icebreaker: {
          bg: '#0A0A0C',
          surface: '#141418',
          elevated: '#1E1E25',
          text: '#F0F2F7',
          muted: '#8A8FA8',
          coral: '#FF1B8D',
          orchid: '#00CFFF',
          teal: '#00CFFF',
          warning: '#FFB020',
          border: '#252530',
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
        'glow-coral': '0 0 24px rgba(255, 27, 141, 0.35)',
        'glow-orchid': '0 0 20px rgba(0, 207, 255, 0.25)',
        'glow-teal': '0 0 24px rgba(0, 207, 255, 0.35)',
        'glow-pink-lg': '0 0 40px rgba(255, 27, 141, 0.5)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'gradient-coral-orchid': 'linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)',
        'gradient-orchid-teal': 'linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)',
        'gradient-nightlife': 'linear-gradient(180deg, #0A0A0C 0%, #141418 100%)',
        'gradient-pink-cyan': 'linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
