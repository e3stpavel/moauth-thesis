declare module 'minoauth:logger' {
  type Logger = import('./logger').Logger
  export const logger: Logger
}
