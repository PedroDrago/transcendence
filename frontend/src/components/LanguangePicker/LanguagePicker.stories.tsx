import type { Meta, StoryObj } from '@storybook/react';
import LanguagePicker from './index';

const meta: Meta<typeof LanguagePicker> = {
  title: 'Components/LanguagePicker',
  component: LanguagePicker,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LanguagePicker>;

export const Compact: Story = {
  args: { variant: 'compact' },
};

export const Full: Story = {
  args: { variant: 'full' },
};
