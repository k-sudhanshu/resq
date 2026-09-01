import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { routing } from './routing';

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }

  // Each locale loads only its own message file: there is no merging with a
  // fallback language, so a missing Hindi key fails loudly instead of quietly
  // rendering English. The parity test in `tests/` is what prevents that from
  // ever reaching a build.
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return { locale, messages };
});
