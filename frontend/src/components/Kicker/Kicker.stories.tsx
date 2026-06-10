import type { Meta, StoryObj } from '@storybook/react';
import Kicker from './index';

const meta: Meta<typeof Kicker> = {
  title: 'Components/Kicker',
  component: Kicker,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: 'Section Label' },
};

export default meta;
type Story = StoryObj<typeof Kicker>;

export const Small: Story = {
  args: { size: 'sm' },
};

export const Medium: Story = {
  args: { size: 'md' },
};

export const AsHeading: Story = {
  args: { as: 'h2', children: 'Profile', size: 'md' },
};

export const UsedInContext: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--text)' }}>
      <div>
        <Kicker size="sm">Feed</Kicker>
        <p style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          Posts from people you follow
        </p>
      </div>
      <div>
        <Kicker size="md" as="h2">Settings</Kicker>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>Manage your account preferences</p>
      </div>
      <div>
        <Kicker size="sm">Notifications</Kicker>
      </div>
      <div>
        <Kicker size="sm">Friend requests</Kicker>
      </div>
    </div>
  ),
};
