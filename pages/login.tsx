import Head from 'next/head';
import { useRouter } from 'next/router';
import { Fraunces } from 'next/font/google';
import { getMetaLoginUrlWithNext } from '../lib/api';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
});

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function LoginPage() {
  const router = useRouter();
  const hasError = typeof router.query.error === 'string';

  return (
    <>
      <Head>
        <title>Sign in — Meta Analytics Studio</title>
      </Head>

      <div className={`${fraunces.variable} login-root`}>
        <div className="login-grain" aria-hidden style={{ backgroundImage: GRAIN }} />

        <div className="login-shell">
          <header className="bar">
            <span className="kicker">
              <i className="dot" aria-hidden /> Meta Analytics
            </span>
            <span className="kicker kicker--muted">Ads Studio</span>
          </header>
          <hr className="rule" />

          <main className="grid">
            <section className="lede">
              <span className="index">01 — Access</span>
              <h1 className="display">
                One <em>studio</em> for<br />
                your Meta ad accounts.
              </h1>
              <p className="lede-copy">
                Connect via Meta OAuth and pull campaign-level metrics straight from the Marketing
                API — campaigns, ad sets and ads in one calm, editorial workspace.
              </p>
            </section>

            <aside className="access">
              <span className="kicker kicker--accent">Sign in</span>
              <h2 className="access-title">Continue with Meta</h2>
              <p className="access-copy">
                Authenticate to import the ad accounts you can access.
              </p>

              {hasError && (
                <p className="access-error">
                  OAuth failed. Check the Meta app permissions and redirect URI, then try again.
                </p>
              )}

              <a href={getMetaLoginUrlWithNext('/dashboard')} className="cta">
                <span>Continue with Facebook Login</span>
                <span className="cta-arrow" aria-hidden>→</span>
              </a>

              <p className="access-note">Tokens stay on the backend — never exposed to the browser.</p>
            </aside>
          </main>

          <hr className="rule" />
          <footer className="bar">
            <span className="kicker kicker--muted">Marketing API</span>
            <span className="kicker kicker--muted">Secure OAuth</span>
            <span className="kicker kicker--muted">↳ 01 / 01</span>
          </footer>
        </div>

        <style jsx>{`
          .login-root {
            position: relative;
            min-height: 100vh;
            width: 100%;
            background: #f3efe5;
            color: #17140f;
            overflow: hidden;
          }
          .login-grain {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.06;
            mix-blend-mode: multiply;
          }
          .login-shell {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            max-width: 1180px;
            margin: 0 auto;
            padding: 2rem clamp(1.25rem, 4vw, 3.5rem) 1.75rem;
          }
          .bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .rule {
            border: 0;
            border-top: 1px solid rgba(23, 20, 15, 0.14);
            margin: 1.1rem 0;
          }
          .kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-family: var(--font-manrope), system-ui, sans-serif;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.28em;
            color: #17140f;
          }
          .kicker--muted {
            color: #8c8676;
          }
          .kicker--accent {
            color: #c2451f;
          }
          .dot {
            width: 7px;
            height: 7px;
            background: #c2451f;
            border-radius: 1px;
            transform: rotate(45deg);
          }
          .grid {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr;
            gap: 2.75rem;
            align-items: center;
            padding: clamp(2rem, 6vh, 5rem) 0;
          }
          @media (min-width: 900px) {
            .grid {
              grid-template-columns: 1.35fr 0.8fr;
              gap: clamp(3rem, 6vw, 6.5rem);
            }
          }
          .index {
            display: inline-block;
            font-family: var(--font-manrope), system-ui, sans-serif;
            font-size: 0.72rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #c2451f;
            margin-bottom: 1.35rem;
            animation: rise 0.7s ease both;
          }
          .display {
            font-family: var(--font-fraunces), Georgia, serif;
            font-weight: 600;
            font-size: clamp(2.7rem, 7.4vw, 5.5rem);
            line-height: 0.96;
            letter-spacing: -0.02em;
            margin: 0;
            animation: rise 0.8s ease 0.05s both;
          }
          .display em {
            font-style: italic;
            font-weight: 500;
            color: #c2451f;
          }
          .lede-copy {
            font-family: var(--font-manrope), system-ui, sans-serif;
            max-width: 30rem;
            margin-top: 1.6rem;
            font-size: 1.02rem;
            line-height: 1.62;
            color: #4a463d;
            animation: rise 0.8s ease 0.12s both;
          }
          .access {
            border-top: 2px solid #17140f;
            padding-top: 1.4rem;
            animation: rise 0.8s ease 0.2s both;
          }
          .access-title {
            font-family: var(--font-fraunces), Georgia, serif;
            font-weight: 600;
            font-size: 1.95rem;
            margin: 0.7rem 0 0;
            line-height: 1.1;
          }
          .access-copy {
            font-family: var(--font-manrope), system-ui, sans-serif;
            margin-top: 0.6rem;
            font-size: 0.92rem;
            line-height: 1.55;
            color: #6b6557;
          }
          .access-error {
            font-family: var(--font-manrope), system-ui, sans-serif;
            margin-top: 1rem;
            padding: 0.7rem 0.9rem;
            border-left: 3px solid #c2451f;
            background: rgba(194, 69, 31, 0.07);
            font-size: 0.82rem;
            line-height: 1.5;
            color: #9a2f17;
          }
          .cta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-top: 1.65rem;
            padding: 1.05rem 1.35rem;
            background: #17140f;
            color: #f3efe5;
            text-decoration: none;
            font-family: var(--font-manrope), system-ui, sans-serif;
            font-weight: 600;
            font-size: 0.92rem;
            transition: background 0.25s ease, transform 0.25s ease;
          }
          .cta:hover {
            background: #c2451f;
            transform: translateY(-1px);
          }
          .cta-arrow {
            transition: transform 0.25s ease;
          }
          .cta:hover .cta-arrow {
            transform: translateX(5px);
          }
          .access-note {
            font-family: var(--font-manrope), system-ui, sans-serif;
            margin-top: 1rem;
            font-size: 0.72rem;
            letter-spacing: 0.02em;
            line-height: 1.5;
            color: #8c8676;
          }
          @keyframes rise {
            from {
              opacity: 0;
              transform: translateY(14px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .index,
            .display,
            .lede-copy,
            .access {
              animation: none;
            }
          }
        `}</style>
      </div>
    </>
  );
}
