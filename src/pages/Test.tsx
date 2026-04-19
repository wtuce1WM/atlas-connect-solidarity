import { useEffect } from "react";
import Header from "@/components/Header";

const Test = () => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Test";
    return () => {
      meta.remove();
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 px-4">
        <h1 className="text-2xl font-bold text-foreground">Test</h1>
      </main>
    </div>
  );
};

export default Test;
