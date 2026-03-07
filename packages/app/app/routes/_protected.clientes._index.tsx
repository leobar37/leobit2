import { Link, useNavigate } from "react-router";
import { Search, Plus, Tag, X, CheckSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncStatus } from "~/components/sync/sync-status";
import { useCustomers } from "~/hooks/use-customers";
import { CustomerCard } from "~/components/customers/customer-card";
import { BulkTagAssignmentDrawer } from "~/components/customers/bulk-tag-assignment-drawer";
import { useSetLayout } from "~/components/layout/app-layout";
import { TagFilter } from "~/components/tags/tag-filter";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const { data: customers, isLoading, error } = useCustomers({ 
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined 
  });
  const navigate = useNavigate();

  // Filter customers by search (local filter for better UX)
  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.dni?.includes(search)
  );

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedCustomers(new Set());
  };

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Select all visible customers
  const selectAll = () => {
    if (filteredCustomers) {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedCustomers(new Set());
  };

  // Handle bulk assignment success
  const handleBulkSuccess = () => {
    setSelectedCustomers(new Set());
    setSelectionMode(false);
  };

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant={selectionMode ? "default" : "ghost"}
        size="sm"
        onClick={toggleSelectionMode}
        className={selectionMode ? "bg-orange-500 hover:bg-orange-600" : ""}
      >
        <CheckSquare className="h-4 w-4 mr-1" />
        {selectionMode ? "Cancelar" : "Seleccionar"}
      </Button>
      <SyncStatus />
    </div>
  );

  useSetLayout({ title: "Clientes", actions: headerActions });

  return (
    <>
      <div className="space-y-4">
        {/* Selection mode indicator */}
        {selectionMode && (
          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-orange-700">
                {selectedCustomers.size} seleccionado(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
              >
                Limpiar
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {!selectionMode && (
          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        )}

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar clientes</p>
          </div>
        )}

        {filteredCustomers?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron clientes</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredCustomers?.map((customer) => (
            selectionMode ? (
              <CustomerCard
                key={customer.id}
                customer={customer}
                selectable
                selected={selectedCustomers.has(customer.id)}
                onSelect={() => toggleCustomerSelection(customer.id)}
              />
            ) : (
              <Link
                key={customer.id}
                to={`/clientes/${customer.id}`}
                className="block"
              >
                <CustomerCard customer={customer} />
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Bulk Actions FAB - shown when in selection mode with selections */}
      {selectionMode && selectedCustomers.size > 0 && (
        <div className="fixed left-4 bottom-28 z-50 flex items-center gap-2">
          <Button
            onClick={() => setIsBulkModalOpen(true)}
            className="h-14 px-6 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg"
          >
            <Tag className="h-5 w-5 mr-2" />
            Asignar etiquetas
          </Button>
        </div>
      )}

      {/* New Customer FAB - shown when not in selection mode */}
      {!selectionMode && (
        <Link
          to="/clientes/nuevo"
          className="fixed right-4 bottom-28 z-50"
        >
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      )}

      {/* Bulk Tag Assignment Drawer */}
      <BulkTagAssignmentDrawer
        customerIds={Array.from(selectedCustomers)}
        open={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleBulkSuccess}
      />
    </>
  );
}
