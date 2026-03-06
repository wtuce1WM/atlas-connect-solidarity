import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const ImageLightbox = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onPrevious,
  onNext,
}: ImageLightboxProps) => {
  if (!images.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none translate-x-0 translate-y-0 top-0 left-0 p-0 bg-black border-none rounded-none z-[300] [&>button]:hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative flex items-center justify-center w-full h-full">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white h-12 w-12 rounded-full"
                onClick={onPrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white h-12 w-12 rounded-full"
                onClick={onNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
