import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FallbackCardProps {
  hasTelegram: boolean;
  botUrl: string;
  qrCodeUrl: string;
}

const FallbackCard: React.FC<FallbackCardProps> = ({ hasTelegram, botUrl, qrCodeUrl }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl p-6 shadow-sm max-w-md mx-auto space-y-4"
    >
      {hasTelegram ? (
        <>
          <p className="text-foreground font-semibold">📱 Telegram ochilmadimi?</p>
          <p className="text-sm text-muted-foreground">
            Quyidagi tugmani bosib to'g'ridan-to'g'ri o'ting:
          </p>
          <a href={botUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="w-full gradient-primary text-primary-foreground gap-2">
              <ArrowRight className="w-5 h-5" />
              Telegram'da ochish
            </Button>
          </a>
        </>
      ) : (
        <>
          <p className="text-foreground font-semibold">💻 Kompyuterdan kiryapsizmi?</p>
          <p className="text-sm text-muted-foreground mb-2">
            Telefoningiz bilan QR kodni skanerlang:
          </p>
          <div className="bg-white rounded-xl p-4 mx-auto w-fit">
            <img src={qrCodeUrl} alt="QR Code" width={180} height={180} className="rounded" />
          </div>
          <p className="text-xs text-muted-foreground">yoki</p>
          <div className="flex gap-2">
            <a href={botUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <ArrowRight className="w-4 h-4" />
                Telegram Web
              </Button>
            </a>
            <a href="https://telegram.org/dl" target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Yuklab olish
              </Button>
            </a>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default FallbackCard;
