declare module 'moauth:logger' {
  type Logger = import('./logger').Logger
  export const logger: Logger
}
