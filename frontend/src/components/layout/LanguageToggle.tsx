'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';

const LABELS: Record<Locale, string> = {
  en: 'EN',
  hi: 'हिंदी',
};

/**
 * Swaps the locale prefix in the URL while keeping the current path, so the
 * user stays exactly where they were. Always visible: guessing a language in
 * an emergency is worse than letting the user choose.
 */
export default function LanguageToggle() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // `pathname` here is locale-free and already contains any dynamic segment
    // values, so the same screen is reopened under the other locale prefix.
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-highest p-1"
      role="group"
      aria-label="Language / भाषा"
    >
      {locales.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => switchTo(option)}
            aria-current={active ? 'true' : undefined}
            lang={option}
            className={`rounded-full px-3 py-1 text-label-sm transition-colors ${
              active
                ? 'bg-primary-container text-primary-on'
                : 'text-onSurface-variant hover:bg-secondary-container'
            }`}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
