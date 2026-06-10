import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  minRows?: number;
}

export default function Textarea({ error, minRows = 3, className = '', style, ...props }: TextareaProps) {
  return (
    <textarea
      className={className}
      rows={minRows}
      style={{
        width: '100%',
        background: '#0D0D0D',
        border: `1px solid ${error ? 'var(--error)' : 'var(--line)'}`,
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        color: 'var(--text)',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        resize: 'vertical',
        transition: 'border-color 150ms, box-shadow 150ms',
        outline: 'none',
        ...style,
      }}
      onFocus={(e) => {
        if (!error) {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.boxShadow = 'var(--ring)';
        }
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--line)';
        e.currentTarget.style.boxShadow = '';
        props.onBlur?.(e);
      }}
      {...props}
    />
  );
}
