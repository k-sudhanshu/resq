import { Link } from '@/i18n/navigation';
import LanguageToggle from './LanguageToggle';

// Logo and language toggle only. "Guides" and "History" from the mockups are
// out of scope for v1 (see docs/09-user-flows.md), so they are not shown
// rather than linking nowhere.
export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-lowest">
      <div className="mx-auto flex h-14 max-w-container items-center justify-between px-gutter">
        <Link
          href="/"
          className="text-headline-md font-bold text-primary-container"
        >
          RESQ
        </Link>
        <LanguageToggle />
      </div>
    </header>
  );
}
