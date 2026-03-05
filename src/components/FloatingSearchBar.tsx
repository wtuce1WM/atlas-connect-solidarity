import SearchInput from "@/components/SearchInput";

const FloatingSearchBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[120] bg-black/90 backdrop-blur-md border-t border-gold/20 py-3 px-4">
      <div className="max-w-2xl mx-auto">
        <SearchInput variant="floating" showSuggestions={true} suggestionsPosition="top" />
      </div>
    </div>
  );
};

export default FloatingSearchBar;
