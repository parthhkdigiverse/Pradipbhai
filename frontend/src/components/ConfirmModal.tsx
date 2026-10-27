import React from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
  icon
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const buttonColors = {
    primary: 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/35',
    info: 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35'
  };

  const iconColors = {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    danger: 'bg-rose-50 text-rose-500 border border-rose-200/80',
    warning: 'bg-amber-50 text-amber-500 border border-amber-200/80',
    info: 'bg-primary/10 text-primary border border-primary/20'
  };

  const defaultIcons = {
    primary: <AlertCircle className="w-6 h-6" />,
    danger: <AlertTriangle className="w-6 h-6" />,
    warning: <AlertTriangle className="w-6 h-6" />,
    info: <AlertCircle className="w-6 h-6" />
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/80 max-w-md w-full p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-100/80 rounded-xl transition-all cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs transition-transform ${iconColors[variant]}`}>
            {icon || defaultIcons[variant]}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1.5">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-normal">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 ${buttonColors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
