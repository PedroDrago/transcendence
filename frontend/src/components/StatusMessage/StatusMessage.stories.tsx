import type { Meta, StoryObj } from '@storybook/react';
import StatusMessage from './index';

const meta: Meta<typeof StatusMessage> = {
  title: 'Components/StatusMessage',
  component: StatusMessage,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatusMessage>;

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Changes saved successfully.',
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    message: 'Something went wrong. Please try again.',
  },
};

export const BothStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 340 }}>
      <StatusMessage type="success" message="Profile updated." />
      <StatusMessage type="error" message="Current password is incorrect." />
      <StatusMessage type="success" message="2FA enabled successfully." />
      <StatusMessage type="error" message="Username already taken." />
    </div>
  ),
};
