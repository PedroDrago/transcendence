import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin();

const withPWAConfig = withPWA({
  dest: 'public',
//   disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

export default withPWAConfig(withNextIntl(nextConfig));