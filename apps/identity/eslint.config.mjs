import { defineConfig } from '@moauth/eslint-config'

export default defineConfig({
  type: 'app',
  astro: true,
  formatters: {
    astro: true,
    html: true,
    css: true,
    prettierOptions: {
      plugins: ['prettier-plugin-tailwindcss'],
    },
  },
})
