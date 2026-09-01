'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AnalyzingScreen from '@/components/AnalyzingScreen';
import ErrorNotice from '@/components/ErrorNotice';
import ImagePicker from '@/components/input/ImagePicker';
import VoiceInput from '@/components/input/VoiceInput';
import PatientContextPicker from '@/components/assess/PatientContextPicker';
import { createAnalysis } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { PatientContext } from '@/lib/types';

const MAX_CHARS = 2000;

/**
 * The free-text path. Input may be English, Hindi, or Hinglish — it is sent
 * exactly as typed and interpreted by the model, never machine-translated
 * first.
 */
export default function DescribeScreen() {
  const locale = useLocale() as Locale;
  const t = useTranslations('describe');
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [patient, setPatient] = useState<PatientContext | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [touched, setTouched] = useState(false);

  if (submitting) {
    return <AnalyzingScreen />;
  }

  const missingDescription = touched && description.trim().length === 0;

  async function submit() {
    setTouched(true);
    if (description.trim().length === 0) return;

    setError(null);
    setSubmitting(true);
    try {
      const result = await createAnalysis(
        locale,
        {
          language: locale,
          category_key: 'other',
          patient_context: patient ?? 'unknown',
          answers: null,
          description: description.trim(),
        },
        image
      );
      router.push(`/result/${result.id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-headline-lg text-primary">{t('title')}</h1>
        <p className="mt-2 text-onSurface-variant">{t('subtitle')}</p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="rounded-md border-2 border-primary-container bg-surface-lowest p-3">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, MAX_CHARS))}
            onBlur={() => setTouched(true)}
            rows={5}
            placeholder={t('placeholder')}
            aria-label={t('title')}
            className="w-full resize-none bg-transparent text-body-md outline-none"
          />
          <div className="flex items-end justify-between gap-3">
            <span className="text-label-sm text-onSurface-variant">
              {description.length}/{MAX_CHARS}
            </span>
            <VoiceInput
              compact
              onTranscript={(text) => setDescription(text.slice(0, MAX_CHARS))}
            />
          </div>
        </div>
        {missingDescription && (
          <p className="text-critical-onContainer" role="alert">
            {t('required')}
          </p>
        )}
      </div>

      <PatientContextPicker
        variant="chips"
        value={patient}
        onChange={setPatient}
      />
      <ImagePicker file={image} onChange={setImage} />

      {error ? <ErrorNotice error={error} /> : null}

      <button type="button" onClick={submit} className="btn-primary">
        {t('submit')}
      </button>
    </div>
  );
}
