import { defineConfig } from '@minoauth/eslint-config'

export default defineConfig({
  type: 'lib',
  ignores: [
    'apps/**',
    'packages/**',
  ],
})
