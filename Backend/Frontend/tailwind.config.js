/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101C29',
        inkdeep: '#0A141F',
        paper: '#F6F2E9',
        paperdim: '#EDE7D8',
        signal: '#E3A23C',
        signaldeep: '#C6822A',
        current: '#3E8E82',
        alert: '#C1543C',
        slate: '#5B6472',
        slatelight: '#8A93A0',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      letterSpacing: {
        widish: '0.08em',
        stamp: '0.16em',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        stampin: {
          '0%': { transform: 'scale(1.4) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'scale(0.95) rotate(-8deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-8deg)', opacity: '1' },
        },
        countup: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        scanline: 'scanline 1.8s linear infinite',
        stampin: 'stampin 0.4s cubic-bezier(0.2,0.8,0.2,1) both',
        countup: 'countup 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
