import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    icon: '🗑️',
    bg: 'from-red-500 to-rose-600',
    btn: 'bg-red-600 hover:bg-red-700',
    ring: 'ring-red-100',
  },
  warning: {
    icon: '⚠️',
    bg: 'from-amber-500 to-orange-600',
    btn: 'bg-amber-600 hover:bg-amber-700',
    ring: 'ring-amber-100',
  },
  info: {
    icon: '✏️',
    bg: 'from-blue-500 to-indigo-600',
    btn: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-100',
  },
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก',
  variant = 'danger', onConfirm, onCancel,
}) => {
  if (!open) return null;
  const s = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal */}
      <div className={`relative bg-white rounded-3xl shadow-2xl ring-4 ${s.ring} max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${s.bg} px-6 py-5 text-center`}>
          <span className="text-4xl">{s.icon}</span>
          {title && <h3 className="text-lg font-black text-white mt-2">{title}</h3>}
        </div>
        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm font-bold text-slate-600 text-center leading-relaxed">{message}</p>
        </div>
        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-normal bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-normal text-white ${s.btn} transition-colors shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
