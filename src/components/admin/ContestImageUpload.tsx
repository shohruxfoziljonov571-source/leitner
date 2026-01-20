import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContestImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const ContestImageUpload: React.FC<ContestImageUploadProps> = ({ value, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllari qabul qilinadi');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fayl hajmi 5MB dan oshmasligi kerak');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `contests/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('contest-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contest-images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast.success('Rasm yuklandi!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Rasm yuklashda xatolik');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extract file path from URL
      const urlParts = value.split('/contest-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('contest-images')
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Failed to delete old image:', error);
    }

    onChange('');
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Contest banner"
            className="w-full h-40 object-cover rounded-lg border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              O'zgartirish
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            w-full h-40 border-2 border-dashed rounded-lg 
            flex flex-col items-center justify-center gap-2
            cursor-pointer transition-colors
            ${isUploading ? 'bg-muted cursor-wait' : 'hover:border-primary hover:bg-muted/50'}
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Rasm yuklash uchun bosing</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF (max 5MB)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ContestImageUpload;
