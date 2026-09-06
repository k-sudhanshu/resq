'use client';

import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';
import type { ActionStep } from '@/lib/types';

export default function ActionSteps({ steps }: { steps: ActionStep[] }) {
  const t = useTranslations('result');

  return (
    <section
      aria-labelledby="section-do-this-now"
      className="space-y-4"
      data-purpose="immediate-actions"
    >
      <div className="space-y-5 rounded-2xl border-2 border-emerald-200/90 bg-emerald-50/70 p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-emerald-200/70 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-sm">
              <Icon name="check" className="text-xl" />
            </span>
            <div>
              <h2
                className="text-2xl font-black tracking-tight text-emerald-950"
                id="section-do-this-now"
              >
                {t('actionsTitle')}
              </h2>
              <p className="text-xs font-medium text-emerald-800">
                {t('actionsSubtitle')}
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm sm:inline">
            {t('actionsBadge')}
          </span>
        </div>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li
              key={step.step}
              className="flex items-start gap-4 rounded-xl border border-emerald-200/80 bg-white p-4 shadow-sm sm:p-5"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-base font-bold text-white shadow-sm ring-4 ring-emerald-100"
              >
                {step.step}
              </span>
              <div className="min-w-0 flex-grow space-y-1.5 pt-0.5">
                {/* instruction-xl sizing: readable at arm's length, on a shaking
                    phone, by someone who is panicking. */}
                <h3 className="text-base font-bold leading-tight text-slate-900 instruction-text sm:text-lg">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 instruction-text sm:text-base">
                  {step.instruction}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
