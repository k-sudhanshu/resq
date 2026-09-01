'use client';

import { useTranslations } from 'next-intl';

/**
 * The free backend sleeps when idle and takes 10-30s to wake. Showing this is
 * the difference between "slow but working" and "broken".
 */
export default function ColdStartNotice() {
  const t = useTranslations('coldStart');
  return (
    <div className="card flex items-start gap-4 border-primary-fixed bg-surface-low">
      <span
        className="mt-1 h-4 w-4 shrink-0 animate-pulse rounded-full bg-primary-container"
        aria-hidden="true"
      />
      <div>
        <p className="font-semibold text-primary">{t('title')}</p>
        <p className="mt-1 text-onSurface-variant">{t('body')}</p>
      </div>
    </div>
  );
}
