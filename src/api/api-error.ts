export type ApiErrorKind = 'http' | 'network' | 'invalid-response';

export type ApiErrorDetails = Readonly<Record<string, unknown>> | readonly unknown[] | null;

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly details: ApiErrorDetails;

  constructor(options: {
    readonly kind: ApiErrorKind;
    readonly message: string;
    readonly status?: number;
    readonly code?: string;
    readonly details?: ApiErrorDetails;
    readonly cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.details = options.details ?? null;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}
