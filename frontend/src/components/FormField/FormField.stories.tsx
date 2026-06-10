import type { Meta, StoryObj } from '@storybook/react';
import FormField from './index';
import Input from '@/components/Input';
import Textarea from '@/components/Textarea';

const meta: Meta<typeof FormField> = {
  title: 'Components/FormField',
  component: FormField,
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
type Story = StoryObj<typeof FormField>;

export const WithInput: Story = {
  args: {
    label: 'Username',
    children: <Input placeholder="john_doe" />,
  },
};

export const WithTextarea: Story = {
  args: {
    label: 'Bio',
    children: <Textarea placeholder="Tell something about yourself…" />,
    hint: 'Up to 160 characters.',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Website',
    children: <Input type="url" placeholder="https://example.com" />,
    hint: 'Include the https:// prefix.',
  },
};

export const FullForm: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 340 }}>
      <FormField label="Username">
        <Input placeholder="john_doe" />
      </FormField>
      <FormField label="Email">
        <Input type="email" placeholder="you@example.com" />
      </FormField>
      <FormField label="Password">
        <Input type="password" placeholder="••••••••" />
      </FormField>
      <FormField label="Bio" hint="Optional.">
        <Textarea placeholder="Tell something about yourself…" />
      </FormField>
    </div>
  ),
};
