import type { Meta, StoryObj } from '@storybook/react';
import { IconHome, IconMessage, IconUser, IconSettings, IconBell, IconLogout } from './index';

const ALL_ICONS = [
  { name: 'IconHome', Icon: IconHome },
  { name: 'IconMessage', Icon: IconMessage },
  { name: 'IconUser', Icon: IconUser },
  { name: 'IconSettings', Icon: IconSettings },
  { name: 'IconBell', Icon: IconBell },
  { name: 'IconLogout', Icon: IconLogout },
];

const meta: Meta = {
  title: 'Components/Icons',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const AllIcons: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', color: 'var(--text)', padding: 16 }}>
      {ALL_ICONS.map(({ name, Icon }) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Icon size={24} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', color: 'var(--text)' }}>
      {[14, 18, 24, 32, 48].map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <IconHome size={size} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{size}px</span>
        </div>
      ))}
    </div>
  ),
};
