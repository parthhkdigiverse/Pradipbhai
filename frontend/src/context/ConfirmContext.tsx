import React, { createContext, useContext, useState, useRef } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

interface ConfirmContextType {
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmDialogOptions | string): Promise<boolean> => {
    const opts: ConfirmDialogOptions = typeof options === 'string'
      ? { title: 'Confirm Action', message: options, variant: 'danger', confirmText: 'Confirm' }
      : options;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState(opts);
    });
  };

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setDialogState(null);
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setDialogState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState && (
        <ConfirmModal
          isOpen={true}
          title={dialogState.title}
          message={dialogState.message}
          confirmText={dialogState.confirmText || 'Confirm'}
          cancelText={dialogState.cancelText || 'Cancel'}
          variant={dialogState.variant || 'danger'}
          icon={dialogState.icon}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

