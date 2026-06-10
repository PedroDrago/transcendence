import type { Preview } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import '../src/app/globals.css';
import './storybook-reset.css';
import en from '../src/i18n/messages/en.json';

const withIntl = (Story: React.ComponentType) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <Story />
  </NextIntlClientProvider>
);

const withTheme = (Story: React.ComponentType) => (
  <div className="sb-theme-wrapper">
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withIntl, withTheme],
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0d0d0d' },
        { name: 'light', value: '#f5f5f5' },
      ],
    },
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
