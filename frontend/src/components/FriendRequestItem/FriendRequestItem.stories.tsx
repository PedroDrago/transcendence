import type { Meta, StoryObj } from '@storybook/react';
import FriendRequestItem from './index';
import type { FriendRequest } from '@/lib/api';

const meta: Meta<typeof FriendRequestItem> = {
  title: 'Components/FriendRequestItem',
  component: FriendRequestItem,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FriendRequestItem>;

const mockRequest: FriendRequest = {
  id: 'req-1',
  requesterId: 'user-1',
  addresseeId: 'user-2',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  requester: {
    id: 'user-1',
    username: 'alice_dev',
    email: 'alice@example.com',
    createdAt: new Date().toISOString(),
  },
};

export const Default: Story = {
  args: {
    request: mockRequest,
    onRespond: (id, status) => console.log('respond', id, status),
  },
};

export const LongUsername: Story = {
  args: {
    request: {
      ...mockRequest,
      requester: { ...mockRequest.requester, username: 'very_long_username_here' },
    },
    onRespond: () => {},
  },
};

export const List: Story = {
  render: () => (
    <div className="notif-section" style={{ width: 420 }}>
      {['alice_dev', 'bob_42', 'carol.design'].map((username, i) => (
        <FriendRequestItem
          key={i}
          request={{
            ...mockRequest,
            id: `req-${i}`,
            requester: { ...mockRequest.requester, username },
          }}
          onRespond={() => {}}
        />
      ))}
    </div>
  ),
};
