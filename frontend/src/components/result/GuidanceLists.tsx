'use client';

import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';

export function DoNotList({ items }: { items: string[] }) {
  const t = useTranslations('result');
  if (items.length === 0) return null;

  return (
    <section className="card border-critical-container bg-critical-container">
      <h2 className="text-headline-md text-critical-onContainer">
        {t('doNotTitle')}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-critical-onContainer">
            <Icon name="block" className="mt-1 text-xl" />
            <span className="instruction-text">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MonitorList({ items }: { items: string[] }) {
  const t = useTranslations('result');
  if (items.length === 0) return null;

  return (
    <section className="card">
      <h2 className="text-headline-md text-primary">{t('monitorTitle')}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-onSurface-variant">
            <Icon name="visibility" className="mt-1 text-xl" />
            <span className="instruction-text">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FollowUpCard({
  required,
  reason,
}: {
  required: boolean;
  reason: string | null;
}) {
  const t = useTranslations('result');

  return (
    <section className="card">
      <h2 className="text-headline-md text-primary">{t('followUpTitle')}</h2>
      <p className="mt-2 font-semibold text-onSurface">
        {required ? t('followUpRequired') : t('followUpNotRequired')}
      </p>
      {reason && <p className="mt-1 text-onSurface-variant">{reason}</p>}
    </section>
  );
}

export function SourceList({
  sources,
}: {
  sources: { source_id: string; label: string; url: string }[];
}) {
  const t = useTranslations('result');
  if (sources.length === 0) return null;

  return (
    <section className="card">
      <h2 className="text-headline-md text-primary">{t('sourcesTitle')}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.source_id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-container underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
