interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size, className = '' }: SpinnerProps) {
  return (
    <span
      className={`spinner ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
