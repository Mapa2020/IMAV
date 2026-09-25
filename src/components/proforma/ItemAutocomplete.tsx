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
      "",
    );
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative flex-1 min-w-0 ${className || ""}`}>
      <div className="relative flex items-center">
        <Input
          value={value}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          title={value}
          className="w-full pr-10 text-sm sm:text-base font-medium cursor-pointer select-none h-10"
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
        <div className="absolute z-50 mt-1 w-full min-w-[320px] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl max-h-80 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border bg-surface/90 sticky top-0 z-10 backdrop-blur-sm">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por descripción o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm h-9 text-foreground bg-slate-950 placeholder:text-muted-foreground/80 border-amber-500/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-slate-950 focus-visible:text-foreground"
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-72">
            {isLoading ? (
              <p className="p-3 text-sm text-center text-muted-foreground animate-pulse">
                Buscando ítems...
              </p>
            ) : suggestions.length === 0 ? (
              <p className="p-3 text-sm text-center text-muted-foreground">
                No se encontraron ítems
              </p>
            ) : (
              <ul className="p-1 space-y-0.5">
                {suggestions.map((item) => (
                  <li key={item.id_item}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/60 flex items-center justify-between transition-colors group cursor-pointer"
                    >
                      <div className="text-left flex-1 min-w-0 pr-3">
                        <p className="font-semibold text-foreground text-sm sm:text-base leading-snug whitespace-normal break-words group-hover:text-primary transition-colors">
                          {item.descripcion}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground font-mono">
                            Código: {item.codigo}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-semibold font-mono text-primary text-sm sm:text-base">
                          Bs {Number(item.precio || 0).toFixed(2)}
                        </p>
                        <span className="inline-block rounded-sm bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5 border border-border/50">
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
