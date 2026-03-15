import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, Plus, Search, User, Tags, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "~/hooks/use-customers";
import { useListSearch } from "~/hooks/use-list-search";
import { useSetLayout } from "~/components/layout/app-layout";
import { BulkCustomerTagsModal, useBulkCustomerTagsModal } from "~/components/customers/bulk-tag-assignment-drawer";

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const navigate = useNavigate();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const bulkTagsModal = useBulkCustomerTagsModal();

  // Use centralized search hook
  const { filteredItems, search, setSearch } = useListSearch({
    items: customers,
    searchFields: [
      (customer) => customer.name,
      (customer) => customer.dni ?? undefined,
      (customer) => customer.phone ?? undefined,
    ],
  });

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCustomerIds.size === filteredItems?.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(filteredItems?.map((c) => c.id) ?? []));
    }
  };

  useSetLayout({ title: "Clientes" });

  return (
    <>
      <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
        />
      </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        ) : filteredItems?.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">No hay clientes</p>
            <Button onClick={() => navigate("/clientes/nuevo")}>Crear primer cliente</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select all row */}
            {filteredItems && filteredItems.length > 0 && (
              <div className="flex items-center justify-between rounded-[20px] border border-stone-200/80 bg-white/50 p-3 px-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                      selectedCustomerIds.size === filteredItems.length
                        ? "border-orange-500 bg-orange-500"
                        : "border-stone-300 hover:border-orange-400"
                    }`}
                  >
                    {selectedCustomerIds.size === filteredItems.length && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </button>
                  <span>
                    {selectedCustomerIds.size > 0
                      ? `${selectedCustomerIds.size} seleccionado(s)`
                      : "Seleccionar todos"}
                  </span>
                </label>
                {selectedCustomerIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkTagsModal.open({ customerIds: Array.from(selectedCustomerIds) })}
                    className="gap-1.5 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    <Tags className="h-4 w-4" />
                    Asignar tags
                  </Button>
                )}
              </div>
            )}
            {filteredItems?.map((customer) => (
              <div
                key={customer.id}
                className="group relative flex items-center gap-3 rounded-[24px] border border-stone-200/80 bg-white/80 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-stone-300/90"
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleCustomerSelection(customer.id)}
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    selectedCustomerIds.has(customer.id)
                      ? "border-orange-500 bg-orange-500"
                      : "border-stone-300 hover:border-orange-400"
                  }`}
                >
                  {selectedCustomerIds.has(customer.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>

                {/* Content */}
                <Link
                  to={`/clientes/${customer.id}`}
                  className="flex flex-1 items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.05rem] font-semibold text-foreground sm:text-lg">
                      {customer.name}
                    </p>
                    {customer.dni && (
                      <p className="mt-1 text-sm text-muted-foreground">DNI: {customer.dni}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pl-2">
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground ring-1 ring-stone-200/90">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-28 right-4 z-50 flex gap-3">
        {selectedCustomerIds.size > 0 && (
          <Button
            size="icon"
            variant="outline"
            className="h-14 w-14 rounded-full border-orange-200 bg-white text-orange-500 shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-50"
            onClick={() => bulkTagsModal.open({ customerIds: Array.from(selectedCustomerIds) })}
          >
            <Tags className="h-6 w-6" />
          </Button>
        )}
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={() => navigate("/clientes/nuevo")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <BulkCustomerTagsModal />
    </>
  );
}
