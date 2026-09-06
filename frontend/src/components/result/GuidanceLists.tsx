'use client';

import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';

export function DoNotList({ items }: { items: string[] }) {
  const t = useTranslations('result');
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="section-do-not-do-this" data-purpose="contraindications">
      <div className="space-y-5 rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-rose-200 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <Icon name="block" className="text-xl" />
            </span>
            <div>
              <h2
                className="text-2xl font-black tracking-tight text-rose-950"
                id="section-do-not-do-this"
              >
                {t('doNotTitle')}
              </h2>
              <p className="text-xs font-medium text-rose-800">{t('doNotSubtitle')}</p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-rose-300 bg-rose-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-900 sm:inline">
            {t('doNotBadge')}
          </span>
        </div>
        <ul className="space-y-2.5" role="list">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3.5 rounded-xl border border-rose-200/90 bg-white p-3.5 shadow-sm sm:p-4"
            >
              <span className="mt-0.5 shrink-0 rounded-md border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-rose-800">
                {t('neverBadge')}
              </span>
              <p className="text-sm font-bold leading-snug text-rose-950 instruction-text sm:text-base">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MonitorList({ items }: { items: string[] }) {
  const t = useTranslations('result');
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="section-watch-signs" data-purpose="warning-signs">
      <div className="space-y-5 rounded-2xl border-2 border-amber-200/90 bg-amber-50/70 p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-amber-200/70 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 shadow-sm">
              <Icon name="visibility" className="text-xl" />
            </span>
            <div>
              <h2
                className="text-2xl font-black tracking-tight text-amber-950"
                id="section-watch-signs"
              >
                {t('monitorTitle')}
              </h2>
              <p className="text-xs font-medium text-amber-900">{t('monitorSubtitle')}</p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 sm:inline">
            {t('monitorBadge')}
          </span>
        </div>
        <ul className="space-y-2.5" role="list">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3.5 rounded-xl border border-amber-200/70 bg-white p-3.5 shadow-sm sm:p-4"
            >
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
              <p className="text-sm font-bold leading-snug text-slate-900 instruction-text sm:text-base">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
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
    <section aria-labelledby="section-medical-followup" data-purpose="medical-follow-up">
      <div className="space-y-4 rounded-2xl border-2 border-slate-300/80 bg-slate-100/90 p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-800">
              <Icon name="medical_services" className="text-lg" />
            </span>
            <h2
              className="text-2xl font-bold tracking-tight text-slate-900"
              id="section-medical-followup"
            >
              {t('followUpTitle')}
            </h2>
          </div>
          <span className="hidden shrink-0 rounded-full border border-slate-300 bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-800 sm:inline">
            {t('followUpBadge')}
          </span>
        </div>
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${required ? 'bg-rose-500' : 'bg-emerald-500'}`}
            />
            {required ? t('followUpRequired') : t('followUpNotRequired')}
          </p>
          {reason && (
            <p className="pl-4 text-sm leading-relaxed text-slate-600 instruction-text sm:text-base">
              {reason}
            </p>
          )}
        </div>
      </div>
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
    <section aria-labelledby="section-based-on" data-purpose="evidence-sources">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2.5">
            <Icon name="verified" className="text-xl text-slate-600" />
            <h2
              className="text-lg font-bold tracking-tight text-[#0c2340] sm:text-xl"
              id="section-based-on"
            >
              {t('sourcesTitle')}
            </h2>
          </div>
          <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
            {t('sourcesSubtitle')}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {sources.map((source) => (
            <a
              key={source.source_id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100"
            >
              <p className="text-xs font-bold text-slate-900 group-hover:text-sky-800">
                {source.label}
              </p>
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
