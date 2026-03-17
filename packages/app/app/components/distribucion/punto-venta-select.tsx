import { useState } from "react";
import { MapPin, X, ChevronDown, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { usePuntosVentaActivos, type PuntoVenta } from "~/hooks/use-puntos-venta";
import { PuntoVentaForm } from "~/components/puntos-venta/punto-venta-form";
import { cn } from "~/lib/utils";

interface PuntoVentaSelectProps {
  value: string | null;
  selectedPuntoVenta?: PuntoVenta | null;
  onChange: (puntoVenta: PuntoVenta | null) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
}

const TYPE_LABELS: Record<string, string> = {
  carro: "Carro",
  local: "Local",
  mercado: "Mercado",
  ruta: "Ruta",
  otro: "Otro",
};

export function PuntoVentaSelect({
  value,
  selectedPuntoVenta: propSelectedPuntoVenta,
  onChange,
  disabled = false,
  placeholder = "Seleccionar punto de venta",
  required = false,
  helperText,
}: PuntoVentaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const { data: puntosVenta = [], isLoading } = usePuntosVentaActivos();

  const selectedPuntoVenta =
    propSelectedPuntoVenta || puntosVenta.find((pv) => pv.id === value);

  const handleSelectPuntoVenta = (puntoVenta: PuntoVenta) => {
    onChange(puntoVenta);
    setIsOpen(false);
    setSearchQuery("");
    setIsCreateMode(false);
  };

  const handleClearPuntoVenta = () => {
    onChange(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsCreateMode(false);
    setSearchQuery("");
  };

  const handleCreateSuccess = (newPuntoVenta: PuntoVenta) => {
    onChange(newPuntoVenta);
    handleClose();
  };

  const filteredPuntosVenta = puntosVenta.filter((pv) =>
    pv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pv.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card
        className={cn(
          "shell-card cursor-pointer rounded-3xl border-0 transition-colors",
          !disabled && "hover:bg-white/90",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shell-card-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100/80">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {selectedPuntoVenta?.name || placeholder}
                </p>
                {selectedPuntoVenta && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedPuntoVenta.code && `${selectedPuntoVenta.code} • `}
                    {TYPE_LABELS[selectedPuntoVenta.type || "otro"]}
                  </p>
                )}
                {!selectedPuntoVenta && required && (
                  <p className="text-sm text-orange-600">
                    {helperText || "Seleccione un punto de venta"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedPuntoVenta && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearPuntoVenta();
                  }}
                  className="rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(
                  "rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-foreground",
                  isOpen && "bg-orange-100 text-orange-700",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={isOpen} onOpenChange={handleClose} size="large">
        {isCreateMode ? (
          <AppDrawer.Header
            title="Nuevo Punto de Venta"
            icon={<MapPin className="h-5 w-5" />}
            onClose={handleClose}
          />
        ) : (
          <AppDrawer.Header
            title="Seleccionar punto de venta"
            icon={<MapPin className="h-5 w-5" />}
            onClose={handleClose}
          />
        )}

        <AppDrawer.Body className="space-y-3">
          {isCreateMode ? (
            <PuntoVentaForm 
              onClose={() => setIsCreateMode(false)} 
              onSuccess={handleCreateSuccess}
            />
          ) : (
            <>
              <Input
                placeholder="Buscar punto de venta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl"
              />

              <button
                type="button"
                onClick={() => setIsCreateMode(true)}
                className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-orange-300 p-3 text-left transition-colors hover:bg-orange-50"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80">
                  <Plus className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-orange-700">
                    Crear nuevo punto de venta
                  </p>
                  <p className="text-sm text-orange-600/70">
                    Agrega un nuevo punto de venta
                  </p>
                </div>
              </button>

              <div className="space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Cargando puntos de venta...
                  </p>
                ) : filteredPuntosVenta.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No se encontraron puntos de venta
                  </p>
                ) : (
                  filteredPuntosVenta.map((puntoVenta) => (
                    <button
                      key={puntoVenta.id}
                      type="button"
                      onClick={() => handleSelectPuntoVenta(puntoVenta)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                        value === puntoVenta.id
                          ? "shell-card-muted border-orange-300 bg-orange-50/90"
                          : "border-white/70 bg-white/60 hover:bg-white/82",
                      )}
                    >
                      <div className="shell-card-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80">
                        <MapPin className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {puntoVenta.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {puntoVenta.code && `${puntoVenta.code} • `}
                          {TYPE_LABELS[puntoVenta.type || "otro"]}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </AppDrawer.Body>
      </AppDrawer>
    </>
  );
}

export type { PuntoVentaSelectProps };
