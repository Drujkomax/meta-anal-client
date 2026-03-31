import Head from 'next/head';
import { useRouter } from 'next/router';
import { getMetaLoginUrlWithNext } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const hasError = typeof router.query.error === 'string';

  return (
    <>
      <Head>
        <title>Login | Meta Analytics</title>
      </Head>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <section className="card grid w-full grid-cols-1 overflow-hidden lg:grid-cols-2">
          <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-blue-700 p-10 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-teal-100">Meta Analytics</p>
            <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight">
              One Dashboard for Your Meta Ad Accounts
            </h1>
            <p className="mt-6 max-w-md text-sm text-teal-50">
              Connect via Meta OAuth and load campaign-level metrics directly from Marketing API.
            </p>
          </div>

          <div className="p-10">
            <h2 className="font-heading text-2xl font-semibold">Sign in with Meta</h2>
            <p className="mt-2 text-sm text-muted">Authenticate and import accessible ad accounts for ads analytics mode.</p>

            {hasError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                OAuth failed. Please verify Meta app permissions and redirect URI, then retry.
              </div>
            )}

            <a
              href={getMetaLoginUrlWithNext('/dashboard')}
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Continue with Facebook Login
            </a>

            <p className="mt-4 text-xs text-muted">
              Tokens stay on the backend and are never exposed to the browser.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
