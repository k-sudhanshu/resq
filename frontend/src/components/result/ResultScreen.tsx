'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ActionSteps from './ActionSteps';
import DegradedNotice from './DegradedNotice';
import EmergencyCallout from './EmergencyCallout';
import { DoNotList, FollowUpCard, MonitorList, SourceList } from './GuidanceLists';
import ErrorNotice from '@/components/ErrorNotice';
import { ApiError, fetchAnalysis } from '@/lib/api';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { AnalysisResult } from '@/lib/types';

const BANNER_KEY = {
  CRITICAL: 'criticalBanner',
  URGENT: 'urgentBanner',
  NON_URGENT: 'nonUrgentBanner',
} as const;

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

  const critical = result.risk_level === 'CRITICAL';
  // A stored result is not translated when the language is switched; it is
  // shown in the language it was generated in, with an offer to re-run.
  const languageMismatch = result.language !== locale;

  return (
    <div className="flex flex-col gap-6">
      {critical ? (
        <EmergencyCallout
          call112={result.emergency.call_112}
          call108={result.emergency.call_108}
        />
      ) : (
        <section
          className={`card ${
            result.risk_level === 'URGENT'
              ? 'border-critical bg-critical-container'
              : 'border-tertiary-container bg-tertiary-container'
          }`}
        >
          <h2
            className={`text-headline-md ${
              result.risk_level === 'URGENT'
                ? 'text-critical-onContainer'
                : 'text-tertiary'
            }`}
          >
            {t(BANNER_KEY[result.risk_level])}
          </h2>
        </section>
      )}

      <p className="text-instruction-xl text-onSurface instruction-text">
        {result.summary}
      </p>

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

      <p className="text-label-sm text-onSurface-variant">{t('disclaimer')}</p>

      <Link href="/" className="btn-secondary">
        {t('newAssessment')}
      </Link>
    </div>
  );
}
