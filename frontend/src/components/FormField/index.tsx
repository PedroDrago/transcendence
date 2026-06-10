import React from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export default function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        <span style={{ color: 'var(--accent-strong)', opacity: 0.7 }}>// </span>
        {label}
      </span>
      {children}
      {hint && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
