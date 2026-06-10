import type { Meta, StoryObj } from '@storybook/react';
import AppShell from './index';

const meta: Meta<typeof AppShell> = {
  title: 'Components/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/feed',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Feed: Story = {
  args: {
    children: (
      <div style={{ padding: '2rem', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
        Feed content goes here
      </div>
    ),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/feed' } },
  },
};

export const Messages: Story = {
  args: {
    children: (
      <div style={{ padding: '2rem', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
        Messages content goes here
      </div>
    ),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/messages' } },
  },
};

export const Settings: Story = {
  args: {
    children: (
      <div style={{ padding: '2rem', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
        Settings content goes here
      </div>
    ),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/settings' } },
  },
};
