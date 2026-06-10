import type { Meta, StoryObj } from '@storybook/react';
import Spinner from './index';

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 14 },
};

export const Large: Story = {
  args: { size: 40 },
};

export const InContext: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spinner />
    </div>
  ),
};
