import type { Meta, StoryObj } from '@storybook/react';
import InstallPWA from './index';

const meta: Meta<typeof InstallPWA> = {
  title: 'Components/InstallPWA',
  component: InstallPWA,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InstallPWA>;

export const Installable: Story = {
  args: { forceShow: true },
};

export const Hidden: Story = {
  args: { forceShow: false },
  parameters: {
    docs: {
      description: {
        story: 'Hidden by default — only appears when the browser fires `beforeinstallprompt`.',
      },
    },
  },
};
