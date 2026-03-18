import { defineConfig } from 'tsdown'

export default defineConfig({
  name: '@minoauth/logger',
  entry: ['src/logger.ts'],
  sourcemap: true,
})
