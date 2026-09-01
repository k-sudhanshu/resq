'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';

const STAGE_KEYS = ['checking', 'consulting', 'verifying'] as const;

/**
 * Progress copy that advances on a timer rather than reporting real backend
 * stages. It is honest about what the system is doing in order, and it stops
 * a stressed user from thinking the app has frozen.
 *
 * The screen is deliberately green (the design system's calm/safe colour):
 * the user has just described something frightening, so everything here —
 * the slow pulse, the ticking checkmarks, the reassurance line — is meant to
 * settle them, not to signal urgency.
 */
export default function AnalyzingScreen() {
  const t = useTranslations('analyzing');
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGE_KEYS.length - 1));
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-8 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* A slow, calm pulse rather than a fast spinner. */}
        <span className="absolute h-full w-full animate-ping rounded-full bg-tertiary-container opacity-70" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-bright">
          <Icon name="cardiology" className="h-8 w-8 text-tertiary-on" />
        </span>
      </div>

      <h1 className="text-headline-md text-tertiary">{t('title')}</h1>

      <ul className="flex flex-col gap-2">
        {STAGE_KEYS.map((key, index) => (
          <li
            key={key}
            className={`flex items-center gap-2 ${
              index <= stage ? 'text-onSurface' : 'text-outline-variant'
            }`}
          >
            {index <= stage ? (
              <Icon
                name="check"
                className="pop-in h-5 w-5 shrink-0 text-tertiary-bright"
              />
            ) : (
              <span aria-hidden className="h-5 w-5 shrink-0" />
            )}
            {t(key)}
          </li>
        ))}
      </ul>

      <p className="max-w-xs text-center text-tertiary">{t('reassure')}</p>
    </div>
  );
}
