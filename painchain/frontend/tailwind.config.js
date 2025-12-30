/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1419',
        surface: '#1a1f2e',
        'surface-light': '#1e2433',
        border: '#2a3142',
        'border-light': '#3a4152',
        accent: '#00E8A0',
        'accent-hover': '#00ffb3',
        error: '#f85149',
        text: {
          primary: '#e1e4e8',
          secondary: '#c9d1d9',
          muted: '#808080',
          dark: '#606060',
        },
        connector: {
          github: '#00E8A0',
          gitlab: '#fc6d26',
          kubernetes: '#326ce5',
          painchain: '#9f7aea',
        },
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
