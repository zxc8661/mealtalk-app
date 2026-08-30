import { ApiError } from '@/api/api-error';

type FieldDetail = { readonly field?: unknown; readonly message?: unknown };

/**
 * Pulls the per-field messages the API returns in `details`, so a validation
 * failure can say which value was rejected instead of a generic sentence.
 */
function fieldMessages(error: ApiError): string[] {
  if (!Array.isArray(error.details)) return [];
  return error.details
    .map((entry) => (entry as FieldDetail)?.message)
    .filter((message): message is string => typeof message === 'string' && message.length > 0);
}

/**
 * The sentence to show for a failed request.
 *
 * The API answers every error with `{message, code, details}`, so its message is
 * preferred; the fallbacks only cover transport failures and older responses.
 */
export function requestMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  if (error.kind === 'network') return error.message;

  const details = fieldMessages(error);
  if (details.length > 0) return `${error.message} (${details.join(', ')})`;
  return error.message;
}
