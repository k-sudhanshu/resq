'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Icon from '@/components/Icon';
import type { Locale } from '@/i18n/routing';
import { isSpeechSupported, startlistening, type SpeechSession } from '@/lib/speech';

// Browser capability never changes during a visit, so there is nothing to
// subscribe to. The server snapshot assumes support and the client corrects it
// on hydration, which avoids hiding the button for browsers that do have it.
const neverChanges = () => () => {};
const supportedOnServer = () => true;

/**
 * Speech recognition follows the UI locale (hi-IN or en-IN). The transcript
 * lands in the text field and stays editable, because recognition is
 * imperfect and the user must be able to correct it before submitting.
 */
export default function VoiceInput({
  onTranscript,
  compact = false,
}: {
  onTranscript: (text: string) => void;
  compact?: boolean;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations('describe');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  const sessionRef = useRef<SpeechSession | null>(null);

  const supported =
    useSyncExternalStore(neverChanges, isSpeechSupported, supportedOnServer) &&
    !startFailed;

  useEffect(() => () => sessionRef.current?.stop(), []);

  function toggle() {
    setError(null);
    if (listening) {
      sessionRef.current?.stop();
      setListening(false);
      return;
    }

    const session = startlistening(locale, {
      onTranscript,
      onError: () => {
        setError(t('voiceError'));
        setListening(false);
      },
      onEnd: () => setListening(false),
    });

    if (!session) {
      setStartFailed(true);
      return;
    }
    sessionRef.current = session;
    setListening(true);
  }

  if (!supported) {
    return compact ? null : (
      <p className="text-label-sm text-onSurface-variant">
        {t('voiceUnsupported')}
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? t('voiceStop') : t('voiceStart')}
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            listening
              ? 'bg-critical text-critical-on'
              : 'bg-primary-container text-primary-on'
          }`}
        >
          <Icon name={listening ? 'stop_circle' : 'mic'} className="text-xl" />
        </button>
        {listening && (
          <p className="text-label-sm text-primary" aria-live="polite">
            {t('voiceListening')}
          </p>
        )}
        {error && (
          <p className="text-label-sm text-critical-onContainer" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={toggle} className="btn-secondary">
        <Icon name={listening ? 'stop_circle' : 'mic'} />
        {listening ? t('voiceStop') : t('voiceStart')}
      </button>
      {listening && (
        <p className="text-label-sm text-primary" aria-live="polite">
          {t('voiceListening')}
        </p>
      )}
      {error && (
        <p className="text-label-sm text-critical-onContainer" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
