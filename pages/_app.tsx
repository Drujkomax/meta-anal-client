import type { AppProps } from 'next/app';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { LanguageProvider } from '../components/LanguageProvider';
import { AccountProvider } from '../components/AccountProvider';
import '../styles/globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <AccountProvider>
        <main className={`${manrope.variable} ${spaceGrotesk.variable}`}>
          <Component {...pageProps} />
        </main>
      </AccountProvider>
    </LanguageProvider>
  );
}
