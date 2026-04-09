This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server (pnpm recommended):

```bash
pnpm install
pnpm dev
# alternative: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Proxy header injection configuration

This project includes a secure Next.js proxy at `src/proxy.ts` that enforces
per-organization isolation by injecting an `x-org-id` header for downstream
handlers. The proxy supports two injection strategies controlled by the
environment variable `NEXT_PROXY_INJECTION_MODE`:

- `A` (default): sets `x-org-id` on the response headers. This is the
  simplest and most compatible strategy.
- `B`: attempts to immutably pass `x-org-id` as part of the downstream
  request headers (via `NextResponse.next({ request: { headers } })`). This
  may be preferred when downstream edge/route handlers need the header in the
  request object, but some runtimes may not support passing request headers —
  in that case the proxy falls back to behavior `A`.

Why this fallback exists

- Different Next.js runtimes and versions offer varying support for
  immutably replacing request headers. To remain compatible across dev,
  test, and production environments we attempt the stricter `B` mode but
  gracefully fallback to `A` so requests never lose the `x-org-id` header.

How to set it

On macOS / Linux:

```bash
export NEXT_PROXY_INJECTION_MODE=B
pnpm dev
```

Or via a .env file used by your local tooling. In most cases the default
`A` mode is fine for local development.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
