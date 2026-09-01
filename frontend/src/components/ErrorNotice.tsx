'use client';

import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api';

/**
 * All error wording comes from the message files, keyed by the machine code
 * the backend returned. That is what keeps error text available in Hindi.
 */
export default function ErrorNotice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const t = useTranslations('errors');
  const common = useTranslations('common');

  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  const seconds =
    error instanceof ApiError ? (error.retryAfterSeconds ?? 30) : 30;

  return (
    <div
      className="card border-critical-container bg-critical-container"
      role="alert"
    >
      <p className="text-critical-onContainer">{t(code, { seconds })}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          {common('retry')}
        </button>
      )}
    </div>
  );
}
