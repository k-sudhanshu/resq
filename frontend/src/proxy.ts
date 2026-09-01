import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Named `proxy.ts` rather than `middleware.ts` — the rename landed in
// Next.js 16. Every page lives under /en or /hi, so the locale is always
// visible in the URL and a link is shareable in the language it was read in.
export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
