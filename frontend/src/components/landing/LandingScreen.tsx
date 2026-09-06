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

// Last known grid per language, so a returning tab paints instantly and the
// network refresh happens behind an already-usable screen.
const CACHE_PREFIX = 'resq.categories.';

function readCachedCategories(locale: string): Category[] | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_PREFIX + locale);
    return raw ? (JSON.parse(raw) as Category[]) : null;
  } catch {
    return null;
  }
}

function writeCachedCategories(locale: string, categories: Category[]): void {
  try {
    window.sessionStorage.setItem(CACHE_PREFIX + locale, JSON.stringify(categories));
  } catch {
    // Storage full or blocked — the grid still works, just without the cache.
  }
}

/** Placeholder tile matching CategoryCard's footprint, so nothing jumps. */
function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="flex min-h-[7.5rem] animate-pulse flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-lowest p-3"
    >
      <span className="h-11 w-11 rounded-full bg-surface-container" />
      <span className="h-4 w-24 rounded bg-surface-container" />
      <span className="h-3 w-16 rounded bg-surface-high" />
    </div>
  );
}

const SKELETON_COUNT = 8;

export default function LandingScreen() {
  const locale = useLocale() as Locale;
  const t = useTranslations('landing');
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
    let settled = false;

    async function load() {
      // Paint whatever we already know before any network round trip.
      const cached = await Promise.resolve(readCachedCategories(locale));
      if (cancelled) return;
      if (cached) setCategories(cached);

      // Secondary: the session token is only needed at submit time, and
      // createAnalysis() re-ensures it there. Warm it up, never block on it.
      ensureSession(locale).catch(() => {});

      // Parallel probe: if the free instance is asleep and the grid hasn't
      // arrived yet, explain the wait instead of leaving a silent skeleton.
      checkHealth().then((awake) => {
        if (!cancelled && !awake && !settled && !cached) setWaking(true);
      });

      // Critical path: the grid. Nothing waits in front of this request.
      try {
        const body = await fetchCategories(locale);
        if (!cancelled) {
          setCategories(body.categories);
          writeCachedCategories(locale, body.categories);
          setError(null);
        }
      } catch (err) {
        // A failed refresh behind a cached grid is invisible by design;
        // only an empty grid warrants the error state.
        if (!cancelled && !cached) setError(err);
      } finally {
        settled = true;
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

      <div className="grid grid-cols-2 gap-3" aria-busy={!categories && !error}>
        {categories
          ? filtered.map((category) => (
              <CategoryCard
                key={category.key}
                href={`/assess/${category.key}`}
                label={category.label}
                labelAlt={category.label_alt}
                icon={category.icon}
                locale={locale}
              />
            ))
          : !error &&
            Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
        {/* Static — usable immediately, even while the grid is loading. */}
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
      {categories && filtered.length === 0 && (
        <p className="text-center text-onSurface-variant">{t('noResults')}</p>
      )}
    </div>
  );
}
