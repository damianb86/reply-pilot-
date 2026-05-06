import {useEffect, useMemo, useRef, useState} from 'react';

const DEFAULT_TIMEOUT_MS = 20000;

export function useFetcherTimeout(fetcher, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const message =
    options.message ??
    'This is taking longer than expected. Please try again later.';
  const intent = String(fetcher.formData?.get('intent') ?? options.intent ?? 'request');
  const activeFormData = useRef(null);
  const activeRequestId = useRef(0);
  const previousState = useRef('idle');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (fetcher.state === 'idle') {
      setTimedOut(false);
      activeFormData.current = null;
      previousState.current = 'idle';
      return undefined;
    }

    const isNewRequest =
      previousState.current === 'idle' ||
      (fetcher.formData && activeFormData.current !== fetcher.formData);

    if (isNewRequest) {
      setTimedOut(false);
      activeFormData.current = fetcher.formData;
      activeRequestId.current += 1;
    }

    previousState.current = fetcher.state;
    const requestId = activeRequestId.current;
    const timer = window.setTimeout(() => {
      if (activeRequestId.current === requestId) {
        setTimedOut(true);
      }
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [fetcher.formData, fetcher.state, timeoutMs]);

  const result = useMemo(() => (
    timedOut
      ? {
          ok: false,
          intent,
          message,
          error: {
            message,
            timeoutMs,
          },
        }
      : null
  ), [intent, message, timedOut, timeoutMs]);

  return {
    timedOut,
    pending: fetcher.state !== 'idle' && !timedOut,
    result,
  };
}
