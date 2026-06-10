interface BadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export default function Badge({ count, max = 9, className = '' }: BadgeProps) {
  if (count <= 0) return null;
  return (
    <span className={`badge ${className}`}>
      {count > max ? `${max}+` : count}
    </span>
  );
}
