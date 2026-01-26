import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Castle, BookText, Lightbulb, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import MemoryPalaceTab from '@/components/mnemonics/MemoryPalaceTab';
import WordStoriesTab from '@/components/mnemonics/WordStoriesTab';
import MnemonicHintsTab from '@/components/mnemonics/MnemonicHintsTab';

const Mnemonics: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('palace');

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display font-bold text-2xl text-foreground mb-2">
            🧠 Mnemonic usullari
          </h1>
          <p className="text-muted-foreground text-sm">
            Xotira saroyida so'zlarni joylang, hikoyalar yarating yoki eslatmalar yozing
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="palace" className="gap-2">
              <Castle className="w-4 h-4" />
              <span className="hidden sm:inline">Xotira saroyi</span>
              <span className="sm:hidden">Saroy</span>
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <BookText className="w-4 h-4" />
              <span className="hidden sm:inline">Hikoyalar</span>
              <span className="sm:hidden">Hikoya</span>
            </TabsTrigger>
            <TabsTrigger value="hints" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Eslatmalar</span>
              <span className="sm:hidden">Eslatma</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="palace">
            <MemoryPalaceTab />
          </TabsContent>

          <TabsContent value="stories">
            <WordStoriesTab />
          </TabsContent>

          <TabsContent value="hints">
            <MnemonicHintsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Mnemonics;
