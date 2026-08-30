import { useEffect } from 'react';

import { ApiError } from '@/api/api-error';
import { useApi } from '@/api/api-context';
import { getE2ESessionProbePath } from '@/config/environment';

/** Runs only when a development browser test injects an explicit probe path. */
export function E2ESessionProbe() {
  const api = useApi();

  useEffect(() => {
    const path = getE2ESessionProbePath();
    if (!path) return;

    void api.request(path).catch((error: unknown) => {
      if (error instanceof ApiError && error.isUnauthorized) return;
      console.warn('E2E 세션 확인 요청이 실패했습니다.', error);
    });
  }, [api]);

  return null;
}
