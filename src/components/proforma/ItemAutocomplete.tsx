import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/hooks/useAuth";
import { ChevronDown } from "lucide-react";

interface ItemAutocompleteProps {
  value: string;
  onChange: (description: string, code: string, price: number, kind: "labor" | "part") => void;
  placeholder?: string;
  token: string | null;
  className?: string;
}

interface SuggestedItem {
  id_item: number;
  codigo: string;
  descripcion: string;
  tipo_item: "SERVICIO" | "REPUESTO";
  precio: number;
}

export function ItemAutocomplete({
  value,
  onChange,
  placeholder = "Describa el trabajo o repuesto...",
  token,
  className,
}: ItemAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with value from parent (e.g. if cleared or loaded from save)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fetch items from backend
  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const url = `${API_URL}/items?query=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching autocomplete items:", err);
      }
    }, 100);

    return () => clearTimeout(delayDebounce);
  }, [query, isOpen, token]);

  // Handle click outside to close list
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SuggestedItem) => {
    const kind: "labor" | "part" = item.tipo_item === "SERVICIO" ? "labor" : "part";
    onChange(item.descripcion, item.codigo, Number(item.precio), kind);
    setQuery(item.descripcion);
    setIsOpen(false);
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    setIsOpen(true);
    // Notify parent of simple manual text edit (leaving code/price empty or unchanged)
    onChange(text, "", 0, "labor"); 
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className || ""}`}>
      <div className="relative flex items-center">
        <Input
          value={query}
          onChange={(e) => handleTextChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pr-10 text-xs sm:text-sm"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-muted-foreground hover:text-foreground border-l border-border/30"
          title="Ver lista de opciones"
        >
          <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
          <ul className="p-1">
            {suggestions.map((item) => (
              <li key={item.id_item}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-100 flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{item.descripcion}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Código: {item.codigo}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-medium font-mono text-amber-600">Bs {Number(item.precio || 0).toFixed(2)}</p>
                    <span className="inline-block rounded-sm bg-slate-100 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-600 font-bold">
                      {item.tipo_item === "SERVICIO" ? "Servicio" : "Repuesto"}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
