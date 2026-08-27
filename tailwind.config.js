module.exports = {
  content: [
    './layouts/**/*.html',
    './content/**/*.md',
    './content/**/*.html',
    './src/*.js',
    './src/**/*.vue',
    './node_modules/flowbite/**/*.js'
  ],
  safelist: [
    'w-64',
    'w-1/2',
    'rounded-l-lg',
    'rounded-r-lg',
    'bg-gray-200',
    'grid-cols-4',
    'grid-cols-7',
    'h-6',
    'leading-6',
    'h-9',
    'leading-9',
    'shadow-lg',
    'bg-opacity-50',
    'dark:bg-opacity-80'
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        //primary: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8", "800": "#1e40af", "900": "#1e3a8a" }
        colors: {
          // Azul Pizarra Corporativo (Primario)
          brand: {
            50: '#f2f5f7',
            100: '#e1e7eb',
            500: '#2B4352', // Tono Base
            600: '#213440', // Hover
            700: '#192630',
          },
          // Rojo Automotriz (Acento & Alertas)
          accent: {
            50: '#fef2f2',
            100: '#fee2e2',
            500: '#D9011B', // Tono Base
            600: '#b50116', // Hover
          }
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
        'body': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      },
      transitionProperty: {
        'width': 'width'
      },
      textDecoration: ['active'],
    },
  },

  plugins: [
    require('flowbite/plugin')({
      charts: true,
  })
  ],
}
