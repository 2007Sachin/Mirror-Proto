import { ZodError } from 'zod'
import type { ErrorHandler } from 'hono'
import { ProviderFailure } from '../providers/nim.js'

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(code)
    this.name = 'AppError'
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'invalid_request_body',
        issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      },
      400,
    )
  }
  if (err instanceof AppError) {
    return c.json({ error: err.code, ...err.extra }, err.status as 400)
  }
  if (err instanceof ProviderFailure) {
    return c.json({ error: 'reflection_provider_failed' }, 502)
  }
  console.error('unhandled error', err.message)
  return c.json({ error: 'internal_error' }, 500)
}
