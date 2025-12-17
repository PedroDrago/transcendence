import {NextIntlClientProvider} from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import InstallPWA from '@/components/InstallPWA';
import './globals.css';

type Props = {
  children: React.ReactNode;
};

export default async function RootLayout({children}: Props) {
    const messages = await getMessages();
    const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="Transcendence PWA Application" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <InstallPWA />
      </body>
    </html>
  );
}