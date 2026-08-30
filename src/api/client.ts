import { ApiError, type ApiErrorDetails } from './api-error';

type ApiRequestOptions = {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly headers?: Readonly<Record<string, string>>;
};

type ApiClientOptions = {
  readonly baseUrl: string;
  readonly getAccessToken: () => string | null;
  readonly onUnauthorized: () => Promise<void>;
  readonly fetchImplementation?: typeof fetch;
};

type ErrorEnvelope = {
  readonly message?: unknown;
  readonly code?: unknown;
  readonly details?: unknown;
};

export type ApiClient = {
  request<Response>(path: string, options?: ApiRequestOptions): Promise<Response>;
};

function asErrorDetails(value: unknown): ApiErrorDetails {
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) return value as Readonly<Record<string, unknown>>;
  return null;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text.length === 0) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    if (!response.ok) return text;
    throw new ApiError({
      kind: 'invalid-response',
      message: '서버 응답을 읽을 수 없습니다.',
      status: response.status,
      cause,
    });
  }
}

export function createApiClient({
  baseUrl,
  getAccessToken,
  onUnauthorized,
  fetchImplementation = fetch,
}: ApiClientOptions): ApiClient {
  async function clearUnauthorizedSession(): Promise<void> {
    try {
      await onUnauthorized();
    } catch (error) {
      console.warn('401 응답 후 저장된 세션을 완전히 삭제하지 못했습니다.', error);
    }
  }

  return {
    async request<ResponseBody>(
      path: string,
      options: ApiRequestOptions = {},
    ): Promise<ResponseBody> {
      const token = getAccessToken();
      const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';

      let response: Response;
      try {
        response = await fetchImplementation(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
          method: options.method ?? 'GET',
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal,
        });
      } catch (cause) {
        throw new ApiError({
          kind: 'network',
          message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          cause,
        });
      }

      let body: unknown;
      try {
        body = await parseBody(response);
      } catch (error) {
        if (response.status === 401) await clearUnauthorizedSession();
        throw error;
      }

      if (!response.ok) {
        if (response.status === 401) await clearUnauthorizedSession();
        const envelope =
          typeof body === 'object' && body !== null ? (body as ErrorEnvelope) : undefined;
        throw new ApiError({
          kind: 'http',
          message:
            typeof envelope?.message === 'string'
              ? envelope.message
              : '요청을 처리하지 못했습니다.',
          status: response.status,
          code: typeof envelope?.code === 'string' ? envelope.code : undefined,
          details: asErrorDetails(envelope?.details),
        });
      }

      return body as ResponseBody;
    },
  };
}
