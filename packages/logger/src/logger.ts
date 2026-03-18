// https://github.com/withastro/astro/blob/main/packages/astro/src/core/logger/core.ts

import colors from 'piccolore'

export interface LogWritable<T> {
  write: (chunk: T) => boolean
}

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent' // same as Pino

export interface LogOptions {
  dest: LogWritable<LogMessage>
  level: LoggerLevel
}

export const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export interface LogMessage {
  label: string | null
  level: LoggerLevel
  message: string
  startTime?: number
}

export const levels: Record<LoggerLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90,
}

function log(
  opts: LogOptions,
  level: LoggerLevel,
  label: string | null,
  message: string,
  startTime?: number,
): void {
  const logLevel = opts.level
  const dest = opts.dest
  const event: LogMessage = {
    label,
    level,
    message,
    startTime,
  }

  // test if this level is enabled or not
  if (!isLogLevelEnabled(logLevel, level)) {
    return // do nothing
  }

  dest.write(event)
}

export function isLogLevelEnabled(configuredLogLevel: LoggerLevel, level: LoggerLevel): boolean {
  return levels[configuredLogLevel] <= levels[level]
}

/**
 * Get the prefix for a log message.
 * This includes the timestamp, log level, and label all properly formatted
 * with colors. This is shared across different loggers, so it's defined here.
 */
export function getEventPrefix({ level, label }: LogMessage): string {
  const timestamp = `${dateTimeFormat.format(new Date())}`
  const prefix = []
  if (level === 'error' || level === 'warn') {
    prefix.push(colors.bold(timestamp))
    prefix.push(`[${level.toUpperCase()}]`)
  }
  else {
    prefix.push(timestamp)
  }
  if (label) {
    prefix.push(`[${label}]`)
  }
  if (level === 'error') {
    return colors.red(prefix.join(' '))
  }
  if (level === 'warn') {
    return colors.yellow(prefix.join(' '))
  }
  if (prefix.length === 1) {
    return colors.dim(prefix[0])
  }
  return `${colors.dim(prefix[0])} ${colors.blue(prefix.splice(1).join(' '))}`
}

/** Print out a timer message for debug() */
export function writeWithTimer(message: string, startTime: number = Date.now()): string {
  const timeDiff = performance.now() - startTime
  const timeDisplay
    = timeDiff < 750 ? `${Math.round(timeDiff)}ms` : `${(timeDiff / 1000).toFixed(1)}s`

  return `${message}   ${colors.dim(timeDisplay)}`
}

export class Logger {
  options: LogOptions
  label: string

  constructor(logging: LogOptions, label: string) {
    this.options = logging
    this.label = label
  }

  /**
   * Creates a new logger instance with a new label, but the same log options.
   */
  fork(label: string): Logger {
    return new Logger(this.options, label)
  }

  info(message: string, startTime?: number): void {
    log(this.options, 'info', this.label, message, startTime)
  }

  warn(message: string, startTime?: number): void {
    log(this.options, 'warn', this.label, message, startTime)
  }

  error(message: string, startTime?: number): void {
    log(this.options, 'error', this.label, message, startTime)
  }

  debug(message: string, startTime?: number): void {
    log(this.options, 'debug', this.label, message, startTime)
  }
}

// https://github.com/withastro/astro/blob/main/packages/astro/src/core/logger/console.ts
export const devDestination: LogWritable<LogMessage> = {
  write(event: LogMessage) {
    let dest = console.error
    if (levels[event.level] < levels.error) {
      // eslint-disable-next-line no-console
      dest = console.info
    }

    let message = `${getEventPrefix(event)} ${event.message}`
    if (typeof event.startTime === 'number') {
      message = writeWithTimer(message, event.startTime)
    }

    dest(message)
    return true
  },
}
