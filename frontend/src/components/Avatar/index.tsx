import styles from './styles.module.css';

interface AvatarProps {
  username?: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

const PALETTE: [string, string][] = [
  ['#3D1D4D', '#C9A5E8'],
  ['#1D2D4D', '#A5C3E8'],
  ['#1D4D2D', '#A5E8C3'],
  ['#4D3D1D', '#E8CFA5'],
  ['#4D1D2D', '#E8A5B8'],
  ['#1D4D4D', '#A5E8E8'],
  ['#2D1D4D', '#B8A5E8'],
  ['#4D2D1D', '#E8B8A5'],
];

function pickPalette(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function initials(username: string): string {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

export default function Avatar({ username = '?', avatarUrl, size = 40, className = '' }: AvatarProps) {
  const [bg, fg] = pickPalette(username);
  const fontSize = Math.round(size * 0.38);

  if (avatarUrl) {
    return (
      <div
        className={`${styles.avatar} ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={avatarUrl} alt={username} />
      </div>
    );
  }

  return (
    <div
      className={`${styles.avatar} ${styles.generated} ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize }}
      aria-label={username}
    >
      {initials(username)}
    </div>
  );
}
