import type { VercelResponse } from '@vercel/node';

// Postgres reports a unique-constraint violation with this SQLSTATE. Services
// catch it to turn "someone got there first" into a meaningful response rather
// than a 500.
export const POSTGRES_UNIQUE_VIOLATION = '23505';

// Services throw these so handlers can stay thin. The status travels on the
// error itself rather than being inferred from the class name, which would
// break under any build step that renames classes.
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

// The caller's credentials are missing, invalid or expired. Distinct from a
// 500 so the client can tell "sign in again" apart from "the server broke".
export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(401, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
  }
}

// The request was well-formed but the current state of the data forbids it —
// typically deleting a row something else still depends on.
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
  }
}

// Anything that is not an HttpError is a genuine server fault and keeps the 500
// the existing endpoints return.
export function respondWithError(res: VercelResponse, error: any) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  return res.status(500).json({ error: error?.message ?? 'Internal Server Error' });
}
