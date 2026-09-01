import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  // English is the entry point; the toggle is always visible, because in an
  // emergency a wrong auto-detected guess is worse than an explicit choice.
  defaultLocale: 'en',
  localePrefix: 'always',
  localeCookie: {
    name: 'NEXT_LOCALE',
  },
});

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'hi' : 'en';
}
