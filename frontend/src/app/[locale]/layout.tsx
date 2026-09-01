import type { Metadata } from 'next';
import { Manrope, Noto_Sans_Devanagari } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Manrope has no Devanagari glyphs, so Hindi needs its own face. Both are
// loaded as CSS variables and composed in the Tailwind font stack.
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
});
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  return {
    title: `RESQ — ${t('title')}`,
    description: t('disclaimerShort'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    // `lang` drives both font selection and the screen reader's voice.
    <html lang={locale} className={`${manrope.variable} ${devanagari.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <TopBar />
          <main className="mx-auto flex w-full max-w-container flex-1 flex-col px-gutter py-8">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function Footer() {
  const t = await getTranslations('landing');
  return (
    <footer className="mt-auto border-t border-outline-variant bg-surface-dim">
      <p className="mx-auto max-w-container px-gutter py-4 text-center text-label-sm text-onSurface-variant">
        {t('disclaimerShort')}
      </p>
    </footer>
  );
}
