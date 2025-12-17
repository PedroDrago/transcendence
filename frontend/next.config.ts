import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin();

const withPWA = withPWAInit({
  dest: 'public',
  disable: false,
  register: true,
});

export default withNextIntl(withPWA(nextConfig));