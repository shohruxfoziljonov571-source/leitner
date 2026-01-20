import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Book, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BookChapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
}

interface BookType {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  cover_image_url: string | null;
  language: string;
  level: string;
  total_chapters: number;
  is_active: boolean;
  created_at: string;
}

const BookManager: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookType[]>([]);
  const [chapters, setChapters] = useState<Record<string, BookChapter[]>>({});
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const [editingChapter, setEditingChapter] = useState<BookChapter | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    description: '',
    cover_image_url: '',
    language: 'en',
    level: 'beginner',
    is_active: true
  });

  const [chapterForm, setChapterForm] = useState({
    chapter_number: 1,
    title: '',
    content: ''
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
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
      setChapters(prev => ({ ...prev, [bookId]: data || [] }));
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const handleExpandBook = (bookId: string) => {
    if (expandedBook === bookId) {
      setExpandedBook(null);
    } else {
      setExpandedBook(bookId);
      if (!chapters[bookId]) {
        fetchChapters(bookId);
      }
    }
  };

  const handleSaveBook = async () => {
    if (!bookForm.title) {
      toast.error('Kitob nomi kiritilishi shart');
      return;
    }

    try {
      if (editingBook) {
        const { error } = await supabase
          .from('books')
          .update({
            ...bookForm,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBook.id);

        if (error) throw error;
        toast.success('Kitob yangilandi');
      } else {
        const { error } = await supabase
          .from('books')
          .insert({
            ...bookForm,
            created_by: user?.id
          });

        if (error) throw error;
        toast.success('Kitob qo\'shildi');
      }

      setIsBookDialogOpen(false);
      resetBookForm();
      fetchBooks();
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleSaveChapter = async () => {
    if (!chapterForm.title || !chapterForm.content || !selectedBookId) {
      toast.error('Barcha maydonlarni to\'ldiring');
      return;
    }

    const wordCount = chapterForm.content.split(/\s+/).filter(Boolean).length;

    try {
      if (editingChapter) {
        const { error } = await supabase
          .from('book_chapters')
          .update({
            chapter_number: chapterForm.chapter_number,
            title: chapterForm.title,
            content: chapterForm.content,
            word_count: wordCount
          })
          .eq('id', editingChapter.id);

        if (error) throw error;
        toast.success('Bob yangilandi');
      } else {
        const { error } = await supabase
          .from('book_chapters')
          .insert({
            book_id: selectedBookId,
            chapter_number: chapterForm.chapter_number,
            title: chapterForm.title,
            content: chapterForm.content,
            word_count: wordCount
          });

        if (error) throw error;

        // Update total chapters count
        const book = books.find(b => b.id === selectedBookId);
        if (book) {
          await supabase
            .from('books')
            .update({ total_chapters: (book.total_chapters || 0) + 1 })
            .eq('id', selectedBookId);
        }

        toast.success('Bob qo\'shildi');
      }

      setIsChapterDialogOpen(false);
      resetChapterForm();
      fetchChapters(selectedBookId);
      fetchBooks();
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Kitob va barcha boblarini o\'chirishni xohlaysizmi?')) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Kitob o\'chirildi');
      fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDeleteChapter = async (chapter: BookChapter) => {
    if (!confirm('Bobni o\'chirishni xohlaysizmi?')) return;

    try {
      const { error } = await supabase
        .from('book_chapters')
        .delete()
        .eq('id', chapter.id);

      if (error) throw error;

      // Update total chapters count
      const book = books.find(b => b.id === chapter.book_id);
      if (book && book.total_chapters > 0) {
        await supabase
          .from('books')
          .update({ total_chapters: book.total_chapters - 1 })
          .eq('id', chapter.book_id);
      }

      toast.success('Bob o\'chirildi');
      fetchChapters(chapter.book_id);
      fetchBooks();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleEditBook = (book: BookType) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author || '',
      description: book.description || '',
      cover_image_url: book.cover_image_url || '',
      language: book.language,
      level: book.level,
      is_active: book.is_active
    });
    setIsBookDialogOpen(true);
  };

  const handleEditChapter = (chapter: BookChapter) => {
    setEditingChapter(chapter);
    setSelectedBookId(chapter.book_id);
    setChapterForm({
      chapter_number: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content
    });
    setIsChapterDialogOpen(true);
  };

  const handleAddChapter = (bookId: string) => {
    setSelectedBookId(bookId);
    const existingChapters = chapters[bookId] || [];
    setChapterForm({
      chapter_number: existingChapters.length + 1,
      title: '',
      content: ''
    });
    setIsChapterDialogOpen(true);
  };

  const resetBookForm = () => {
    setBookForm({
      title: '',
      author: '',
      description: '',
      cover_image_url: '',
      language: 'en',
      level: 'beginner',
      is_active: true
    });
    setEditingBook(null);
  };

  const resetChapterForm = () => {
    setChapterForm({
      chapter_number: 1,
      title: '',
      content: ''
    });
    setEditingChapter(null);
    setSelectedBookId(null);
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

  if (isLoading) {
    return <div className="animate-pulse text-center py-8">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Kitoblar</h2>
          <p className="text-sm text-muted-foreground">
            O'qish uchun kitoblar va boblarni boshqaring
          </p>
        </div>
        <Dialog open={isBookDialogOpen} onOpenChange={(open) => {
          setIsBookDialogOpen(open);
          if (!open) resetBookForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Kitob qo'shish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBook ? 'Kitobni tahrirlash' : 'Yangi kitob'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kitob nomi *</Label>
                <Input
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="Masalan: The Little Prince"
                />
              </div>

              <div>
                <Label>Muallif</Label>
                <Input
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  placeholder="Antoine de Saint-Exupéry"
                />
              </div>

              <div>
                <Label>Tavsif</Label>
                <Textarea
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  placeholder="Kitob haqida qisqacha..."
                />
              </div>

              <div>
                <Label>Muqova rasmi (URL)</Label>
                <Input
                  value={bookForm.cover_image_url}
                  onChange={(e) => setBookForm({ ...bookForm, cover_image_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Til</Label>
                  <Select
                    value={bookForm.language}
                    onValueChange={(value) => setBookForm({ ...bookForm, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇬🇧 Ingliz tili</SelectItem>
                      <SelectItem value="ru">🇷🇺 Rus tili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Daraja</Label>
                  <Select
                    value={bookForm.level}
                    onValueChange={(value) => setBookForm({ ...bookForm, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Boshlang'ich</SelectItem>
                      <SelectItem value="intermediate">O'rta</SelectItem>
                      <SelectItem value="advanced">Yuqori</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={bookForm.is_active}
                  onCheckedChange={(checked) => setBookForm({ ...bookForm, is_active: checked })}
                />
                <Label>Faol</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsBookDialogOpen(false)}>
                  Bekor qilish
                </Button>
                <Button onClick={handleSaveBook}>
                  {editingBook ? 'Saqlash' : 'Qo\'shish'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chapter Dialog */}
      <Dialog open={isChapterDialogOpen} onOpenChange={(open) => {
        setIsChapterDialogOpen(open);
        if (!open) resetChapterForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? 'Bobni tahrirlash' : 'Yangi bob'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bob raqami</Label>
                <Input
                  type="number"
                  min={1}
                  value={chapterForm.chapter_number}
                  onChange={(e) => setChapterForm({ ...chapterForm, chapter_number: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Bob nomi *</Label>
                <Input
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  placeholder="Masalan: Chapter 1 - The Beginning"
                />
              </div>
            </div>

            <div>
              <Label>Matn *</Label>
              <Textarea
                value={chapterForm.content}
                onChange={(e) => setChapterForm({ ...chapterForm, content: e.target.value })}
                placeholder="Bob matnini kiriting..."
                className="min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {chapterForm.content.split(/\s+/).filter(Boolean).length} so'z
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsChapterDialogOpen(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleSaveChapter}>
                {editingChapter ? 'Saqlash' : 'Qo\'shish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {books.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Hali kitob qo'shilmagan</p>
              </CardContent>
            </Card>
          ) : (
            books.map((book) => (
              <Collapsible
                key={book.id}
                open={expandedBook === book.id}
                onOpenChange={() => handleExpandBook(book.id)}
              >
                <Card className={!book.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4 flex-1">
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-16 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-muted rounded-lg flex items-center justify-center">
                            <Book className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{book.title}</h3>
                            {getLevelBadge(book.level)}
                            <Badge variant="outline">
                              {book.language === 'en' ? '🇬🇧' : '🇷🇺'}
                            </Badge>
                          </div>
                          {book.author && (
                            <p className="text-sm text-muted-foreground">{book.author}</p>
                          )}
                          {book.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {book.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {book.total_chapters} ta bob
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {expandedBook === book.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBook(book)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBook(book.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4">
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Boblar</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddChapter(book.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Bob qo'shish
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(chapters[book.id] || []).map((chapter) => (
                            <motion.div
                              key={chapter.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {chapter.chapter_number}. {chapter.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {chapter.word_count} so'z
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditChapter(chapter)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteChapter(chapter)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                          {chapters[book.id]?.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Hali bob qo'shilmagan
                            </p>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BookManager;
