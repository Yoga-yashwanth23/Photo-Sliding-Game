import { AnimatePresence, motion } from 'framer-motion';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A lightweight, animated in-app confirmation dialog.
 *
 * This replaces native window.confirm()/alert() calls used elsewhere in the
 * app. Native dialogs are blocking, unstyled, and (on some mobile browsers)
 * can leave React's router mid-transition — which is what caused "End
 * Voyage" to update the URL without actually swapping the page until a
 * manual refresh. A regular React modal avoids that entirely and feels a
 * lot more fluid, especially on touch devices.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-abyss/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="parchment-panel relative w-full max-w-sm p-6 text-center sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-modal-title" className="mb-2 text-xl">
              {title}
            </h2>
            <p className="mb-6 text-sm text-abyss/70">{message}</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={onCancel} className="btn-outline w-full text-abyss sm:w-auto">
                {cancelLabel}
              </button>
              <button type="button" onClick={onConfirm} className="btn-gold w-full sm:w-auto">
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
