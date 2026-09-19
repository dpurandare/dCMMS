import { NextRequest, NextResponse } from 'next/server';

/**
 * Per-request Content-Security-Policy with a nonce.
 *
 * The CSP used to live in next.config.js with `script-src 'self' 'unsafe-eval'
 * 'unsafe-inline'`, which disables the policy's main purpose: with
 * 'unsafe-inline' allowed, an injected <script> runs. Next.js needs a way to
 * run its own inline bootstrap, so the fix is a nonce rather than a blanket
 * allowance — Next reads the nonce from this header and stamps it onto the
 * scripts it emits (REV-019).
 *
 * 'unsafe-eval' is required by React Refresh in development only, so it is
 * conditional. Production gets neither.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // connect-src must cover wherever the API actually is. It was hardcoded to
  // http://localhost:3001, which blocked every API call outside local dev.
  //
  // This resolves at BUILD time, not request time: middleware runs on the Edge
  // runtime, where `process.env` is statically substituted during the build, so
  // a runtime variable cannot reach it. That is tolerable only because
  // next.config.js already inlines NEXT_PUBLIC_API_URL the same way — the app
  // cannot call an API it was not built for, so the policy and the client agree
  // by construction. Making both runtime-configurable is REV-033.
  const apiOrigin = (() => {
    const configured = process.env.NEXT_PUBLIC_API_URL;
    if (!configured) return null;
    try {
      const { protocol, host } = new URL(configured);
      const ws = protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${host} ${ws}//${host}`;
    } catch {
      return null;
    }
  })();

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    // Next injects inline <style> for styled-jsx and the App Router; nonces do
    // not reach all of them, so style-src keeps 'unsafe-inline'. It is a far
    // weaker exposure than the script-src equivalent.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    ["connect-src 'self'", apiOrigin].filter(Boolean).join(' '),
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  // Next reads the nonce back off the *request* CSP header and stamps it onto
  // the inline scripts it emits. Setting it only on the response leaves every
  // Next bootstrap script unnonced, and the policy then blocks the page's own
  // scripts — verified by counting nonce attributes in the served HTML.
  headers.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation, which are served
    // without inline script and do not need a per-request policy.
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
