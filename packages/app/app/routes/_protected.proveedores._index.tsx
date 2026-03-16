import { Link } from "react-router";
import { Search, Plus, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "~/hooks/use-suppliers";
import { useListSearch } from "~/hooks/use-list-search";
import { useSetLayout } from "~/components/layout/app-layout";

interface Supplier {
  id: string;
  name: string;
  type: "generic" | "regular" | "internal";
  phone: string | null;
  isActive: boolean;
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const typeLabels = {
    generic: "Genérico",
    regular: "Regular",
    internal: "Interno",
  };

  const typeColors = {
    generic: "bg-gray-100 text-gray-700",
    regular: "bg-blue-100 text-blue-700",
    internal: "bg-purple-100 text-purple-700",
  };

  return (
    <Card className="shell-card-flat w-full rounded-[24px] transition-colors hover:border-stone-300/90 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-orange-100/90 ring-1 ring-orange-100">
            {supplier.type === "generic" ? (
              <Building2 className="h-6 w-6 text-orange-600" />
            ) : (
              <User className="h-6 w-6 text-orange-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[1.05rem] font-semibold leading-tight text-foreground sm:text-lg">
                {supplier.name}
              </h3>
              <Badge
                variant="outline"
                className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold leading-none ${typeColors[supplier.type]}`}
              >
                {typeLabels[supplier.type]}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {supplier.phone || "Sin teléfono"}
              </span>
              {!supplier.isActive && (
                <Badge
                  variant="outline"
                  className="rounded-full border-0 bg-red-100 px-2.5 py-1 text-[11px] font-semibold leading-none text-red-700"
                >
                  Inactivo
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProveedoresPage() {
  useSetLayout({ title: "Proveedores" });

  const { data: suppliers, isLoading } = useSuppliers();

  const { filteredItems, search, setSearch } = useListSearch({
    items: suppliers,
    searchFields: [
      (supplier) => supplier.name,
      (supplier) => supplier.phone ?? undefined,
    ],
  });

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando proveedores...</p>
          </div>
        )}

        {filteredItems?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {search ? "No se encontraron proveedores" : "No hay proveedores registrados"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filteredItems?.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/proveedores/${supplier.id}`}
              className="block"
            >
              <SupplierCard supplier={supplier} />
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/proveedores/nuevo"
        className="fixed bottom-28 right-4 z-50"
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
