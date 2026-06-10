import type { Meta, StoryObj } from '@storybook/react';
import Textarea from './index';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: { placeholder: 'Write something…' },
};

export const WithValue: Story = {
  args: { defaultValue: 'Full-stack dev. Open source enthusiast.' },
};

export const Taller: Story = {
  args: { placeholder: 'Long text…', minRows: 6 },
};

export const WithError: Story = {
  args: { defaultValue: 'Invalid value', error: true },
};
