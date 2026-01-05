import { useCallback, useState, useEffect } from 'react';

interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

const languageMap: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  uz: 'uz-UZ',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  tr: 'tr-TR',
};

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, options: SpeechOptions = {}) => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language
    const lang = options.lang || 'en';
    utterance.lang = languageMap[lang] || lang;

    // Find best matching voice
    const targetLang = languageMap[lang] || lang;
    const matchingVoice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const getVoicesForLanguage = useCallback((lang: string) => {
    const targetLang = languageMap[lang] || lang;
    return voices.filter(v => v.lang.startsWith(targetLang.split('-')[0]));
  }, [voices]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    getVoicesForLanguage,
  };
};
