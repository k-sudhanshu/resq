import { setRequestLocale } from 'next-intl/server';
import ConsentScreen from '@/components/consent/ConsentScreen';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ConsentScreen />;
}
