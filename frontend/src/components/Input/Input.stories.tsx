import type { Meta, StoryObj } from '@storybook/react';
import Input from './index';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
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
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter text…' },
};

export const WithValue: Story = {
  args: { defaultValue: 'john_doe', placeholder: 'Username' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Password' },
};

export const Email: Story = {
  args: { type: 'email', placeholder: 'you@example.com' },
};

export const WithError: Story = {
  args: { defaultValue: 'bad_value', error: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Disabled input' },
};

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
      <Input placeholder="Text" />
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Input defaultValue="With value" />
      <Input error defaultValue="Error state" />
      <Input disabled defaultValue="Disabled" />
    </div>
  ),
};
