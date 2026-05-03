import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-outline-variant/10"
        >
          <h3 className="text-2xl font-serif font-bold mb-4">{title}</h3>
          <p className="text-on-surface-variant mb-8 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={onConfirm} className="flex-1">Löschen</Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">Abbrechen</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
