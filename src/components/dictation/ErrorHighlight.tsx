import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ErrorDetail {
  wrong: string;
  correct: string;
  position: number;
  type: 'missing' | 'extra' | 'spelling' | 'punctuation';
}

interface ErrorHighlightProps {
  originalText: string;
  submittedText: string;
  errors: ErrorDetail[];
}

const ErrorHighlight: React.FC<ErrorHighlightProps> = ({ originalText, submittedText, errors }) => {
  // Simple word-by-word comparison highlighting
  const originalWords = originalText.split(/\s+/);
  const submittedWords = submittedText.split(/\s+/);
  
  const getErrorForWord = (word: string, index: number) => {
    return errors.find(e => 
      e.wrong.toLowerCase() === word.toLowerCase() || 
      e.position === index
    );
  };

  return (
    <div className="space-y-4">
      {/* User's text with highlighted errors */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">Sizning javobingiz:</p>
        <div className="p-4 rounded-lg border bg-muted/30 leading-relaxed">
          {submittedWords.map((word, index) => {
            const error = getErrorForWord(word, index);
            const isError = !!error;
            
            return (
              <span key={index}>
                <span
                  className={cn(
                    "px-0.5 rounded",
                    isError && "bg-red-500/20 text-red-600 dark:text-red-400 underline decoration-wavy decoration-red-500"
                  )}
                  title={error ? `To'g'risi: ${error.correct}` : undefined}
                >
                  {word}
                </span>
                {index < submittedWords.length - 1 && ' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Original correct text */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">To'g'ri matn:</p>
        <div className="p-4 rounded-lg border bg-green-500/5 leading-relaxed text-green-700 dark:text-green-400">
          {originalText}
        </div>
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Xatolar ro'yxati:</p>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <Badge 
                  variant="outline" 
                  className={cn(
                    "shrink-0",
                    error.type === 'spelling' && "border-red-500 text-red-500",
                    error.type === 'missing' && "border-yellow-500 text-yellow-500",
                    error.type === 'extra' && "border-orange-500 text-orange-500",
                    error.type === 'punctuation' && "border-blue-500 text-blue-500"
                  )}
                >
                  {error.type === 'spelling' && 'Imlo'}
                  {error.type === 'missing' && 'Tushib qolgan'}
                  {error.type === 'extra' && 'Ortiqcha'}
                  {error.type === 'punctuation' && 'Tinish belgisi'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-red-500">{error.wrong || '—'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{error.correct}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorHighlight;
