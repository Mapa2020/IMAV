import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/hooks/useAuth";
import { ChevronDown } from "lucide-react";

interface ItemAutocompleteProps {
  value: string;
  onChange: (
    description: string,
    code: string,
    price: number,
    kind: "labor" | "part",
    detalle?: string,
  ) => void;
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
  detalle?: string | null;
}

export function ItemAutocomplete({
  value,
  onChange,
  placeholder = "Seleccione un trabajo o repuesto...",
  token,
  className,
}: ItemAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus the search input inside the dropdown when it opens
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  // Fetch items from backend based on the search query inside the dropdown
  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const url = `${API_URL}/items?query=${encodeURIComponent(searchTerm)}`;
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching autocomplete items:", err);
      } finally {
        setIsLoading(false);
      }
    }, 100);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, isOpen, token]);

  // Handle click outside to close list
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SuggestedItem) => {
    const kind: "labor" | "part" =
      item.tipo_item === "SERVICIO" ? "labor" : "part";
    onChange(
      item.descripcion,
      item.codigo,
      Number(item.precio),
      kind,
      item.detalle || "",
    );
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className || ""}`}>
      <div className="relative flex items-center">
        <Input
          value={value}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          className="w-full pr-10 text-xs sm:text-sm cursor-pointer select-none bg-transparent hover:bg-slate-50/10 transition-colors"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-muted-foreground hover:text-foreground border-l border-border/30"
          title="Ver lista de opciones"
        >
          <ChevronDown
            className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-72 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por descripción o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs h-8 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-300"
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-60">
            {isLoading ? (
              <p className="p-3 text-xs text-center text-slate-500 animate-pulse">
                Buscando ítems...
              </p>
            ) : suggestions.length === 0 ? (
              <p className="p-3 text-xs text-center text-slate-500">
                No se encontraron ítems
              </p>
            ) : (
              <ul className="p-1">
                {suggestions.map((item) => (
                  <li key={item.id_item}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-100 flex items-center justify-between"
                    >
                      <div className="text-left flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.descripcion}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Código: {item.codigo}
                          </span>
                          {item.detalle && (
                            <span className="text-[9px] bg-sky-50 text-sky-700 px-1 rounded border border-sky-200">
                              Tiene detalle
                            </span>
                          )}
                        </div>
                        {item.detalle && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">
                            ↳ {item.detalle}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-medium font-mono text-amber-600">
                          Bs {Number(item.precio || 0).toFixed(2)}
                        </p>
                        <span className="inline-block rounded-sm bg-slate-100 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-600 font-bold">
                          {item.tipo_item === "SERVICIO"
                            ? "Servicio"
                            : "Repuesto"}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
