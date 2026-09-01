// Web Speech API wrapper. The recognition language follows the UI locale, so
// a Hindi user dictates in Hindi and an English user in Indian English.
import type { Locale } from '@/i18n/routing';

const RECOGNITION_LANG: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getConstructor() !== null;
}

export interface SpeechSession {
  stop: () => void;
}

export function startlistening(
  locale: Locale,
  handlers: {
    onTranscript: (text: string) => void;
    onError: () => void;
    onEnd: () => void;
  }
): SpeechSession | null {
  const Recognition = getConstructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = RECOGNITION_LANG[locale];
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }
    handlers.onTranscript(transcript);
  };
  recognition.onerror = () => handlers.onError();
  recognition.onend = () => handlers.onEnd();
  recognition.start();

  return { stop: () => recognition.stop() };
}
