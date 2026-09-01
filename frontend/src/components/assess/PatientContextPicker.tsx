'use client';

import { useTranslations } from 'next-intl';
import OptionButton from './OptionButton';
import type { PatientContext } from '@/lib/types';

// "unknown" is deliberately not offered: age bands are broad enough to judge
// by sight, and age is what actually changes the first aid.
const OPTIONS: PatientContext[] = ['baby', 'child', 'adult', 'elderly'];

/**
 * Asked before the assessment questions: guidance changes with age — CPR and
 * choking technique, medicine doses, and frailty differ for babies, children,
 * and the elderly — so the model and the content need the age band.
 */
export default function PatientContextPicker({
  value,
  onChange,
  variant = 'list',
}: {
  value: PatientContext | null;
  onChange: (value: PatientContext) => void;
  variant?: 'list' | 'chips';
}) {
  const t = useTranslations('patient');

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-headline-md text-primary">{t('title')}</h2>
        {variant === 'list' ? (
          <p className="mt-1 text-onSurface-variant">{t('subtitle')}</p>
        ) : null}
      </div>
      {variant === 'chips' ? (
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => onChange(option)}
              className={`min-h-touch rounded-md border px-4 py-2 text-body-md font-semibold ${
                value === option
                  ? 'border-tertiary-bright bg-tertiary-container text-tertiary'
                  : 'border-outline-variant bg-surface-lowest text-onSurface'
              }`}
            >
              {t(option)}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {OPTIONS.map((option) => (
            <OptionButton
              key={option}
              label={t(option)}
              selected={value === option}
              onClick={() => onChange(option)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
