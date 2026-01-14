import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerFlashProps {
  isCorrect: boolean | null;
  show: boolean;
}

const AnswerFlash: React.FC<AnswerFlashProps> = ({ isCorrect, show }) => {
  if (isCorrect === null) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 pointer-events-none z-30 ${
            isCorrect 
              ? 'bg-primary' 
              : 'bg-destructive'
          }`}
        />
      )}
    </AnimatePresence>
  );
};

export default AnswerFlash;
