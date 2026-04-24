import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, User, Tags, Check, Users, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { CustomerTagWithDetails } from "~/hooks/use-customer-tags-with-details";
import { usePaginatedCustomers, useCustomerTagsSummary } from "~/hooks/use-customers";
import { useCustomerGroupsSummary, type CustomerGroupBadgeItem } from "~/hooks/use-customer-groups-with-details";
import { useCustomerFilters } from "~/hooks/use-customer-filters";
import { useSetLayout } from "~/components/layout/app-layout";
import { BulkCustomerTagsModal, useBulkCustomerTagsModal } from "~/components/customers/bulk-tag-assignment-drawer";
import {
  BulkGroupAssignmentDrawer,
  useBulkGroupAssignmentDrawer,
} from "~/components/customers/bulk-group-assignment-drawer";
import { CustomerFilterPopover } from "~/components/customers/customer-filter-popover";
import { CustomerCard } from "~/components/customers/customer-card";
import { QuickTagModal, useQuickTagModal } from "~/components/tags";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const bulkTagsModal = useBulkCustomerTagsModal();
  const bulkGroupsDrawer = useBulkGroupAssignmentDrawer();
  const quickTagModal = useQuickTagModal();

  const {
    tagIds,
    setTagIds,
    groupIds,
    setGroupIds,
    search,
    setSearch,
    isSearching,
    isFiltering,
  } = useCustomerFilters({ loadTagRelations: false });

  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: customersPage, isLoading } = usePaginatedCustomers({
    search: search || undefined,
    tagIds,
    groupIds,
    limit: pageSize,
    offset,
  });

  const customers = customersPage?.items ?? [];
  const totalCustomers = customersPage?.total ?? 0;
  const customerIds = useMemo(() => customers.map((customer) => customer.id), [customers]);
  const { data: customerTags = [] } = useCustomerTagsSummary(customerIds);
  const { data: customerGroups = [] } = useCustomerGroupsSummary(customerIds);

  const tagsByCustomerId = useMemo(() => {
    const map = new Map<string, CustomerTagWithDetails[]>();
    for (const tag of customerTags) {
      const existing = map.get(tag.customerId) ?? [];
      existing.push({
        customerId: tag.customerId,
        tagId: tag.tagId,
        tagName: tag.tagName,
        tagColor: tag.tagColor,
        assignedAt: new Date(),
        assignedBy: null,
        syncStatus: "synced",
        syncAttempts: 0,
      });
      map.set(tag.customerId, existing);
    }
    return map;
  }, [customerTags]);

  const groupsByCustomerId = useMemo(() => {
    const map = new Map<string, CustomerGroupBadgeItem[]>();
    for (const group of customerGroups) {
      const existing = map.get(group.customerId) ?? [];
      existing.push({
        id: group.id,
        name: group.name,
        syncStatus: group.syncStatus,
      });
      map.set(group.customerId, existing);
    }
    return map;
  }, [customerGroups]);

  useEffect(() => {
    setPage(1);
  }, [search, tagIds, groupIds]);

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
    if (selectedCustomerIds.size === customers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(customers.map((c) => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  useSetLayout({ title: "Clientes" });

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-xl border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
            />
          </div>
          <div className="w-full">
            <CustomerFilterPopover
              selectedTagIds={tagIds}
              onTagIdsChange={setTagIds}
              selectedGroupIds={groupIds}
              onGroupIdsChange={setGroupIds}
              onCreateClick={() => quickTagModal.open()}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              {isSearching || isFiltering ? "No hay resultados" : "No hay clientes"}
            </p>
            {!isSearching && !isFiltering && (
              <Button onClick={() => navigate("/clientes/nuevo")}>Crear primer cliente</Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {customers.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-white/50 p-3 px-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                      selectedCustomerIds.size === customers.length
                        ? "border-orange-500 bg-orange-500"
                        : "border-stone-300 hover:border-orange-400"
                    }`}
                  >
                    {selectedCustomerIds.size === customers.length && (
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        Acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-xl border-stone-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur"
                    >
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          bulkGroupsDrawer.open({
                            customerIds: Array.from(selectedCustomerIds),
                            onAssigned: clearSelection,
                          });
                        }}
                        className="gap-2 rounded-lg text-orange-600 focus:bg-orange-50 focus:text-orange-700"
                      >
                        <Users className="h-4 w-4" />
                        Asignar grupos
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          bulkTagsModal.open({ customerIds: Array.from(selectedCustomerIds) });
                        }}
                        className="gap-2 rounded-lg text-orange-600 focus:bg-orange-50 focus:text-orange-700"
                      >
                        <Tags className="h-4 w-4" />
                        Asignar tags
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                compact
                selectable
                selected={selectedCustomerIds.has(customer.id)}
                onSelect={() => toggleCustomerSelection(customer.id)}
                onNavigate={() => navigate(`/clientes/${customer.id}`)}
                showTags
                preloadedTags={tagsByCustomerId.get(customer.id) ?? []}
                preloadedGroups={groupsByCustomerId.get(customer.id) ?? []}
              />
            ))}

            {totalCustomers > pageSize && (
              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={totalCustomers}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-28 right-4 z-50 flex gap-3">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={() => navigate("/clientes/nuevo")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <BulkCustomerTagsModal />
      <BulkGroupAssignmentDrawer />
      <QuickTagModal />
    </>
  );
}
