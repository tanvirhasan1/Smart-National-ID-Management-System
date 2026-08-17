import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // server: {
  //   host: '0.0.0.0',
  //   allowedHosts: [
  //     'localhost',
  //     '127.0.0.1',
  //     '.onrender.com',
  //   ],
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:5000',
  //       changeOrigin: true,
  //       secure: false
  //     }
  //   }
  // }


  server: {
  host: '0.0.0.0',
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    '.ngrok-free.dev',
    '.ngrok-free.app'
  ],
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false
    }
  }
}
})


