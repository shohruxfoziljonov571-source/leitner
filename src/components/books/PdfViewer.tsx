import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Loader2, 
  Maximize, 
  Minimize,
  RotateCw,
  Home,
  Minus,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  pdfUrl: string;
  onClose?: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, onClose }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  }, []);

  const goToPrevPage = useCallback(() => {
    setPageNumber(prev => {
      const newPage = Math.max(prev - 1, 1);
      setPageInputValue(String(newPage));
      return newPage;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    if (numPages) {
      setPageNumber(prev => {
        const newPage = Math.min(prev + 1, numPages);
        setPageInputValue(String(newPage));
        return newPage;
      });
    }
  }, [numPages]);

  const goToFirstPage = useCallback(() => {
    setPageNumber(1);
    setPageInputValue('1');
  }, []);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue);
    if (page >= 1 && numPages && page <= numPages) {
      setPageNumber(page);
    } else {
      setPageInputValue(String(pageNumber));
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    }
  };

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.2);
  }, []);

  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'Home') {
        goToFirstPage();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage, goToFirstPage, zoomIn, zoomOut, isFullscreen]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Touch swipe support
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToNextPage();
        } else {
          goToPrevPage();
        }
      }
    };

    content.addEventListener('touchstart', handleTouchStart, { passive: true });
    content.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      content.removeEventListener('touchstart', handleTouchStart);
      content.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goToNextPage, goToPrevPage]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-background",
        isFullscreen ? "fixed inset-0 z-50" : "h-full"
      )}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-2 md:p-3 border-b bg-background/95 backdrop-blur sticky top-0 z-10 gap-2">
        {/* Navigation controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToFirstPage}
            disabled={pageNumber <= 1}
            className="h-8 w-8"
            title="Birinchi sahifa (Home)"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="h-8 w-8"
            title="Oldingi sahifa (←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKeyDown}
              className="w-12 h-8 text-center text-sm px-1"
            />
            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
              / {numPages || '...'}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="h-8 w-8"
            title="Keyingi sahifa (→)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom and other controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="h-8 w-8"
            title="Kichiklashtirish (-)"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="hidden sm:flex items-center w-24 md:w-32">
            <Slider
              value={[scale * 100]}
              onValueChange={(v) => setScale(v[0] / 100)}
              min={50}
              max={300}
              step={10}
              className="cursor-pointer"
            />
          </div>
          
          <span 
            className="text-xs md:text-sm w-12 text-center cursor-pointer hover:text-primary"
            onClick={resetZoom}
            title="Boshlang'ich o'lcham"
          >
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="h-8 w-8"
            title="Kattalashtirish (+)"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="hidden md:flex items-center gap-1 ml-2 border-l pl-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={rotate}
              className="h-8 w-8"
              title="Aylantirish"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
              title="To'liq ekran (F11)"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-auto bg-muted/30"
      >
        <div className="flex justify-center p-4 min-h-full">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">PDF yuklanmoqda...</p>
            </div>
          )}
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => {
              console.error('PDF load error:', error);
              setIsLoading(false);
            }}
            loading={null}
            className="shadow-2xl rounded-lg overflow-hidden"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="flex items-center justify-center h-96 w-full bg-card">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
              className="bg-white"
            />
          </Document>
        </div>
      </div>

      {/* Bottom navigation for mobile */}
      <div className="md:hidden flex items-center justify-between p-3 border-t bg-background/95 backdrop-blur">
        <Button
          variant="outline"
          onClick={goToPrevPage}
          disabled={pageNumber <= 1}
          className="flex-1 mr-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Oldingi
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={rotate}
            className="h-10 w-10"
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-10 w-10"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={goToNextPage}
          disabled={!numPages || pageNumber >= numPages}
          className="flex-1 ml-2"
        >
          Keyingi
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="hidden lg:block absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-2 rounded-lg border">
        ← → sahifa • + - zoom • Space keyingi
      </div>
    </div>
  );
};

export default PdfViewer;
