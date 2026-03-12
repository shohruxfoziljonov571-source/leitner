import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BOT_USERNAME = 'Leitner_robot';

function generateClickId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isTelegramInstalled(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod/i.test(ua);
  const isTgWebView = /tgweb/i.test(ua) || (window as any).Telegram;
  return isMobile || isTgWebView;
}

const sanitizeUtm = (value: string | null, maxLen = 256): string | null => {
  if (!value) return null;
  return value.slice(0, maxLen).replace(/[<>"'`;]/g, '');
};

export function useLandingTracking(variant: string) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [clickId, setClickId] = useState('');
  const hasTelegram = useMemo(() => isTelegramInstalled(), []);

  useEffect(() => {
    setClickId(generateClickId());
  }, []);

  const botUrl = `https://t.me/${BOT_USERNAME}?start=ad_${clickId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(botUrl)}&bgcolor=ffffff&color=000000&format=svg`;

  const saveClick = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      await supabase.from('ad_clicks').insert({
        click_id: clickId,
        fbclid: sanitizeUtm(params.get('fbclid')),
        utm_source: sanitizeUtm(params.get('utm_source')),
        utm_medium: sanitizeUtm(params.get('utm_medium')),
        utm_campaign: sanitizeUtm(params.get('utm_campaign')),
        utm_content: sanitizeUtm(params.get('utm_content')),
        utm_term: sanitizeUtm(params.get('utm_term')),
        user_agent: (navigator.userAgent || '').slice(0, 512),
        landing_variant: variant,
      } as any);
    } catch (e) {
      console.error('Error saving click:', e);
    }
  };

  const handleStartNow = async () => {
    setIsRedirecting(true);

    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead');
    }

    await saveClick();

    if (hasTelegram) {
      window.location.href = botUrl;
      setTimeout(() => {
        setShowFallback(true);
        setIsRedirecting(false);
      }, 2000);
    } else {
      setShowFallback(true);
      setIsRedirecting(false);
    }
  };

  return {
    isRedirecting,
    showFallback,
    hasTelegram,
    botUrl,
    qrCodeUrl,
    handleStartNow,
  };
}
