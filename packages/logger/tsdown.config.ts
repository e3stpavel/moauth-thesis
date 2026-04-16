import { defineConfig } from 'tsdown'

export default defineConfig({
  name: '@moauth/logger',
  entry: ['src/logger.ts'],
  sourcemap: true,
})
