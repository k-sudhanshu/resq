'use client';

import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';
import type { GuidanceSource } from '@/lib/types';

/**
 * Says plainly where the guidance came from when it did not come from the AI.
 * `fallback` means the AI was unavailable or its answer failed a safety or
 * language check; `rules` means the answers themselves triggered an emergency
 * rule and verified content was returned without calling the AI at all.
 */
export default function DegradedNotice({ source }: { source: GuidanceSource }) {
  const t = useTranslations('result');
  if (source === 'ai') return null;

  const isRules = source === 'rules';

  return (
    <aside
      className={`card ${isRules ? 'border-primary-fixed bg-surface-low' : 'border-warning-container bg-warning-container'}`}
    >
      <div className="flex gap-3">
        <Icon name={isRules ? 'verified' : 'info'} className="mt-1" />
        <div>
          <p className="font-semibold text-onSurface">
            {isRules ? t('rulesTitle') : t('degradedTitle')}
          </p>
          <p className="mt-1 text-onSurface-variant">
            {isRules ? t('rulesBody') : t('degradedBody')}
          </p>
        </div>
      </div>
    </aside>
  );
}
