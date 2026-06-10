import type { Meta, StoryObj } from '@storybook/react';
import Avatar from './index';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: { size: 48 },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Generated: Story = {
  args: { username: 'john_doe' },
};

export const WithImage: Story = {
  args: {
    username: 'jane',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
  },
};

export const Large: Story = {
  args: { username: 'pedro_drago', size: 80 },
};

export const Small: Story = {
  args: { username: 'alice', size: 24 },
};

export const Initials: Story = {
  args: { username: 'John Doe', size: 48 },
};

export const ColorVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 8 }}>
      {['alice', 'bob', 'carol', 'dan', 'eve', 'frank', 'grace', 'heidi'].map((name) => (
        <Avatar key={name} username={name} size={48} />
      ))}
    </div>
  ),
};
