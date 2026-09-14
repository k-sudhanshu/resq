'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AnalyzingScreen from '@/components/AnalyzingScreen';
import ColdStartNotice from '@/components/layout/ColdStartNotice';
import ErrorNotice from '@/components/ErrorNotice';
import ImagePicker from '@/components/input/ImagePicker';
import OptionButton from './OptionButton';
import PatientContextPicker from './PatientContextPicker';
import ProgressBar from './ProgressBar';
import { checkHealth, createAnalysis, fetchCategory } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Answer, CategoryDetail, PatientContext } from '@/lib/types';

// Age bands do not apply: the person is a pregnant woman, and later
// questions already ask how many months along she is.
const SKIP_AGE_CATEGORIES = new Set(['pregnancy']);

/** Placeholder mirroring the question layout, so loading doesn't jump. */
function QuestionSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      <span className="h-2 w-full rounded bg-surface-container" />
      <span className="h-4 w-24 rounded bg-surface-container" />
      <span className="h-8 w-4/5 rounded bg-surface-container" />
      <div className="flex flex-col gap-3">
        <span className="h-14 rounded-lg bg-surface-container" />
        <span className="h-14 rounded-lg bg-surface-container" />
        <span className="h-14 rounded-lg bg-surface-container" />
      </div>
    </div>
  );
}

/**
 * One question per screen. Answers are collected client-side and submitted in
 * a single request at the end — no round trip per answer, which matters on a
 * weak mobile connection.
 */
export default function AssessScreen({ categoryKey }: { categoryKey: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('assess');
  const common = useTranslations('common');
  const router = useRouter();

  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [waking, setWaking] = useState(false);

  const [patient, setPatient] = useState<PatientContext | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    // This is the first network request of the whole visit (the landing grid
    // is static), so it may hit a sleeping free instance. Probe health in
    // parallel: if the box is waking and the questions haven't arrived,
    // explain the wait instead of leaving a silent skeleton.
    checkHealth().then((awake) => {
      if (!cancelled && !awake && !settled) setWaking(true);
    });

    fetchCategory(categoryKey, locale)
      .then((detail) => {
        if (!cancelled) setCategory(detail);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error);
      })
      .finally(() => {
        settled = true;
        if (!cancelled) setWaking(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetching on locale change is what re-renders the questions in the
    // other language; answer ids are language-neutral, so selections survive.
  }, [categoryKey, locale, attempt]);

  if (loadError) {
    return (
      <ErrorNotice
        error={loadError}
        onRetry={() => {
          setLoadError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        {waking && <ColdStartNotice />}
        <QuestionSkeleton />
        <p className="sr-only">{common('loading')}</p>
      </div>
    );
  }

  if (submitting) {
    return <AnalyzingScreen />;
  }

  const skipAge = SKIP_AGE_CATEGORIES.has(categoryKey);
  const questionOffset = skipAge ? 0 : 1;
  const totalSteps = category.questions.length + (skipAge ? 1 : 2);
  const isPatientStep = !skipAge && step === 0;
  const isPhotoStep = step === category.questions.length + questionOffset;
  const question =
    isPatientStep || isPhotoStep
      ? null
      : category.questions[step - questionOffset];

  async function submit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        language: locale,
        category_key: categoryKey,
        patient_context: patient ?? (skipAge ? 'adult' : 'unknown'),
        answers: Object.entries(answers).map(
          ([question_id, option_id]): Answer => ({ question_id, option_id })
        ),
        description: null,
      };
      const result = await createAnalysis(locale, payload, image);
      router.push(`/result/${result.id}`);
    } catch (error) {
      setSubmitError(error);
      setSubmitting(false);
    }
  }

  const canAdvance = isPatientStep
    ? patient !== null
    : isPhotoStep
      ? true
      : question !== null && answers[question.id] !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar current={step + 1} total={totalSteps} />

      <p className="text-label-sm uppercase text-onSurface-variant">
        {category.label}
      </p>

      {isPatientStep && (
        <PatientContextPicker value={patient} onChange={setPatient} />
      )}

      {question && (
        <section className="flex flex-col gap-4">
          <h2 className="text-headline-md text-primary instruction-text">
            {question.text}
          </h2>
          <p className="text-label-sm text-onSurface-variant">
            {t('progress', {
              current: step - questionOffset + 1,
              total: category.questions.length,
            })}
          </p>
          <div className="flex flex-col gap-3">
            {question.options.map((option) => (
              <OptionButton
                key={option.id}
                label={option.text}
                selected={answers[question.id] === option.id}
                // No auto-advance: the selection stays highlighted so the
                // user can see (and change) their choice before Continue,
                // same as the age step.
                onClick={() =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: option.id,
                  }))
                }
              />
            ))}
          </div>
        </section>
      )}

      {isPhotoStep && <ImagePicker file={image} onChange={setImage} />}

      {submitError ? <ErrorNotice error={submitError} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        {isPhotoStep ? (
          <button type="button" onClick={submit} className="btn-primary">
            {t('submit')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((current) => current + 1)}
            disabled={!canAdvance}
            className="btn-primary"
          >
            {common('continue')}
          </button>
        )}

        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="btn-secondary"
          >
            {common('back')}
          </button>
        )}
      </div>
    </div>
  );
}
