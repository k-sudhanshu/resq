'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { acceptConsent } from '@/lib/session';

/**
 * Shown once before anything else. Two jobs: make clear this is not medical
 * treatment, and offer the emergency numbers immediately for anyone who
 * should be dialling instead of reading.
 */
export default function ConsentScreen() {
  const t = useTranslations('consent');
  const router = useRouter();

  function accept() {
    acceptConsent();
    router.replace('/');
  }

  const sources = [
    t('sourceWho'),
    t('sourceNhs'),
    t('sourceIrcs'),
    t('sourceMohfw'),
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-headline-lg text-primary">{t('title')}</h1>
        <p className="mt-2 text-onSurface-variant">{t('subtitle')}</p>
      </header>

      <section className="card border-critical-container bg-critical-container">
        <h2 className="text-headline-md text-critical-onContainer">
          {t('emergencyTitle')}
        </h2>
        <p className="mt-2 text-critical-onContainer">{t('emergencyBody')}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a href="tel:112" className="btn-critical">
            {t('call112')}
          </a>
          <a href="tel:108" className="btn-critical">
            {t('call108')}
          </a>
        </div>
      </section>

      <section className="card">
        <h2 className="text-headline-md text-primary">{t('disclaimerTitle')}</h2>
        <p className="mt-2 text-onSurface-variant">{t('disclaimerBody')}</p>
      </section>

      <section className="card border-tertiary-container bg-tertiary-container">
        <h2 className="text-headline-md text-tertiary">{t('sourcesTitle')}</h2>
        <p className="mt-2 text-tertiary">{t('sourcesBody')}</p>
        <ul className="mt-3 flex flex-col gap-1 text-primary-container">
          {sources.map((source) => (
            <li key={source}>• {source}</li>
          ))}
        </ul>
      </section>

      <button type="button" onClick={accept} className="btn-positive">
        {t('accept')}
      </button>
    </div>
  );
}
