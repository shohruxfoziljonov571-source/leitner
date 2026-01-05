import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XpPopupProps {
  amount: number;
  show: boolean;
}

const XpPopup: React.FC<XpPopupProps> = ({ amount, show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.5 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-3 rounded-full shadow-elevated">
            <span className="font-display font-bold text-lg">+{amount} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XpPopup;
