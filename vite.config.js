import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/20260529/',   // ← 加這行，和倉庫名稱一樣
})
