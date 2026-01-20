import React, { useState, useMemo, useRef } from 'react';
import { Send, Users, UserCheck, UserX, Flame, Loader2, Eye, EyeOff, Image, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Telegram HTML allowed tags
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a', 'tg-spoiler'];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const BroadcastMessage = () => {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [includeButton, setIncludeButton] = useState(true);
  const [buttonText, setButtonText] = useState('📚 Ilovani ochish');
  const [targetGroup, setTargetGroup] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastResult, setLastResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);

  // Validate Telegram HTML
  const validateTelegramHtml = (text: string): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unclosed tags
    const tagPattern = /<(\/?)([\w-]+)([^>]*)>/g;
    const openTags: string[] = [];
    let match;

    while ((match = tagPattern.exec(text)) !== null) {
      const [, isClosing, tagName, attributes] = match;
      const lowerTagName = tagName.toLowerCase();

      // Check if tag is allowed
      if (!ALLOWED_TAGS.includes(lowerTagName)) {
        errors.push(`<${tagName}> tegi Telegram HTML'da qo'llab-quvvatlanmaydi`);
      }

      // Track open/close tags
      if (!isClosing) {
        // Check for self-closing (not really used in Telegram HTML)
        if (!attributes.endsWith('/')) {
          openTags.push(lowerTagName);
        }
      } else {
        const lastOpen = openTags.pop();
        if (lastOpen !== lowerTagName) {
          errors.push(`<${tagName}> tegi noto'g'ri yopilgan`);
        }
      }

      // Validate <a> tag has href
      if (lowerTagName === 'a' && !isClosing) {
        if (!attributes.includes('href=')) {
          errors.push('<a> tegi href atributisiz ishlatilgan');
        }
      }
    }

    // Check for unclosed tags
    if (openTags.length > 0) {
      errors.push(`Yopilmagan teglar: ${openTags.map(t => `<${t}>`).join(', ')}`);
    }

    // Check for common mistakes
    if (text.includes('<br>') || text.includes('<br/>')) {
      warnings.push('Telegram <br> tegini qo\'llab-quvvatlamaydi, o\'rniga yangi qator (Enter) ishlating');
    }

    if (text.includes('<p>') || text.includes('</p>')) {
      warnings.push('Telegram <p> tegini qo\'llab-quvvatlamaydi');
    }

    // Check for special characters that need escaping
    if (text.includes('&') && !text.includes('&amp;') && !text.includes('&#')) {
      warnings.push('& belgisi xatolarga olib kelishi mumkin');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const validation = useMemo(() => validateTelegramHtml(message), [message]);

  // Convert Telegram HTML to displayable HTML for preview
  const getPreviewHtml = (text: string): string => {
    // Replace newlines with <br>
    let html = text.replace(/\n/g, '<br>');
    
    // Handle Telegram-specific tags
    html = html.replace(/<tg-spoiler>/g, '<span class="bg-muted text-muted blur-sm hover:blur-none transition-all cursor-pointer">');
    html = html.replace(/<\/tg-spoiler>/g, '</span>');
    
    // Make links clickable but not actually navigate
    html = html.replace(/<a href="([^"]+)">/g, '<a href="$1" class="text-primary underline" onclick="event.preventDefault()">');
    
    return html;
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllari ruxsat etilgan');
      return;
    }

    // Validate file size (max 10MB for Telegram)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Rasm hajmi 10MB dan oshmasligi kerak');
      return;
    }

    setIsUploadingImage(true);
    setImageFile(file);

    try {
      const fileName = `broadcast/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('broadcast-images')
        .upload(fileName, file);

      if (error) {
        // If bucket doesn't exist, we'll use direct URL
        console.error('Upload error:', error);
        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        setImageUrl(objectUrl);
        toast.info('Rasm mahalliy saqlanadi');
      } else {
        const { data: urlData } = supabase.storage
          .from('broadcast-images')
          .getPublicUrl(data.path);
        
        setImageUrl(urlData.publicUrl);
        toast.success('Rasm yuklandi');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      // Fallback to object URL
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Xabar matni kiritilmagan");
      return;
    }

    if (!validation.isValid) {
      toast.error("HTML xatolarini to'g'rilang");
      return;
    }

    if (!session?.access_token) {
      toast.error("Sessiya topilmadi. Iltimos, qayta login qiling.");
      return;
    }

    const confirmed = window.confirm(
      `Haqiqatan ham ${targetGroup === 'all' ? 'barcha' : targetGroup === 'active' ? 'faol' : targetGroup === 'inactive' ? 'nofaol' : 'streak bor'} foydalanuvchilarga xabar yubormoqchimisiz?`
    );

    if (!confirmed) return;

    setIsSending(true);
    setLastResult(null);

    try {
      // If we have a file but no uploaded URL, upload it first as base64
      let finalImageUrl = imageUrl;
      if (imageFile && !imageUrl.startsWith('http')) {
        // Convert to base64 for sending
        const reader = new FileReader();
        finalImageUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      const { data, error } = await supabase.functions.invoke('broadcast-message', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          message,
          includeButton,
          buttonText,
          targetGroup,
          imageUrl: finalImageUrl || undefined
        }
      });

      if (error) throw error;

      setLastResult({
        total: data.total_users,
        sent: data.sent,
        failed: data.failed
      });

      toast.success(`${data.sent} ta foydalanuvchiga xabar yuborildi`);
      setMessage('');
      removeImage();
    } catch (error: any) {
      const status = error?.context?.status;
      console.error('Broadcast error:', error);

      if (status === 401) {
        toast.error("Login talab qilinadi (401). Qayta login qiling.");
      } else if (status === 403) {
        toast.error("Admin ruxsati kerak (403).");
      } else {
        toast.error(error?.message || `Xatolik yuz berdi${status ? ` (${status})` : ''}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const targetGroups = [
    { value: 'all', label: 'Barcha foydalanuvchilar', icon: Users, description: 'Telegram ulagan barcha foydalanuvchilar' },
    { value: 'active', label: 'Faol foydalanuvchilar', icon: UserCheck, description: "Oxirgi 7 kunda faol bo'lganlar" },
    { value: 'inactive', label: 'Nofaol foydalanuvchilar', icon: UserX, description: "7 kundan ko'p vaqt nofaol" },
    { value: 'streak', label: 'Streak borlar', icon: Flame, description: 'Hozirda streak bor foydalanuvchilar' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Ommaviy xabar yuborish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Group Selection */}
          <div className="space-y-3">
            <Label>Qabul qiluvchilar</Label>
            <RadioGroup value={targetGroup} onValueChange={setTargetGroup} className="grid grid-cols-2 gap-3">
              {targetGroups.map((group) => (
                <label
                  key={group.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    targetGroup === group.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={group.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <group.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{group.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <Label>Rasm (ixtiyoriy)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!imageUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full h-24 border-dashed"
              >
                {isUploadingImage ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Image className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Rasm yuklash (max 10MB)</span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="relative">
                <img 
                  src={imageUrl} 
                  alt="Broadcast image" 
                  className="w-full max-h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Xabar matni</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8 gap-1"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Yashirish' : 'Ko\'rish'}
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="HTML formatida xabar yozing...&#10;&#10;Masalan:&#10;<b>Yangilik!</b>&#10;Yangi funksiyalar qo'shildi 🎉"
              rows={6}
              className="font-mono text-sm"
            />
            
            {/* HTML Tags Helper */}
            <div className="flex flex-wrap gap-1">
              {ALLOWED_TAGS.slice(0, 8).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-primary/10"
                  onClick={() => setMessage(prev => `${prev}<${tag}></${tag}>`)}
                >
                  &lt;{tag}&gt;
                </Badge>
              ))}
            </div>

            {/* Validation Status */}
            {message.trim() && (
              <div className="space-y-1">
                {validation.isValid ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    HTML to'g'ri
                  </div>
                ) : (
                  validation.errors.map((error, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  ))
                )}
                {validation.warnings.map((warning, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && message.trim() && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Xabar ko'rinishi:</Label>
              <div className="p-4 rounded-lg bg-muted/50 border">
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-full max-h-40 object-cover rounded-lg mb-3"
                  />
                )}
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml(message) }}
                />
                {includeButton && (
                  <div className="mt-3 pt-3 border-t">
                    <Button variant="outline" size="sm" className="pointer-events-none">
                      {buttonText}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Button Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-button">Tugma qo'shish</Label>
              <Switch
                id="include-button"
                checked={includeButton}
                onCheckedChange={setIncludeButton}
              />
            </div>
            
            {includeButton && (
              <div className="space-y-2">
                <Label>Tugma matni</Label>
                <Input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="📚 Ilovani ochish"
                />
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend} 
            disabled={isSending || !message.trim() || !validation.isValid}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Xabar yuborish
              </>
            )}
          </Button>

          {/* Result */}
          {lastResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <p className="text-sm font-medium">Natija:</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{lastResult.total}</p>
                  <p className="text-xs text-muted-foreground">Jami</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{lastResult.sent}</p>
                  <p className="text-xs text-muted-foreground">Yuborildi</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{lastResult.failed}</p>
                  <p className="text-xs text-muted-foreground">Muvaffaqiyatsiz</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastMessage;
