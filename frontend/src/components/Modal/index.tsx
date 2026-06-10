'use client';

import React from 'react';

interface ModalProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function Modal({ title, onClose, children, actions }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <h2>{title}</h2>
        <div>{children}</div>
        {actions && (
          <div className="modal-actions">{actions}</div>
        )}
      </div>
    </div>
  );
}
