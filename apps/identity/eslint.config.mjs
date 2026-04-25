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

  // enforce single quotes for snake_case
  rules: {
    'camelcase': 'error',
    'dot-notation': ['error', { allowPattern: '^[a-z]+(_[a-z]+)+$' }],
    'style/quote-props': ['error', 'consistent'],
  },
})
