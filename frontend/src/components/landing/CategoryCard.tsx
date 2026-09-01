'use client';

import { useState, type MouseEvent } from 'react';
import Icon from '@/components/Icon';
import { Link, useRouter } from '@/i18n/navigation';
import { type Locale, otherLocale } from '@/i18n/routing';

const ICON_TONE: Record<string, string> = {
  local_fire_department: 'bg-[#e65100]',
  water_drop: 'bg-critical',
  personal_injury: 'bg-primary-container',
  air: 'bg-tertiary-bright',
  coronavirus: 'bg-[#6a1b9a]',
  pest_control: 'bg-[#4e342e]',
  pets: 'bg-[#6d4c41]',
  bolt: 'bg-[#f9a825] text-onSurface',
  sunny: 'bg-[#ef6c00]',
  falling: 'bg-[#546e7a]',
  neurology: 'bg-[#4527a0]',
  pool: 'bg-[#0277bd]',
  cardiology: 'bg-critical',
  pulmonology: 'bg-[#00838f]',
  psychology: 'bg-[#5e35b1]',
  pregnant_woman: 'bg-[#c2185b]',
  accessibility: 'bg-[#283593]',
  emergency: 'bg-[#e65100]',
  bloodtype: 'bg-[#ad1457]',
  device_thermostat: 'bg-[#ef6c00]',
  visibility: 'bg-[#0277bd]',
  local_drink: 'bg-[#00838f]',
};

const HIGHLIGHT =
  'border-tertiary-bright bg-tertiary-container text-tertiary';

/**
 * The one place where both languages appear together: a Hindi speaker looking
 * at an English screen (or the reverse) can still recognise the right card.
 * Every screen after this one is single-language.
 */
export default function CategoryCard({
  href,
  label,
  labelAlt,
  icon,
  locale,
  tone = 'default',
  layout = 'tile',
}: {
  href: string;
  label: string;
  labelAlt: string;
  icon: string;
  locale: Locale;
  tone?: 'default' | 'muted';
  layout?: 'tile' | 'wide';
}) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);

  const chip =
    tone === 'muted'
      ? 'bg-secondary-on text-tertiary-on'
      : ICON_TONE[icon] ?? 'bg-primary-container';

  const wide = layout === 'wide';

  function go(event: MouseEvent<HTMLAnchorElement>) {
    // Show the green selected state before leaving — otherwise a tap on
    // mobile just navigates and the highlight never appears.
    event.preventDefault();
    if (pressed) return;
    setPressed(true);
    window.setTimeout(() => router.push(href), 180);
  }

  return (
    <Link
      href={href}
      onClick={go}
      className={`group flex rounded-xl border p-3 text-center transition-colors ${
        wide
          ? 'col-span-2 min-h-touch flex-row items-center gap-3 px-4 text-left'
          : 'min-h-[7.5rem] flex-col items-center justify-center gap-2'
      } ${
        pressed
          ? HIGHLIGHT
          : `border-outline-variant hover:border-tertiary-bright hover:bg-tertiary-container active:border-tertiary-bright active:bg-tertiary-container ${
              tone === 'muted' ? 'bg-surface-low' : 'bg-surface-lowest'
            }`
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full text-tertiary-on ${chip} ${
          wide ? 'h-10 w-10' : 'h-11 w-11'
        }`}
      >
        <Icon name={icon} className="text-2xl" />
      </span>
      <span className={`flex min-w-0 flex-col ${wide ? '' : 'items-center'}`}>
        <span
          className={`text-instruction-xl ${
            pressed
              ? 'text-tertiary'
              : 'text-primary group-hover:text-tertiary group-active:text-tertiary'
          }`}
          lang={locale}
        >
          {label}
        </span>
        <span
          className={`text-label-sm ${
            pressed
              ? 'text-tertiary'
              : 'text-onSurface-variant group-hover:text-tertiary group-active:text-tertiary'
          }`}
          lang={otherLocale(locale)}
        >
          {labelAlt}
        </span>
      </span>
    </Link>
  );
}
