import type { Meta, StoryObj } from '@storybook/react';
import Badge from './index';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Single: Story = {
  args: { count: 1 },
};

export const Few: Story = {
  args: { count: 5 },
};

export const Overflow: Story = {
  args: { count: 42 },
};

export const Zero: Story = {
  args: { count: 0 },
};

export const InNav: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {[0, 1, 5, 10, 99].map((n) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Notifications</span>
          <Badge count={n} />
        </div>
      ))}
    </div>
  ),
};
