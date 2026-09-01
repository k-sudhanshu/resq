'use client';

import { useTranslations } from 'next-intl';
import type { ActionStep } from '@/lib/types';

export default function ActionSteps({ steps }: { steps: ActionStep[] }) {
  const t = useTranslations('result');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-headline-md text-primary">{t('actionsTitle')}</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step) => (
          <li key={step.step} className="card flex gap-4 border-tertiary-container">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary-bright text-tertiary-on"
              aria-hidden="true"
            >
              {step.step}
            </span>
            <div>
              {/* instruction-xl sizing: readable at arm's length, on a shaking
                  phone, by someone who is panicking. */}
              <h3 className="text-instruction-xl text-onSurface instruction-text">
                {step.title}
              </h3>
              <p className="mt-1 text-onSurface-variant instruction-text">
                {step.instruction}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
