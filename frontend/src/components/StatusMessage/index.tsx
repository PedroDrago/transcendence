interface StatusMessageProps {
  message: string;
  type: 'success' | 'error';
  className?: string;
}

export default function StatusMessage({ message, type, className = '' }: StatusMessageProps) {
  return (
    <p
      className={`settings-msg settings-msg--${type} ${className}`}
    >
      {message}
    </p>
  );
}
