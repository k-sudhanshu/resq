import { setRequestLocale } from 'next-intl/server';
import AssessScreen from '@/components/assess/AssessScreen';

export default async function AssessPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  return <AssessScreen categoryKey={category} />;
}
