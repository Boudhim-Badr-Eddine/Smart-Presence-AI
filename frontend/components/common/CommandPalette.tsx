"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import axios from "axios";
import { getApiBase } from "@/lib/config";

type SearchResult = {
  id: string;
  type: "student" | "trainer" | "session" | "class";
  title: string;
  subtitle?: string;
  href: string;
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }

      try {
        const apiBase = getApiBase();
        const res = await axios.get(`${apiBase}/api/search`, { params: { q } });
        setResults(res.data.results);
        setSelectedIndex(0);
      } catch (e) {
        console.error("Search error:", e);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-20">
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-zinc-950 shadow-lg overflow-hidden">
        <div className="relative flex items-center border-b border-white/10 px-3 py-2">
          <Search className="h-4 w-4 text-zinc-500 mr-2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher étudiants, formateurs, sessions..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
          <span className="text-xs text-zinc-500 ml-2">ESC pour fermer</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-400">
              Aucun résultat pour "{query}"
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-500">
              Tapez pour chercher...
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={`w-full px-3 py-2 text-left text-sm transition ${
                  index === selectedIndex
                    ? "bg-amber-600/20 text-amber-300"
                    : "text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <div className="font-medium">{result.title}</div>
                {result.subtitle && (
                  <div className="text-xs text-zinc-500">{result.subtitle}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
