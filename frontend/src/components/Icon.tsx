import { ICON_GLYPHS, type IconName } from './Icon.data';

const FALLBACK: IconName = 'medical_services';

function isKnown(name: string): name is IconName {
  return name in ICON_GLYPHS;
}

/**
 * Inline SVG icon. Always decorative: every icon here sits next to a text
 * label, so it is hidden from screen readers rather than given a translated
 * name that would be read out twice.
 *
 * Sizing follows the surrounding font size (1em), so Tailwind text utilities
 * control it the same way they did for the icon font this replaced.
 */
export default function Icon({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}) {
  const glyph = ICON_GLYPHS[isKnown(name) ? name : FALLBACK];
  return (
    <svg
      viewBox={glyph.viewBox}
      className={`inline-block h-[1em] w-[1em] shrink-0 fill-current ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={glyph.d} />
    </svg>
  );
}
