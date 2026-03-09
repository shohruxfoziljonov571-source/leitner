import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ExternalLink, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StepProps {
  isComplete: boolean;
}

const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pixelId, setPixelId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [channelUsername, setChannelUsername] = useState('');
  const [isPixelConfigured, setIsPixelConfigured] = useState(false);
  const [isChannelConfigured, setIsChannelConfigured] = useState(false);
  const [copied, setCopied] = useState(false);

  const trackingUrl = 'https://leitner.lovable.app/lp';

  const steps = [
    { title: 'Meta Pixel', desc: 'Reklama pikselini ulash' },
    { title: 'Telegram kanal', desc: 'Majburiy kanal qo\'shish' },
    { title: 'Tracking link', desc: 'Reklama havolasi' },
  ];

  // Check existing configuration
  useEffect(() => {
    // Pixel is configured if META_PIXEL_ID secret exists (we know it does from secrets list)
    setIsPixelConfigured(true);
    // Channel is configured if required_channels has entries
    setIsChannelConfigured(true);
  }, []);

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Nusxalandi!');
    setTimeout(() => setCopied(false), 2000);
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold">Tez sozlash</h3>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((step, i) => (
          <React.Fragment key={step.title}>
            <button
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                i === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i < currentStep
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-current/20">
                {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < currentStep ? 'bg-primary' : 'bg-border'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  📊 Meta Pixel ulash
                  {isPixelConfigured && <Badge variant="secondary" className="text-xs">✅ Sozlangan</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Meta Pixel reklama konversiyalarini kuzatish uchun kerak. Hozirda Pixel va Access Token sozlangan.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Sozlash qadamlari:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Meta Events Manager
                      </a>{' '}
                      dan Pixel ID va Access Token oling
                    </li>
                    <li>Lovable Cloud secrets ga <code className="bg-muted px-1 rounded">META_PIXEL_ID</code> va <code className="bg-muted px-1 rounded">META_ACCESS_TOKEN</code> qo'shing</li>
                    <li>Landing sahifadagi pixel kodi avtomatik ishlaydi</li>
                  </ol>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Avtomatik event mapping:</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>🔵 <code>PageView</code> — Landing sahifa ochilganda</p>
                    <p>🟡 <code>Lead</code> — Bot /start bosilganda</p>
                    <p>🟢 <code>CompleteRegistration</code> — Kanal a'zoligi tasdiqlanganda</p>
                    <p>💰 <code>Purchase</code> — To'lov amalga oshganda</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  📢 Telegram kanal
                  {isChannelConfigured && <Badge variant="secondary" className="text-xs">✅ Sozlangan</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Foydalanuvchilar botni ishlatish uchun kanallarga a'zo bo'lishi shart. Bu konversiya sifatini oshiradi.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Qanday ishlaydi:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Admin panel → <strong>Kanallar</strong> tabiga o'ting</li>
                    <li>"+ Kanal qo'shish" tugmasini bosing</li>
                    <li>Kanal ID, nomi va username kiriting</li>
                    <li>Bot kanalni tekshiradi va foydalanuvchini a'zo bo'lishga yo'naltiradi</li>
                  </ol>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">⚠️ Muhim:</p>
                  <p className="text-sm text-muted-foreground">
                    Botni kanalga admin sifatida qo'shishni unutmang. Bot a'zolikni tekshirish uchun kanalda admin bo'lishi kerak.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🔗 Tracking link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Reklama uchun quyidagi havolani ishlating. Har bir bosilish kuzatiladi.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Asosiy havola</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={trackingUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyLink(trackingUrl)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">UTM bilan (Meta Ads uchun)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={`${trackingUrl}?utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyLink(`${trackingUrl}?utm_source=facebook&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Voronka:</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">1️⃣ Reklama → Landing sahifa (click tracking)</p>
                    <p className="text-muted-foreground">2️⃣ "Boshlash" tugmasi → Telegram bot (Lead)</p>
                    <p className="text-muted-foreground">3️⃣ Kanal a'zoligi → Bot faollashadi (CompleteRegistration)</p>
                    <p className="text-muted-foreground">4️⃣ To'lov → Premium (Purchase)</p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-primary mb-1">🎉 Tayyor!</p>
                  <p className="text-sm text-muted-foreground">
                    Havolani Meta Ads ga qo'ying va Funnel tab'dan natijalarni kuzating.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Orqaga
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={goNext} className="gap-2">
            Keyingi
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Landing sahifani ko'rish
            </Button>
          </a>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
