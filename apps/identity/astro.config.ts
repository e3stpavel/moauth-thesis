import db from '@astrojs/db'
import node from '@astrojs/node'
import logger from '@moauth/logger'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  output: 'server',

  adapter: node({
    mode: 'standalone',
  }),

  integrations: [logger(), db({ mode: 'node' })],

  server: {
    host: true,
    port: 3210,
  },
})
