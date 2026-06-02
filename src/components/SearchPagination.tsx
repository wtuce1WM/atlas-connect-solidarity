import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  language?: string;
  className?: string;
}

export default function SearchPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  language = "fr",
  className = "",
}: SearchPaginationProps) {
  if (totalPages <= 1) return null;
  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startResult = (currentPage - 1) * pageSize + 1;
  const endResult = Math.min(startResult + pageSize - 1, totalCount);

  const showing = language === "en" ? "Showing" : language === "ar" ? "عرض" : "Affichage de";
  const to = language === "en" ? "to" : language === "ar" ? "إلى" : "à";
  const onWord = language === "en" ? "of" : language === "ar" ? "من" : "sur";
  const results = language === "en" ? "results" : language === "ar" ? "نتائج" : "résultats";
  const previous = language === "en" ? "Previous" : language === "ar" ? "السابق" : "Précédent";
  const next = language === "en" ? "Next" : language === "ar" ? "التالي" : "Suivant";

  return (
    <div className={`mb-20 flex flex-col items-center gap-1 ${className}`}>
      <p className="text-sm text-muted-foreground">
        {showing} {startResult} {to} {endResult} {onWord} {totalCount} {results}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {previous}
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className="w-10"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="gap-1"
        >
          {next}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
