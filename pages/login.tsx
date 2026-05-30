import Head from 'next/head';
import { useRouter } from 'next/router';
import { getMetaLoginUrlWithNext } from '../lib/api';

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export default function LoginPage() {
  const router = useRouter();
  const hasError = typeof router.query.error === 'string';

  return (
    <>
      <Head>
        <title>Log in — Meta Analytics</title>
      </Head>

      <div
        style={{ fontFamily: FONT_STACK }}
        className="flex min-h-screen w-full items-center justify-center bg-[#f0f2f5] px-4 py-10"
      >
        <div className="grid w-full max-w-[980px] grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Brand */}
          <div className="text-center lg:pr-8 lg:text-left">
            <h1 className="text-[3.5rem] font-bold leading-none tracking-[-0.06em] text-[#1877F2]">
              Meta Analytics
            </h1>
            <p className="mx-auto mt-4 max-w-[26rem] text-[1.6rem] leading-tight text-[#1c1e21] lg:mx-0">
              Connect and manage your Meta ad accounts in one place.
            </p>
          </div>

          {/* Login card */}
          <div className="mx-auto w-full max-w-[396px]">
            <div className="rounded-[8px] bg-white p-4 pb-6 shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)]">
              <p className="px-1 pb-3 pt-1 text-[15px] leading-snug text-[#606770]">
                Sign in to import the ad accounts you can access — authentication is handled by Meta.
              </p>

              {hasError && (
                <p className="mb-3 px-1 text-[14px] leading-snug text-[#fa383e]">
                  Login failed. Check the Meta app permissions and redirect URI, then try again.
                </p>
              )}

              <a
                href={getMetaLoginUrlWithNext('/dashboard')}
                className="flex h-[50px] w-full items-center justify-center rounded-[8px] bg-[#1877F2] text-[19px] font-bold text-white transition-colors hover:bg-[#166fe5]"
              >
                Continue with Facebook Login
              </a>

              <div className="my-5 h-px w-full bg-[#dadde1]" />

              <p className="px-1 text-center text-[13px] leading-snug text-[#606770]">
                Tokens stay on the backend and are never exposed to the browser.
              </p>
            </div>

            <p className="mt-6 text-center text-[14px] text-[#1c1e21]">
              <span className="font-bold">Meta Analytics</span> · Marketing API dashboard
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
