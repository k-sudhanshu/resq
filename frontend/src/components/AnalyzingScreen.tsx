'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';

const STAGE_KEYS = ['checking', 'consulting', 'verifying', 'generating'] as const;

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
      className="relative flex flex-1 flex-col items-center justify-center px-1 py-8"
      role="status"
      aria-live="polite"
    >
      <div className="relative my-4 flex items-center justify-center">
        <span className="analyze-pulse-ring pointer-events-none absolute h-44 w-44 rounded-full bg-emerald-200/40" />
        <span className="analyze-pulse-ring pointer-events-none absolute h-36 w-36 rounded-full bg-teal-300/30 [animation-delay:1.2s]" />
        <span className="analyze-float relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-700/25 ring-4 ring-white">
          <svg
            aria-hidden="true"
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 72 40"
          >
            <path
              className="opacity-25"
              d="M2 20H18L24 6L33 34L41 12L47 26L52 20H70"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              className="analyze-ecg"
              d="M2 20H18L24 6L33 34L41 12L47 26L52 20H70"
              stroke="#bbf7d0"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.5"
            />
          </svg>
        </span>
      </div>

      <div className="mb-8 mt-2 space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm font-medium text-slate-500">{t('subtitle')}</p>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-7">
        <ul aria-label={t('title')} className="space-y-3.5">
          {STAGE_KEYS.map((key, index) => {
            const done = index < stage;
            const active = index === stage;
            return (
              <li
                key={key}
                className={`flex items-start gap-3.5 rounded-xl p-2 ${
                  active
                    ? 'border border-emerald-200/80 bg-emerald-50/70 shadow-sm'
                    : ''
                } ${!done && !active ? 'opacity-75' : ''}`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? 'border border-emerald-300 bg-emerald-100 text-emerald-700'
                      : active
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? (
                    <Icon name="check" className="pop-in h-3.5 w-3.5" />
                  ) : active ? (
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-30"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-90"
                        d="M4 12a8 8 0 018-8v8H4z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm leading-snug ${
                        active
                          ? 'font-bold text-slate-900'
                          : done
                            ? 'font-semibold text-slate-800'
                            : 'font-medium text-slate-700'
                      }`}
                    >
                      {t(key)}
                    </p>
                    <span
                      className={`shrink-0 text-[11px] font-semibold ${
                        done
                          ? 'rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700'
                          : active
                            ? 'inline-flex items-center gap-1 text-emerald-800'
                            : 'font-medium text-slate-400'
                      }`}
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-600" />
                      )}
                      {done
                        ? t('statusDone')
                        : active
                          ? t('statusWorking')
                          : t('statusNext')}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-xs ${
                      active ? 'text-emerald-900/75' : 'text-slate-500'
                    }`}
                  >
                    {t(`${key}Detail`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
          <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <Icon name="verified" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-800">{t('reassure')}</p>
            <p className="text-xs text-slate-500">{t('reassureStay')}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
        <span className="text-center text-xs font-medium text-slate-500">
          {t('emergencyPrompt')}
        </span>
        <a
          href="tel:112"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
        >
          <Icon name="call" className="h-3.5 w-3.5 text-red-600" />
          {t('callEmergency')}
        </a>
      </div>
    </div>
  );
}
