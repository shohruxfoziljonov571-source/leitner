import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Play, Pause, Send, Check, X, ArrowLeft, RotateCcw, FileAudio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useGamification } from '@/hooks/useGamification';
import XpPopup from '@/components/gamification/XpPopup';
import ErrorHighlight from '@/components/dictation/ErrorHighlight';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Dictation {
  id: string;
  title: string;
  description: string | null;
  level: string;
  language: string;
  audio_text: string;
  audio_url: string | null;
  duration_seconds: number | null;
}

interface ErrorDetail {
  wrong: string;
  correct: string;
  position: number;
  type: 'missing' | 'extra' | 'spelling' | 'punctuation';
}

interface DictationResult {
  accuracy_percentage: number;
  errors_count: number;
  errors: ErrorDetail[];
  feedback: string;
  xp_earned: number;
}

const Dictation: React.FC = () => {
  const { user } = useAuth();
  const { speak, stop, isSpeaking } = useSpeech();
  const { addXp } = useGamification();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [selectedDictation, setSelectedDictation] = useState<Dictation | null>(null);
  const [userText, setUserText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DictationResult | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    fetchDictations();
  }, []);

  const fetchDictations = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_dictations')
        .select('id, title, description, level, language, audio_text, audio_url, duration_seconds')
        .eq('is_active', true)
        .order('level', { ascending: true });

      if (error) throw error;
      setDictations(data || []);
    } catch (error) {
      console.error('Error fetching dictations:', error);
      toast.error('Diktantlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = useCallback(() => {
    if (!selectedDictation) return;
    
    if (selectedDictation.audio_url) {
      // Play uploaded audio
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.play();
          setIsPlaying(true);
          setPlayCount(prev => prev + 1);
        }
      }
    } else {
      // Use TTS
      if (isSpeaking) {
        stop();
      } else {
        speak(selectedDictation.audio_text, { 
          lang: selectedDictation.language, 
          rate: 0.75 
        });
        setPlayCount(prev => prev + 1);
      }
    }
  }, [selectedDictation, isPlaying, isSpeaking, speak, stop, playbackRate]);

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const time = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setAudioProgress(value[0]);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!selectedDictation || !userText.trim() || !user) {
      toast.error('Matn kiriting');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke('check-dictation', {
        body: {
          submittedText: userText,
          originalText: selectedDictation.audio_text,
          dictationId: selectedDictation.id,
          userId: user.id
        }
      });

      if (response.error) throw response.error;

      const resultData = response.data as DictationResult;
      setResult(resultData);

      // Add XP
      if (resultData.xp_earned > 0) {
        await addXp(resultData.xp_earned, 'dictation_complete');
        setLastXpGain(resultData.xp_earned);
        setShowXpPopup(true);
        setTimeout(() => setShowXpPopup(false), 2000);
      }

      toast.success('Diktant tekshirildi!');
    } catch (error) {
      console.error('Error checking dictation:', error);
      toast.error('Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setUserText('');
    setResult(null);
    setPlayCount(0);
    stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handleBack = () => {
    setSelectedDictation(null);
    handleReset();
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-500/10 text-green-500',
      intermediate: 'bg-yellow-500/10 text-yellow-500',
      advanced: 'bg-red-500/10 text-red-500'
    };
    const labels: Record<string, string> = {
      beginner: 'Boshlang\'ich',
      intermediate: 'O\'rta',
      advanced: 'Yuqori'
    };
    return <Badge className={colors[level]}>{labels[level]}</Badge>;
  };

  const filteredDictations = levelFilter === 'all' 
    ? dictations 
    : dictations.filter(d => d.level === levelFilter);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  // Dictation in progress
  if (selectedDictation) {
    const hasUploadedAudio = !!selectedDictation.audio_url;

    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <XpPopup amount={lastXpGain} show={showXpPopup} />
        
        {/* Hidden audio element */}
        {hasUploadedAudio && (
          <audio
            ref={audioRef}
            src={selectedDictation.audio_url!}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={handleAudioEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        )}
        
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Orqaga
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedDictation.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getLevelBadge(selectedDictation.level)}
                      <Badge variant="outline">
                        {selectedDictation.language === 'en' ? '🇬🇧' : selectedDictation.language === 'ru' ? '🇷🇺' : '🇩🇪'}
                      </Badge>
                      {hasUploadedAudio && (
                        <Badge variant="secondary" className="gap-1">
                          <FileAudio className="h-3 w-3" />
                          Audio
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Tinglandi</p>
                    <p className="text-2xl font-bold">{playCount}x</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Audio controls */}
                <div className="space-y-4">
                  {hasUploadedAudio ? (
                    <>
                      {/* Audio player with progress */}
                      <div className="flex justify-center">
                        <Button
                          size="lg"
                          variant={isPlaying ? 'destructive' : 'default'}
                          onClick={handlePlayAudio}
                          className="gap-2 min-w-[200px]"
                        >
                          {isPlaying ? (
                            <><Pause className="h-5 w-5" /> To'xtatish</>
                          ) : (
                            <><Play className="h-5 w-5" /> Tinglash</>
                          )}
                        </Button>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="space-y-2">
                        <Slider
                          value={[audioProgress]}
                          onValueChange={handleSeek}
                          max={100}
                          step={0.1}
                          className="cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTime((audioProgress / 100) * audioDuration)}</span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                      </div>
                      
                      {/* Playback speed */}
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">Tezlik:</span>
                        {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                          <Button
                            key={rate}
                            variant={playbackRate === rate ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePlaybackRateChange(rate)}
                          >
                            {rate}x
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        variant={isSpeaking ? 'destructive' : 'default'}
                        onClick={handlePlayAudio}
                        className="gap-2 min-w-[200px]"
                      >
                        {isSpeaking ? (
                          <><Pause className="h-5 w-5" /> To'xtatish</>
                        ) : (
                          <><Play className="h-5 w-5" /> Tinglash</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Text input */}
                {!result && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Eshitganingizni yozing:
                      </label>
                      <Textarea
                        value={userText}
                        onChange={(e) => setUserText(e.target.value)}
                        placeholder="Matnni bu yerga yozing..."
                        className="min-h-[200px] text-lg"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {userText.split(/\s+/).filter(Boolean).length} so'z yozildi
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Tozalash
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!userText.trim() || isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          'Tekshirilmoqda...'
                        ) : (
                          <><Send className="h-4 w-4 mr-2" /> Tekshirish</>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {/* Results */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      {/* Score */}
                      <div className="text-center py-6">
                        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
                          result.accuracy_percentage >= 80 
                            ? 'bg-green-500/10 text-green-500' 
                            : result.accuracy_percentage >= 50 
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-red-500/10 text-red-500'
                        }`}>
                          <span className="text-3xl font-bold">
                            {Math.round(result.accuracy_percentage)}%
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-medium">
                          {result.accuracy_percentage >= 80 
                            ? '🎉 Ajoyib natija!' 
                            : result.accuracy_percentage >= 50 
                              ? '👍 Yaxshi harakat!'
                              : '💪 Davom eting!'}
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <X className="h-4 w-4 text-red-500" />
                            {result.errors_count} xato
                          </span>
                          <span className="flex items-center gap-1">
                            <Check className="h-4 w-4 text-green-500" />
                            +{result.xp_earned} XP
                          </span>
                        </div>
                      </div>

                      {/* Detailed errors */}
                      {result.errors && result.errors.length > 0 && selectedDictation && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Xatolar tahlili</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ErrorHighlight 
                              originalText={selectedDictation.audio_text}
                              submittedText={userText}
                              errors={result.errors}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Feedback */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">AI Fikri</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground whitespace-pre-wrap">{result.feedback}</p>
                        </CardContent>
                      </Card>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="flex-1"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Qayta urinish
                        </Button>
                        <Button
                          onClick={handleBack}
                          className="flex-1"
                        >
                          Boshqa diktant
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Dictation list
  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display font-bold text-2xl">Audio Diktant</h1>
              <p className="text-muted-foreground">
                Eshiting va yozing - AI xatolarni topadi
              </p>
            </div>
            <Link to="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Daraja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha darajalar</SelectItem>
              <SelectItem value="beginner">Boshlang'ich</SelectItem>
              <SelectItem value="intermediate">O'rta</SelectItem>
              <SelectItem value="advanced">Yuqori</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <div className="space-y-3">
          {filteredDictations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Volume2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Hali diktant mavjud emas</p>
              </CardContent>
            </Card>
          ) : (
            filteredDictations.map((dictation, index) => (
              <motion.div
                key={dictation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedDictation(dictation)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{dictation.title}</h3>
                        {dictation.description && (
                          <p className="text-sm text-muted-foreground">
                            {dictation.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {getLevelBadge(dictation.level)}
                          <Badge variant="outline">
                            {dictation.audio_text.split(/\s+/).length} so'z
                          </Badge>
                          {dictation.audio_url && (
                            <Badge variant="secondary" className="gap-1">
                              <FileAudio className="h-3 w-3" />
                              Audio
                            </Badge>
                          )}
                          {dictation.duration_seconds && dictation.duration_seconds > 0 && (
                            <Badge variant="outline">
                              {Math.floor(dictation.duration_seconds / 60)}:{(dictation.duration_seconds % 60).toString().padStart(2, '0')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost">
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dictation;
