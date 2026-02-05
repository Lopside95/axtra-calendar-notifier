import logger from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attemptNumber: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'RATE_LIMIT_EXCEEDED',
  ],
  onRetry: () => {},
};

/**
 * Checks if an error is retryable based on error codes and status codes
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  // Check for network errors
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Check for rate limit errors (429) and server errors (500-599)
  const statusCode = error.response?.status || error.statusCode || error.status;
  if (statusCode) {
    if (statusCode === 429) return true; // Rate limit
    if (statusCode >= 500 && statusCode < 600) return true; // Server errors
  }

  // Check for specific Google API errors
  const errorMessage = error.message?.toLowerCase() || '';
  if (errorMessage.includes('rate limit')) return true;
  if (errorMessage.includes('quota exceeded')) return true;
  if (errorMessage.includes('backend error')) return true;
  if (errorMessage.includes('service unavailable')) return true;

  // Don't retry authentication errors
  if (statusCode === 401 || statusCode === 403) return false;
  if (errorMessage.includes('invalid_grant')) return false;
  if (errorMessage.includes('unauthorized')) return false;

  return false;
}

/**
 * Calculates the delay for the next retry using exponential backoff
 */
function calculateDelay(
  attemptNumber: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attemptNumber);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
  return Math.min(delayWithJitter, maxDelayMs);
}

/**
 * Sleeps for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff
 *
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns The result of the successful function call
 * @throws The last error if all retries fail
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => await calendar.events.list({ calendarId: 'primary' }),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // If this is the last attempt or error is not retryable, throw immediately
      if (attempt === config.maxRetries || !isRetryableError(error, config.retryableErrors)) {
        logger.error('Operation failed after retries', {
          attempts: attempt + 1,
          error: error.message,
          code: error.code,
          statusCode: error.response?.status || error.statusCode,
        });
        throw error;
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier
      );

      logger.warn('Retrying operation after error', {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delayMs: Math.round(delayMs),
        error: error.message,
        code: error.code,
        statusCode: error.response?.status || error.statusCode,
      });

      // Call onRetry callback
      config.onRetry(error, attempt + 1, delayMs);

      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Creates a retry wrapper function with pre-configured options
 *
 * @example
 * const retryCalendarAPI = createRetryWrapper({ maxRetries: 5 });
 * const events = await retryCalendarAPI(() => calendar.events.list(...));
 */
export function createRetryWrapper(options: RetryOptions = {}) {
  return <T>(fn: () => Promise<T>): Promise<T> => {
    return retryWithBackoff(fn, options);
  };
}
