import { PropsWithChildren } from "react";
import clsx from "clsx";

type ModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  fullscreen?: boolean;
}>;

export function Modal({ open, onClose, title, children, className, fullscreen = false }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 overflow-auto rounded-lg border shadow-lg",
          fullscreen ? "w-screen h-screen" : "w-[90vw] max-w-5xl max-h-[85vh]",
          className
        )}
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between">
            <div className="font-medium">{title}</div>
            <button className="px-3 py-1 border rounded" style={{ borderColor: "var(--border-color)" }} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default Modal;

