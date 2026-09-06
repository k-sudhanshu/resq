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
  summary,
}: {
  call112: boolean;
  call108: boolean;
  summary: string;
}) {
  const t = useTranslations('result');

  return (
    <section className="space-y-4" data-purpose="triage-status" role="alert">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-rose-200/60 pb-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 shadow-sm">
              <Icon name="emergency" className="text-xl" />
            </span>
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                {t('criticalPill')}
              </div>
              <h1 className="text-xl font-black tracking-tight text-rose-950 sm:text-2xl">
                {t('criticalBanner')}
              </h1>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {call112 && (
            <a
              href="tel:112"
              className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              <Icon name="call" className="text-lg" />
              {t('call112')}
            </a>
          )}
          {call108 && (
            <a
              href="tel:108"
              className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-slate-900"
            >
              <Icon name="local_shipping" className="text-lg" />
              {t('call108')}
            </a>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2.5 pt-1">
          <Icon name="info" className="mt-0.5 text-lg text-slate-500" />
          <p className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">
            {t('triageLabel')}{' '}
            <span className="font-normal text-slate-700 instruction-text">
              {summary}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
