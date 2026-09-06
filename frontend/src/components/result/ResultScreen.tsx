'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ActionSteps from './ActionSteps';
import DegradedNotice from './DegradedNotice';
import EmergencyCallout from './EmergencyCallout';
import { DoNotList, FollowUpCard, MonitorList, SourceList } from './GuidanceLists';
import TriageBanner from './TriageBanner';
import ErrorNotice from '@/components/ErrorNotice';
import Icon from '@/components/Icon';
import { ApiError, fetchAnalysis } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { AnalysisResult } from '@/lib/types';

export default function ResultScreen({ analysisId }: { analysisId: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('result');
  const common = useTranslations('common');

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Re-fetched on load so a refresh or a shared tab still works; the read is
    // scoped to the session that created it.
    fetchAnalysis(analysisId)
      .then((body) => {
        if (!cancelled) setResult(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId, attempt]);

  if (error) {
    const notFound =
      error instanceof ApiError &&
      (error.code === 'NOT_FOUND' || error.code === 'SESSION_INVALID');

    return (
      <div className="flex flex-col gap-4">
        {notFound ? (
          <div className="card" role="alert">
            <p className="text-onSurface">{t('notFound')}</p>
          </div>
        ) : (
          <ErrorNotice
            error={error}
            onRetry={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          />
        )}
        <Link href="/" className="btn-primary">
          {common('startOver')}
        </Link>
      </div>
    );
  }

  if (!result) {
    return <p className="text-onSurface-variant">{common('loading')}</p>;
  }

  // A stored result is not translated when the language is switched; it is
  // shown in the language it was generated in, with an offer to re-run.
  const languageMismatch = result.language !== locale;

  return (
    <div className="flex flex-col gap-7 pb-24">
      {result.risk_level === 'CRITICAL' ? (
        <EmergencyCallout
          call112={result.emergency.call_112}
          call108={result.emergency.call_108}
          summary={result.summary}
        />
      ) : (
        <TriageBanner riskLevel={result.risk_level} summary={result.summary} />
      )}

      <DegradedNotice source={result.source} />

      {languageMismatch && (
        <aside className="card border-primary-fixed bg-surface-low">
          <p className="text-onSurface-variant">
            {t('languageNotice', {
              language: result.language === 'hi' ? 'हिंदी' : 'English',
            })}
          </p>
          <Link href="/" className="btn-secondary mt-3">
            {t('reanalyze')}
          </Link>
        </aside>
      )}

      <ActionSteps steps={result.immediate_actions} />
      <DoNotList items={result.do_not} />
      <MonitorList items={result.monitor} />
      <FollowUpCard
        required={result.medical_follow_up.required}
        reason={result.medical_follow_up.reason}
      />
      <SourceList sources={result.sources} />

      <section className="space-y-4 pt-2" data-purpose="user-flow-actions">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c2340] px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:flex-1"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('newAssessment')}
          </Link>
          <a
            href="tel:112"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-6 py-3.5 text-center text-base font-bold text-rose-800 transition-colors hover:bg-rose-100 sm:w-auto"
          >
            <Icon name="call" className="text-lg text-rose-700" />
            {t('call112')}
          </a>
        </div>
        <p className="text-center text-xs font-normal text-slate-500">
          {t('disclaimer')}
        </p>
      </section>

      <aside
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300/80 bg-slate-200/95 px-4 py-3.5 text-center backdrop-blur-sm"
        data-purpose="emergency-hotline-banner"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-2 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-600" />
            <span>{t('emergencyFooter')}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              <Icon name="call" className="text-xs" />
              {t('call112National')}
            </a>
            <a
              href="tel:108"
              className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-900"
            >
              <Icon name="call" className="text-xs" />
              {t('call108Short')}
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
