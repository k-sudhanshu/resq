'use client';

import { useLocale, useTranslations } from 'next-intl';
import Icon from '@/components/Icon';
import { useRouter } from '@/i18n/navigation';
import { acceptConsent } from '@/lib/session';
import { otherLocale, type Locale } from '@/i18n/routing';

/**
 * Shown once before anything else. Two jobs: make clear this is not medical
 * treatment, and offer the emergency numbers immediately for anyone who
 * should be dialling instead of reading.
 */
export default function ConsentScreen() {
  const locale = useLocale() as Locale;
  const t = useTranslations('consent');
  const router = useRouter();

  function accept() {
    acceptConsent();
    router.replace('/');
  }

  const features = [
    { label: t('featureSteps'), hint: t('featureStepsHint') },
    { label: t('featureLanguage'), hint: t('featureLanguageHint') },
    { label: t('featurePrivate'), hint: t('featurePrivateHint') },
  ];

  const sources = [
    t('sourceWho'),
    t('sourceNhs'),
    t('sourceIrcs'),
    t('sourceMohfw'),
  ];

  return (
    <div className="flex flex-col justify-between">
      <div className="space-y-4">
        <section className="text-left">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase text-amber-900">
            <Icon name="info" className="h-3.5 w-3.5 text-amber-600" />
            {t('disclosure')}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-950">
            {t('title')}
          </h1>
          <p
            className="mt-1 text-sm font-medium leading-snug text-slate-600"
            lang={otherLocale(locale)}
          >
            {t('titleAlt')}
          </p>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-red-200/90 bg-gradient-to-b from-rose-50/95 to-red-50/80 p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="consent-pulse-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <Icon name="emergency" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight text-red-950">
                {t('emergencyTitle')}
              </h2>
              <p className="text-xs font-semibold text-red-900">{t('emergencyBody')}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-base font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98]"
            >
              <Icon name="call" className="h-4 w-4 text-red-100" />
              {t('call112')}
            </a>
            <a
              href="tel:108"
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-base font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98]"
            >
              <Icon name="local_shipping" className="h-4 w-4 text-red-100" />
              {t('call108')}
            </a>
          </div>
          <p className="mt-2.5 border-t border-red-200/60 pt-2 text-center text-[11px] font-medium text-red-800">
            {t('emergencyNote')}
          </p>
        </section>

        <section className="space-y-2.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            {t('disclaimerTitle')}
          </h2>
          <div className="space-y-2 text-xs font-medium">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <span className="font-semibold text-slate-800">{feature.label}</span>
                <span className="ml-auto font-normal text-slate-500">{feature.hint}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/70 to-emerald-50/30 p-3.5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="verified" className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-900">
              {t('sourcesTitle')}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {source}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 space-y-2 bg-gradient-to-t from-surface via-surface/90 to-transparent pb-2 pt-3">
        <button
          type="button"
          onClick={accept}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-emerald-900 active:scale-[0.98]"
        >
          {t('accept')}
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-emerald-200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              d="M14 5l7 7m0 0l-7 7m7-7H3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="text-center text-[11px] font-medium text-slate-500">
          {t('acceptHint')}
        </p>
      </div>
    </div>
  );
}
