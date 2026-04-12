/**
 * Error thrown when the Straw API returns a non-2xx response.
 */
export class StrawApiError extends Error {
  /** HTTP status code. */
  readonly status: number;
  /** Machine-readable error code (e.g. "RATE_LIMITED", "QUOTA_EXHAUSTED"). */
  readonly code: string;
  /** Additional error details from the API. */
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "StrawApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
