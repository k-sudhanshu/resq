'use client';

import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';
import type { RiskLevel } from '@/lib/types';

const TONE = {
  URGENT: {
    card: 'bg-rose-50/90 border-rose-200',
    divider: 'border-rose-200/60',
    iconWrap: 'bg-rose-100 text-rose-700',
    pill: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-600',
    title: 'text-rose-950',
    icon: 'emergency',
    pillKey: 'urgentPill',
    bannerKey: 'urgentBanner',
  },
  NON_URGENT: {
    card: 'bg-emerald-50/90 border-emerald-200',
    divider: 'border-emerald-200/60',
    iconWrap: 'bg-emerald-100 text-emerald-800',
    pill: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-600',
    title: 'text-emerald-950',
    icon: 'check',
    pillKey: 'nonUrgentPill',
    bannerKey: 'nonUrgentBanner',
  },
} as const;

export default function TriageBanner({
  riskLevel,
  summary,
}: {
  riskLevel: Exclude<RiskLevel, 'CRITICAL'>;
  summary: string;
}) {
  const t = useTranslations('result');
  const tone = TONE[riskLevel];

  return (
    <section className="space-y-4" data-purpose="triage-status">
      <div className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${tone.card}`}>
        <div
          className={`flex flex-col justify-between gap-3 border-b pb-3.5 sm:flex-row sm:items-center ${tone.divider}`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${tone.iconWrap}`}
            >
              <Icon name={tone.icon} className="text-xl" />
            </span>
            <div>
              <div
                className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${tone.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {t(tone.pillKey)}
              </div>
              <h1
                className={`text-xl font-black tracking-tight sm:text-2xl ${tone.title}`}
              >
                {t(tone.bannerKey)}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2.5 pt-3">
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
