'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Icon from '@/components/Icon';
import CategoryCard from './CategoryCard';
import { getCatalogCategories } from '@/lib/categoryCatalog';
import { hasAcceptedConsent } from '@/lib/session';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

/**
 * The landing grid is fully static: category names, icons, and both-language
 * labels come from the local catalog, so the page paints instantly even while
 * the free backend instance is asleep. No API is called here — the first
 * network request happens only when the user opens a category (the assess
 * page fetches that one category's questions) or submits an analysis.
 */
export default function LandingScreen() {
  const locale = useLocale() as Locale;
  const t = useTranslations('landing');
  const router = useRouter();

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!hasAcceptedConsent()) {
      router.replace('/consent');
    }
  }, [router]);

  const categories = useMemo(() => getCatalogCategories(locale), [locale]);

  const filtered = useMemo(() => {
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
    </div>
  );
}
