import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Split heavy vendor libraries into separate cacheable chunks
        manualChunks(id: string) {
          if (id.includes('node_modules/tone'))       return 'vendor-tone';
          if (id.includes('node_modules/vexflow'))    return 'vendor-vexflow';
          if (id.includes('node_modules/jspdf'))      return 'vendor-pdf';
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/'))     return 'vendor-react';
        },
      },
    },
  },
})
