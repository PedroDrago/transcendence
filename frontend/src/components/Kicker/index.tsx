interface KickerProps {
  children: React.ReactNode;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Kicker({ children, as: Tag = 'span', size = 'sm', className = '' }: KickerProps) {
  return (
    <Tag
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5ch',
        fontFamily: 'var(--font-mono)',
        fontSize: size === 'md' ? 13 : 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--muted)',
      }}
    >
      <span style={{ color: 'var(--accent-strong)', opacity: 0.8 }}>//</span>
      {children}
    </Tag>
  );
}
