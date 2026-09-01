import { setRequestLocale } from 'next-intl/server';
import ResultScreen from '@/components/result/ResultScreen';

export default async function ResultPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ResultScreen analysisId={id} />;
}
