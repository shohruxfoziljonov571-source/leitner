import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ArrowLeft, ChevronLeft, ChevronRight, Volume2, Pause, Bookmark, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSpeech } from '@/hooks/useSpeech';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import WordPopup from '@/components/books/WordPopup';

interface BookType {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_image_url: string | null;
  language: string;
  level: string;
  total_chapters: number;
}

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
}

interface ReadingProgress {
  id: string;
  book_id: string;
  current_chapter: number;
  completed_chapters: number[];
}

const Books: React.FC = () => {
  const { user } = useAuth();
  const { speak, stop, isSpeaking } = useSpeech();
  
  const [books, setBooks] = useState<BookType[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, description, cover_image_url, language, level, total_chapters')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Kitoblarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChapters = async (bookId: string) => {
    try {
      const { data, error } = await supabase
        .from('book_chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
      
      if (data && data.length > 0) {
        setCurrentChapter(data[0]);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchReadingProgress = async (bookId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setReadingProgress(data);
        // Navigate to last read chapter
        const lastChapter = chapters.find(c => c.chapter_number === data.current_chapter);
        if (lastChapter) {
          setCurrentChapter(lastChapter);
        }
      }
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    }
  };

  const updateProgress = async (chapterNumber: number) => {
    if (!user || !selectedBook) return;

    try {
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: selectedBook.id,
          current_chapter: chapterNumber,
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,book_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleSelectBook = async (book: BookType) => {
    setSelectedBook(book);
    await fetchChapters(book.id);
  };

  useEffect(() => {
    if (selectedBook && chapters.length > 0 && user) {
      fetchReadingProgress(selectedBook.id);
    }
  }, [selectedBook, chapters, user]);

  const handleChapterChange = (chapter: Chapter) => {
    stop();
    setCurrentChapter(chapter);
    updateProgress(chapter.chapter_number);
  };

  const handleNextChapter = () => {
    if (!currentChapter) return;
    const nextChapter = chapters.find(c => c.chapter_number === currentChapter.chapter_number + 1);
    if (nextChapter) {
      handleChapterChange(nextChapter);
    }
  };

  const handlePrevChapter = () => {
    if (!currentChapter) return;
    const prevChapter = chapters.find(c => c.chapter_number === currentChapter.chapter_number - 1);
    if (prevChapter) {
      handleChapterChange(prevChapter);
    }
  };

  const handlePlayChapter = useCallback(() => {
    if (!currentChapter) return;
    
    if (isSpeaking) {
      stop();
    } else {
      speak(currentChapter.content, { 
        lang: selectedBook?.language || 'en', 
        rate: 0.85 
      });
    }
  }, [currentChapter, selectedBook, isSpeaking, speak, stop]);

  const handleWordClick = (word: string) => {
    setSelectedWord(word.replace(/[.,!?;:'"]/g, ''));
    speak(word, { lang: selectedBook?.language || 'en', rate: 0.7 });
  };

  const handleBack = () => {
    stop();
    setSelectedBook(null);
    setChapters([]);
    setCurrentChapter(null);
    setReadingProgress(null);
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

  const filteredBooks = levelFilter === 'all' 
    ? books 
    : books.filter(b => b.level === levelFilter);

  const fontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  // Reading mode
  if (selectedBook && currentChapter) {
    const progress = ((currentChapter.chapter_number) / chapters.length) * 100;

    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Orqaga
              </Button>
              <div className="flex items-center gap-2">
                <Select value={fontSize} onValueChange={(v) => setFontSize(v as any)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Kichik</SelectItem>
                    <SelectItem value="base">O'rta</SelectItem>
                    <SelectItem value="lg">Katta</SelectItem>
                    <SelectItem value="xl">Juda katta</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={isSpeaking ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={handlePlayChapter}
                >
                  {isSpeaking ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>{selectedBook.title}</span>
                <span>{currentChapter.chapter_number}/{chapters.length}</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>

            {/* Chapter selector */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevChapter}
                disabled={currentChapter.chapter_number === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select 
                value={currentChapter.id}
                onValueChange={(id) => {
                  const chapter = chapters.find(c => c.id === id);
                  if (chapter) handleChapterChange(chapter);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.chapter_number}. {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextChapter}
                disabled={currentChapter.chapter_number === chapters.length}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle>{currentChapter.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentChapter.word_count} so'z
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className={`${fontSizeClass[fontSize]} leading-relaxed space-y-4`}>
                    {currentChapter.content.split('\n\n').map((paragraph, pIndex) => (
                      <p key={pIndex}>
                        {paragraph.split(/\s+/).map((word, wIndex) => (
                          <WordPopup
                            key={`${pIndex}-${wIndex}`}
                            word={word}
                            language={selectedBook?.language || 'en'}
                            isSelected={selectedWord === word.replace(/[.,!?;:'"]/g, '')}
                            onWordClick={handleWordClick}
                          >
                            {word}{' '}
                          </WordPopup>
                        ))}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={handlePrevChapter}
                disabled={currentChapter.chapter_number === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Oldingi bob
              </Button>
              <Button
                onClick={handleNextChapter}
                disabled={currentChapter.chapter_number === chapters.length}
              >
                Keyingi bob
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Book list
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
              <h1 className="font-display font-bold text-2xl">Kitoblar</h1>
              <p className="text-muted-foreground">
                Ingliz tilida kitob o'qing
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

        <div className="grid gap-4">
          {filteredBooks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Hali kitob mavjud emas</p>
              </CardContent>
            </Card>
          ) : (
            filteredBooks.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => handleSelectBook(book)}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      {book.cover_image_url ? (
                        <img
                          src={book.cover_image_url}
                          alt={book.title}
                          className="w-24 h-36 object-cover"
                        />
                      ) : (
                        <div className="w-24 h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Book className="h-10 w-10 text-primary/50" />
                        </div>
                      )}
                      <div className="p-4 flex-1">
                        <h3 className="font-semibold text-lg">{book.title}</h3>
                        {book.author && (
                          <p className="text-sm text-muted-foreground">{book.author}</p>
                        )}
                        {book.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {book.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {getLevelBadge(book.level)}
                          <Badge variant="outline">
                            {book.total_chapters} bob
                          </Badge>
                          <Badge variant="outline">
                            {book.language === 'en' ? '🇬🇧' : '🇷🇺'}
                          </Badge>
                        </div>
                      </div>
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

export default Books;
