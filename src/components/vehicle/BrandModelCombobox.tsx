import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/hooks/useAuth";
import { ChevronDown, Check, Car, Layers, Sparkles } from "lucide-react";

interface BrandItem {
  id_marca: number;
  nombre: string;
  total_modelos?: number;
}

interface ModelItem {
  id_modelo: number;
  id_marca: number;
  nombre: string;
}

interface BrandModelComboboxProps {
  brand: string;
  model: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  token?: string | null;
  className?: string;
}

export function BrandModelCombobox({
  brand,
  model,
  onBrandChange,
  onModelChange,
  disabled = false,
  token,
  className = "",
}: BrandModelComboboxProps) {
  // Brand state
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const brandContainerRef = useRef<HTMLDivElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);

  // Model state
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const modelContainerRef = useRef<HTMLDivElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // Fetch all brands on mount or token change
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/brands`, { headers });
        if (res.ok) {
          const data = await res.json();
          setBrands(data);
        }
      } catch (err) {
        console.error("Error al cargar marcas de vehículos:", err);
      }
    };
    fetchBrands();
  }, [token]);

  // Fetch models whenever the selected brand changes
  useEffect(() => {
    if (!brand || !brand.trim()) {
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(
          `${API_URL}/brands/by-name/${encodeURIComponent(brand.trim())}/models`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          setModels(data);
        } else {
          setModels([]);
        }
      } catch (err) {
        console.error("Error al cargar modelos de la marca:", err);
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [brand, token]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        brandContainerRef.current &&
        !brandContainerRef.current.contains(e.target as Node)
      ) {
        setIsBrandOpen(false);
      }
      if (
        modelContainerRef.current &&
        !modelContainerRef.current.contains(e.target as Node)
      ) {
        setIsModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered brands
  const filteredBrands = brands.filter((b) =>
    b.nombre.toLowerCase().includes((brandSearch || brand || "").toLowerCase())
  );

  // Filtered models
  const filteredModels = models.filter((m) =>
    m.nombre.toLowerCase().includes((modelSearch || model || "").toLowerCase())
  );

  const handleSelectBrand = (selectedBrandName: string) => {
    onBrandChange(selectedBrandName);
    setIsBrandOpen(false);
    setBrandSearch("");
    // Clear model if it doesn't belong to the newly selected brand
    onModelChange("");
    // Open model combobox automatically for quick selection
    setTimeout(() => {
      if (!disabled) {
        setIsModelOpen(true);
      }
    }, 100);
  };

  const handleSelectModel = (selectedModelName: string) => {
    onModelChange(selectedModelName);
    setIsModelOpen(false);
    setModelSearch("");
  };

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {/* --- COMBOBOX MARCA --- */}
      <div ref={brandContainerRef} className="relative space-y-2">
        <Label className="label-caps flex items-center justify-between text-xs font-bold">
          <span>Marca</span>
          {brands.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-normal">
              {brands.length} marcas disponibles
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            ref={brandInputRef}
            value={brand}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;
              onBrandChange(val);
              setBrandSearch(val);
              if (!isBrandOpen) setIsBrandOpen(true);
            }}
            onFocus={() => {
              if (!disabled) {
                setBrandSearch(brand);
                setIsBrandOpen(true);
              }
            }}
            placeholder="Seleccione o escriba Marca (ej. Toyota)"
            className="pr-8 mt-1 h-10 text-sm sm:text-base font-medium"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsBrandOpen((prev) => !prev);
                if (!isBrandOpen) {
                  setBrandSearch(brand);
                  brandInputRef.current?.focus();
                }
              }
            }}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${
                isBrandOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Dropdown list for Brands */}
        {isBrandOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
            <div className="max-h-60 overflow-y-auto p-1 text-sm">
              {filteredBrands.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (brand && brand.trim()) handleSelectBrand(brand.trim());
                    else setIsBrandOpen(false);
                  }}
                  className="p-3 text-left w-full rounded-md hover:bg-accent transition-colors"
                >
                  <div className="text-xs text-muted-foreground">
                    No existe &ldquo;{brand}&rdquo; en el catálogo.
                  </div>
                  {brand && brand.trim() && (
                    <div className="mt-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> Registrar y usar &ldquo;{brand.trim()}&rdquo; como nueva marca
                    </div>
                  )}
                </button>
              ) : (
                filteredBrands.map((b) => {
                  const isSelected =
                    brand.toLowerCase() === b.nombre.toLowerCase();
                  return (
                    <button
                      key={b.id_marca}
                      type="button"
                      onClick={() => handleSelectBrand(b.nombre)}
                      className={`flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isSelected
                          ? "bg-primary/10 font-semibold text-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Car className="size-4 text-muted-foreground" />
                        <span className="font-medium">{b.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.total_modelos !== undefined && b.total_modelos > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {b.total_modelos} mod.
                          </span>
                        )}
                        {isSelected && <Check className="size-4 text-primary" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- COMBOBOX MODELO --- */}
      <div ref={modelContainerRef} className="relative space-y-2">
        <Label className="label-caps flex items-center justify-between text-xs font-bold">
          <span>Modelo</span>
          {models.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-normal">
              {models.length} modelos de {brand}
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            ref={modelInputRef}
            value={model}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;
              onModelChange(val);
              setModelSearch(val);
              if (!isModelOpen) setIsModelOpen(true);
            }}
            onFocus={() => {
              if (!disabled) {
                setModelSearch(model);
                setIsModelOpen(true);
              }
            }}
            placeholder={
              brand
                ? `Modelo de ${brand} (ej. Hilux)`
                : "Seleccione una marca primero..."
            }
            className="pr-8 mt-1 h-10 text-sm sm:text-base font-medium"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsModelOpen((prev) => !prev);
                if (!isModelOpen) {
                  setModelSearch(model);
                  modelInputRef.current?.focus();
                }
              }
            }}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <ChevronDown
              className={`size-4 transition-transform duration-200 ${
                isModelOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Dropdown list for Models */}
        {isModelOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
            <div className="max-h-60 overflow-y-auto p-1 text-sm">
              {isLoadingModels ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  Cargando modelos de {brand}...
                </div>
              ) : filteredModels.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (model && model.trim()) handleSelectModel(model.trim());
                    else setIsModelOpen(false);
                  }}
                  className="p-3 text-left w-full rounded-md hover:bg-accent transition-colors"
                >
                  {brand ? (
                    <>
                      <div className="text-xs text-muted-foreground">
                        No existe &ldquo;{model || "este modelo"}&rdquo; en los modelos de {brand}.
                      </div>
                      {model && model.trim() && (
                        <div className="mt-1 text-xs font-semibold text-primary flex items-center gap-1.5">
                          <Sparkles className="size-3.5" /> Registrar y usar &ldquo;{model.trim()}&rdquo; como nuevo modelo de {brand}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Elija primero la marca en el campo de la izquierda.
                    </div>
                  )}
                </button>
              ) : (
                filteredModels.map((m) => {
                  const isSelected =
                    model.toLowerCase() === m.nombre.toLowerCase();
                  return (
                    <button
                      key={m.id_modelo}
                      type="button"
                      onClick={() => handleSelectModel(m.nombre)}
                      className={`flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isSelected
                          ? "bg-primary/10 font-semibold text-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="size-4 text-muted-foreground" />
                        <span className="font-medium">{m.nombre}</span>
                      </div>
                      {isSelected && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
