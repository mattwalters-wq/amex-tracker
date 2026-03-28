/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: '#7A9E8E',
        'sage-light': '#E8F0EC',
        'sage-dark': '#4A7A68',
        terra: '#C4705A',
        'terra-light': '#F5E8E4',
        cream: '#F4F1EA',
        'cream-dark': '#E8E4DA',
        olive: '#5E6B4A',
        'olive-light': '#EDF0E8',
        ochre: '#C49A4A',
        'ochre-light': '#FAF0DC',
        surface: '#FDFCFA',
        border: 'rgba(0,0,0,0.08)',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        app: '480px',
      },
    },
  },
  plugins: [],
}
