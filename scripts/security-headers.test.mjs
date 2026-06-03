import assert from 'node:assert/strict';
import test from 'node:test';
import nextConfig from '../next.config.mjs';

test('Next.js config applies baseline security headers to every route', async () => {
  const routes = await nextConfig.headers();
  const allRoute = routes.find((route) => route.source === '/:path*');
  assert.ok(allRoute, 'expected a catch-all headers route');

  const headers = new Map(
    allRoute.headers.map((header) => [header.key, header.value]),
  );

  assert.equal(
    headers.get('Strict-Transport-Security'),
    'max-age=63072000; includeSubDomains; preload',
  );
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.match(headers.get('Permissions-Policy'), /camera=\(\)/);

  const csp =
    headers.get('Content-Security-Policy') ??
    headers.get('Content-Security-Policy-Report-Only');
  assert.ok(csp, 'expected a CSP header');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
});
