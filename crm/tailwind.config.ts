import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        orange: {
          400: '#f08c2a',
          500: '#e07b20',
          600: '#c96c17',
        },
      },
    },
  },
  plugins: [],
}

export default config
