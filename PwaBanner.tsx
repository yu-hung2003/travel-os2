import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Minimal mobile bottom sheet: backdrop + slide-up panel. */
export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="關閉"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-surface-2 pb-safe shadow-card">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        {title && <h2 className="px-5 pt-3 text-base font-bold">{title}</h2>}
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-6 pt-3">{children}</div>
      </div>
    </div>
  );
}
