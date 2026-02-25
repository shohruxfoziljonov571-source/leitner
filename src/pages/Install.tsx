import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle, ExternalLink, Share } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PUBLISHED_URL = 'https://leitner.lovable.app/install';

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    // Detect environment
    const ua = navigator.userAgent || '';
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsTelegram(!!window.Telegram?.WebApp?.initData);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleOpenInBrowser = () => {
    // Telegram WebApp.openLink opens URL in system browser
    if (window.Telegram?.WebApp) {
      (window.Telegram.WebApp as any).openLink(PUBLISHED_URL);
    } else {
      window.open(PUBLISHED_URL, '_blank');
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Ilova o'rnatilgan! ✅</h1>
          <p className="text-muted-foreground">
            Leitner ilovasi telefoningizga o'rnatilgan. Bosh ekrandan oching.
          </p>
        </div>
      </div>
    );
  }

  // Inside Telegram — redirect to browser
  if (isTelegram) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <Smartphone className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Ilovani o'rnating 📲</h1>
          <p className="text-muted-foreground">
            Leitner ilovasini telefoningizga o'rnatib, tezroq va qulay foydalaning — internet bo'lmasa ham ishlaydi!
          </p>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleOpenInBrowser}
          >
            <ExternalLink className="w-5 h-5" />
            Brauzerda ochish va o'rnatish
          </Button>
          <p className="text-xs text-muted-foreground">
            Tugmani bosing → Brauzerda ochiladi → "O'rnatish" tugmasini bosing
          </p>
        </div>
      </div>
    );
  }

  // In browser — show install prompt or iOS guide
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <Download className="w-16 h-16 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">Leitner ilovasini o'rnating 📲</h1>
        <p className="text-muted-foreground">
          Ilovani bosh ekranga qo'shing — tezkor kirish va offline ishlash imkoniyati!
        </p>

        {deferredPrompt ? (
          <Button size="lg" className="w-full gap-2" onClick={handleInstall}>
            <Download className="w-5 h-5" />
            Ilovani o'rnatish
          </Button>
        ) : isIOS ? (
          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-left">
            <p className="font-medium text-sm">iOS da o'rnatish:</p>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Safari brauzer pastidagi <Share className="w-4 h-4 inline" /> (Share) tugmasini bosing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>"Add to Home Screen" ni tanlang</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>"Add" tugmasini bosing</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-left">
            <p className="font-medium text-sm">O'rnatish uchun:</p>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Chrome brauzer menyusini oching (⋮)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>"Install app" yoki "Add to Home Screen" ni tanlang</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
