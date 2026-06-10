import type { Meta, StoryObj } from '@storybook/react';
import PostCard from './index';
import type { Post, UserProfile } from '@/lib/api';

const meta: Meta<typeof PostCard> = {
  title: 'Components/PostCard',
  component: PostCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PostCard>;

const mockPost: Post = {
  id: 'post-1',
  userId: 'user-abc123',
  mediaUrl: 'https://picsum.photos/seed/sb1/400/300',
  mediaKey: 'uploads/img.jpg',
  mediaType: 'image',
  caption: 'Beautiful day outside! #vibes',
  likeCount: 42,
  commentCount: 7,
  createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
};

const mockAuthor: UserProfile = {
  id: 'user-abc123',
  username: 'john_doe',
  email: 'john@example.com',
  createdAt: new Date().toISOString(),
};

export const Default: Story = {
  args: { post: mockPost, author: mockAuthor },
};

export const NoCaption: Story = {
  args: {
    post: { ...mockPost, id: 'post-2', caption: undefined, mediaUrl: 'https://picsum.photos/seed/sb2/400/300' },
    author: mockAuthor,
  },
};

export const WithoutAuthor: Story = {
  args: { post: mockPost },
};

export const VideoPost: Story = {
  args: {
    post: {
      ...mockPost,
      id: 'post-3',
      mediaType: 'video',
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      caption: 'Short clip',
    },
    author: mockAuthor,
  },
};

export const RecentPost: Story = {
  args: {
    post: { ...mockPost, id: 'post-4', createdAt: new Date(Date.now() - 30 * 1000).toISOString() },
    author: mockAuthor,
  },
};

export const OldPost: Story = {
  args: {
    post: { ...mockPost, id: 'post-5', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    author: mockAuthor,
  },
};
