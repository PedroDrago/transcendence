import {NextIntlClientProvider} from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

type Props = {
  children: React.ReactNode;
};

export default async function RootLayout({children}: Props) {
    const messages = await getMessages();
    const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}