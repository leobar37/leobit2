import { Link } from "react-router";
import { Search, Plus, Building2, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "~/hooks/use-suppliers";
import { useSetLayout } from "~/components/layout/app-layout";

function SupplierCard({ supplier }: { supplier: {
  id: string;
  name: string;
  type: "generic" | "regular" | "internal";
  phone: string | null;
  isActive: boolean;
} }) {
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
    <Card className="border-0 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            {supplier.type === "generic" ? (
              <Building2 className="h-6 w-6 text-orange-600" />
            ) : (
              <User className="h-6 w-6 text-orange-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold truncate">{supplier.name}</h3>
              <Badge variant="secondary" className={typeColors[supplier.type]}>
                {typeLabels[supplier.type]}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {supplier.phone || "Sin teléfono"}
              </span>
              {!supplier.isActive && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
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

  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading, error } = useSuppliers();

  const filteredSuppliers = suppliers?.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.ruc?.includes(search) ||
      supplier.phone?.includes(search)
  );

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando proveedores...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar proveedores</p>
          </div>
        )}

        {filteredSuppliers?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron proveedores</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredSuppliers?.map((supplier) => (
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
        className="fixed bottom-20 right-4 z-50"
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
