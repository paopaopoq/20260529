import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/20260529/',   // ← 加這行，和倉庫名稱一樣
})
