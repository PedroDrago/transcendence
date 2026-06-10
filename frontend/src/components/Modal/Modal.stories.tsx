import type { Meta, StoryObj } from '@storybook/react';
import Modal from './index';
import FormField from '@/components/FormField';
import Input from '@/components/Input';
import Textarea from '@/components/Textarea';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Modal overlay with gradient top bar. Click outside to close.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Simple: Story = {
  args: {
    title: 'Confirm action',
    children: <p style={{ color: 'var(--muted)', fontSize: 14 }}>Are you sure you want to proceed?</p>,
    actions: (
      <>
        <button className="app-btn app-btn--ghost app-btn--sm">Cancel</button>
        <button className="app-btn app-btn--sm">Confirm</button>
      </>
    ),
  },
};

export const WithForm: Story = {
  args: {
    title: 'New post',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Caption">
          <Textarea placeholder="What's on your mind?" minRows={3} />
        </FormField>
        <FormField label="Image URL">
          <Input type="url" placeholder="https://…" />
        </FormField>
      </div>
    ),
    actions: (
      <>
        <button className="app-btn app-btn--ghost app-btn--sm">Cancel</button>
        <button className="app-btn app-btn--sm">Post</button>
      </>
    ),
  },
};

export const Destructive: Story = {
  args: {
    title: 'Delete account',
    children: (
      <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
        This will permanently delete your account and all associated data. This action cannot be undone.
      </p>
    ),
    actions: (
      <>
        <button className="app-btn app-btn--ghost app-btn--sm">Cancel</button>
        <button className="app-btn app-btn--danger app-btn--sm">Delete</button>
      </>
    ),
  },
};
