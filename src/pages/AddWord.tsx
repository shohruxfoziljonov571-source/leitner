import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWords } from '@/hooks/useWords';
import AddWordForm from '@/components/AddWordForm';

const AddWord: React.FC = () => {
  const { t } = useLanguage();
  const { addWord } = useWords();

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {t('addWord')} ✨
          </h1>
          <p className="text-muted-foreground">
            Yangi so'z qo'shing va o'rganishni boshlang
          </p>
        </motion.div>

        {/* Form Card */}
        <div className="bg-card rounded-3xl shadow-card p-6">
          <AddWordForm
            onAddWord={(word) => {
              addWord(word);
            }}
          />
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <h4 className="font-medium text-sm text-primary mb-2">💡 Maslahat</h4>
          <p className="text-sm text-muted-foreground">
            So'zlar bilan birga misol gaplar qo'shing - bu yodda saqlashni osonlashtiradi!
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AddWord;
