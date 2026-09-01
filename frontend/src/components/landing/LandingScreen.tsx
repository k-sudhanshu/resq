'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import ColdStartNotice from '@/components/layout/ColdStartNotice';
import ErrorNotice from '@/components/ErrorNotice';
import Icon from '@/components/Icon';
import CategoryCard from './CategoryCard';
import { checkHealth, ensureSession, fetchCategories } from '@/lib/api';
import { hasAcceptedConsent } from '@/lib/session';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Category } from '@/lib/types';

export default function LandingScreen() {
  const locale = useLocale() as Locale;
  const t = useTranslations('landing');
  const common = useTranslations('common');
  const router = useRouter();

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [waking, setWaking] = useState(false);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hasAcceptedConsent()) {
      router.replace('/consent');
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Probe first: if the sleeping instance has to wake up, say so instead
      // of leaving the user in front of a blank screen.
      const awake = await checkHealth();
      if (cancelled) return;
      if (!awake) setWaking(true);

      try {
        const [body] = await Promise.all([
          fetchCategories(locale),
          ensureSession(locale),
        ]);
        if (!cancelled) setCategories(body.categories);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setWaking(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [locale, attempt]);

  const filtered = useMemo(() => {
    if (!categories) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter(
      (category) =>
        category.label.toLowerCase().includes(needle) ||
        category.label_alt.toLowerCase().includes(needle) ||
        category.key.includes(needle)
    );
  }, [categories, query]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-headline-lg text-primary">{t('title')}</h1>
        <p className="mt-2 text-onSurface-variant">{t('subtitle')}</p>
      </header>

      <label className="flex w-full items-center gap-3 rounded-lg border-2 border-primary-container bg-surface-lowest px-4 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface">
        <Icon name="search" className="text-primary-container" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          // 16px minimum prevents iOS from zooming on focus.
          className="h-14 w-full bg-transparent text-body-md outline-none placeholder:text-outline focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </label>

      {waking && <ColdStartNotice />}
      {error ? (
        <ErrorNotice
          error={error}
          onRetry={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : null}

      {!categories && !error && (
        <p className="text-center text-onSurface-variant">{common('loading')}</p>
      )}

      {categories && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((category) => (
              <CategoryCard
                key={category.key}
                href={`/assess/${category.key}`}
                label={category.label}
                labelAlt={category.label_alt}
                icon={category.icon}
                locale={locale}
              />
            ))}
            <CategoryCard
              href="/describe"
              label={t('otherLabel')}
              labelAlt={t('otherLabelAlt')}
              icon="add_circle"
              locale={locale}
              tone="muted"
              layout="wide"
            />
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-onSurface-variant">{t('noResults')}</p>
          )}
        </>
      )}
    </div>
  );
}
