export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, errors?: unknown) {
    super(422, message, errors);
    this.name = 'ValidationError';
  }
}
