import { Context } from 'aws-lambda'
// eslint-disable-next-line import/no-named-as-default
import pino, {
  destination,
  Logger,
  LoggerOptions as PinoLoggerOptions,
} from 'pino'

type LoggerOptions = {
  service: string
  prettyPrint?: ConstrainBoolean
  mixin?: PinoLoggerOptions['mixin']
}

function createBaseLogger({
  service,
  prettyPrint,
  mixin,
}: LoggerOptions): Logger {
  const defaults: PinoLoggerOptions = {
    name: service,
    messageKey: 'message',
    nestedKey: 'payload', // Any objects passed to logger will be nested in payload, so they don't pollute metadata
    base: undefined, // Disable logging of host and pid
    // Add user readable level label text
    formatters: {
      level(label: string, number: number) {
        return { level: number, severity: label.toUpperCase() }
      },
    },
    // Add user readable datetime
    timestamp: prettyPrint
      ? () =>
          // User readable timestamp
          `"time":"${new Date().toLocaleString('en-SG', {
            timeZone: 'Asia/Singapore',
          })}"`
      : () =>
          // Log unix and user readable timestamp
          `,"time":"${Date.now()}","datetime":"${new Date().toLocaleString(
            'en-SG',
            {
              timeZone: 'Asia/Singapore',
            },
          )}"`,
    mixin,
  }

  return pino(defaults, destination({ sync: true }))
}

const contextStore: { context?: Context } = {}

export interface LambdaLogger extends Logger {
  setContext: (context: Context) => void
}

export function getLambdaLogger(
  functionName: string,
  prettyPrint = false,
): LambdaLogger {
  const logger = createBaseLogger({
    service: functionName,
    prettyPrint,
    mixin: () => ({ reqId: contextStore.context?.awsRequestId }),
  }) as LambdaLogger

  logger.setContext = (context: Context) => {
    contextStore.context = context
  }

  return logger
}
