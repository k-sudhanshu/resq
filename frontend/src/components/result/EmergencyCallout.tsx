'use client';

import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';

/**
 * The CRITICAL screen. Red is used only here, and the call buttons sit above
 * everything else so that dialling is the first thing available.
 */
export default function EmergencyCallout({
  call112,
  call108,
}: {
  call112: boolean;
  call108: boolean;
}) {
  const t = useTranslations('result');

  return (
    <section
      className="rounded-lg border-2 border-critical bg-critical-container p-5"
      role="alert"
    >
      <div className="flex items-center gap-3">
        <Icon name="emergency" className="text-3xl text-critical" />
        <h2 className="text-headline-md text-critical-onContainer">
          {t('criticalBanner')}
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {call112 && (
          <a href="tel:112" className="btn-critical">
            <Icon name="call" />
            {t('call112')}
          </a>
        )}
        {call108 && (
          <a href="tel:108" className="btn-critical">
            <Icon name="local_shipping" />
            {t('call108')}
          </a>
        )}
      </div>
    </section>
  );
}
