import type { AstroIntegration } from 'astro'
import type { Plugin as VitePlugin } from 'vite'
import { code } from './utils'
import './module.d.ts'

function plugin(): VitePlugin {
  const virtualModuleId = 'moauth:logger'
  const resolvedVirtualModuleId = `\0${virtualModuleId}`

  return {
    name: 'vite-plugin-logger',

    resolveId: (id) => {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load: (id) => {
      if (id !== resolvedVirtualModuleId) {
        return
      }

      return code`
        import { Logger, devDestination } from '@moauth/logger/core'

        export const logger = new Logger({ level: 'debug', dest: devDestination })
      `
    },
  }
}

export default function loggerIntegration(): AstroIntegration {
  return {
    name: '@moauth/logger',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        // TODO: different logger dest for prod exporting JSON
        updateConfig({
          vite: {
            plugins: [plugin()],
          },
        })
      },
    },
  }
}
