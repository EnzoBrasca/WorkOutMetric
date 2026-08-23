import type { VercelResponse } from '@vercel/node';

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

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
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
