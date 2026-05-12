import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, User, Tags, Check, Users, MoreHorizontal, ArrowUpDown, ArrowUpAZ, ArrowDownZA, CalendarDays, Banknote, CarFront, Wallet } from "lucide-react";
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
import { useCustomerSort } from "~/hooks/use-customer-sort";
import { useSetLayout } from "~/components/layout/app-layout";
import { MobileShell } from "~/components/mobile";
import { cn, formatCurrency } from "~/lib/utils";
import { BulkCustomerTagsModal, useBulkCustomerTagsModal } from "~/components/customers/bulk-tag-assignment-drawer";
import {
  BulkGroupAssignmentDrawer,
  useBulkGroupAssignmentDrawer,
} from "~/components/customers/bulk-group-assignment-drawer";
import { CustomerFilterPopover } from "~/components/customers/customer-filter-popover";
import { CustomerCard } from "~/components/customers/customer-card";
import { QuickTagModal, useQuickTagModal } from "~/components/tags";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { useCocheraCustomers, useCreateCocheraCustomer } from "~/hooks/use-cochera-customers";

interface SortOption {
  label: string;
  sortBy: "name" | "lastSaleDate" | "debt" | "createdAt";
  sortOrder: "asc" | "desc";
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  { label: "Nombre A-Z", sortBy: "name", sortOrder: "asc", icon: <ArrowUpAZ className="h-4 w-4" /> },
  { label: "Nombre Z-A", sortBy: "name", sortOrder: "desc", icon: <ArrowDownZA className="h-4 w-4" /> },
  { label: "Más reciente", sortBy: "createdAt", sortOrder: "desc", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Más antiguo", sortBy: "createdAt", sortOrder: "asc", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Mayor deuda", sortBy: "debt", sortOrder: "desc", icon: <Banknote className="h-4 w-4" /> },
  { label: "Menor deuda", sortBy: "debt", sortOrder: "asc", icon: <Banknote className="h-4 w-4" /> },
  { label: "Última compra", sortBy: "lastSaleDate", sortOrder: "desc", icon: <CalendarDays className="h-4 w-4" /> },
];

function CocheraCustomersPage() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const { data, isLoading } = useCocheraCustomers({ search });
  const createCustomer = useCreateCocheraCustomer();

  useSetLayout({ title: "Clientes" });

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCustomer.mutateAsync({
      name: name.trim(),
      phone: phone.trim() || null,
      vehicles: plate.trim()
        ? [{ plate: plate.trim(), vehicleType: "auto" }]
        : [],
    });
    setName("");
    setPhone("");
    setPlate("");
    setDrawerOpen(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="shell-card-soft border-l-4 border-orange-500 py-3 pl-4 pr-3">
          <p className="text-sm text-muted-foreground">Clientes de cochera</p>
          <p className="text-3xl font-bold text-foreground">
            {data?.summary.totalCustomers ?? 0}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.summary.totalVehicles ?? 0} vehículos · S/ {formatCurrency(data?.summary.totalDebt ?? "0")} por cobrar
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, teléfono o placa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="shell-search-field pl-10 pr-4"
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando clientes...</div>
        ) : !data?.items.length ? (
          <div className="py-12 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-semibold">Aún no hay clientes de cochera</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea clientes desde aquí o durante el cobro sin salir del flujo.
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((customer) => (
              <div key={customer.id} className="shell-card-flat rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone || "Sin teléfono"}</p>
                  </div>
                  <div className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-semibold text-orange-700 dark:text-orange-200">
                    {customer.vehicleCount} veh.
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {customer.vehicles.slice(0, 4).map((vehicle) => (
                    <span
                      key={vehicle.id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                    >
                      <CarFront className="h-3.5 w-3.5" />
                      {vehicle.plate}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                    <p className="font-semibold">{customer.pendingSessions}</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300">
                    <p className="text-xs opacity-80">Por cobrar</p>
                    <p className="font-semibold">S/ {formatCurrency(customer.activeDebt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          className="h-12 w-12 rounded-xl bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.2)] hover:bg-orange-600"
          onClick={() => setDrawerOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>

      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} size="large">
        <AppDrawer.Header
          title="Nuevo cliente"
          icon={<User className="h-5 w-5" />}
          onClose={() => setDrawerOpen(false)}
        />
        <AppDrawer.Body className="space-y-3">
          <Input placeholder="Nombre completo" value={name} onChange={(event) => setName(event.target.value)} />
          <Input placeholder="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Input placeholder="Placa inicial opcional" value={plate} onChange={(event) => setPlate(event.target.value)} />
          <Button
            className="h-12 w-full rounded-xl"
            disabled={!name.trim() || createCustomer.isPending}
            onClick={handleCreate}
          >
            {createCustomer.isPending ? "Creando..." : "Crear cliente"}
          </Button>
        </AppDrawer.Body>
      </AppDrawer>
    </>
  );
}

function StandardCustomersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const { field: sortBy, order: sortOrder, toggleSort } = useCustomerSort();
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
    sortBy,
    sortOrder,
  });

  const activeSortLabel = SORT_OPTIONS.find(
    (o) => o.sortBy === sortBy && o.sortOrder === sortOrder
  )?.label ?? "Ordenar";

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
        tagId: tag.tagId,
        tagName: tag.tagName,
        tagColor: tag.tagColor,
        assignedAt: new Date().toISOString(),
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
      });
      map.set(group.customerId, existing);
    }
    return map;
  }, [customerGroups]);

  useEffect(() => {
    setPage(1);
  }, [search, tagIds, groupIds, sortBy, sortOrder]);

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
              className="shell-search-field pl-11 pr-4"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <CustomerFilterPopover
                selectedTagIds={tagIds}
                onTagIdsChange={setTagIds}
                selectedGroupIds={groupIds}
                onGroupIdsChange={setGroupIds}
                onCreateClick={() => quickTagModal.open()}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 gap-1.5 rounded-lg border-stone-200/80 text-muted-foreground hover:bg-stone-50 dark:border-white/10 dark:hover:bg-white/[0.08]"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{activeSortLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-xl border-stone-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#171922]/95"
              >
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={`${option.sortBy}-${option.sortOrder}`}
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleSort(option.sortBy);
                    }}
                    className={cn(
                      "gap-2 rounded-lg",
                      sortBy === option.sortBy && sortOrder === option.sortOrder
                        ? "bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700 focus:bg-orange-50 focus:text-orange-700 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-700 dark:bg-orange-500/[0.16] dark:text-orange-100 dark:hover:bg-orange-500/[0.22] dark:hover:text-orange-50 dark:focus:bg-orange-500/[0.22] dark:focus:text-orange-50 dark:data-[highlighted]:!bg-orange-500/[0.22] dark:data-[highlighted]:!text-orange-50"
                        : "text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-foreground dark:focus:bg-white/[0.08] dark:focus:text-foreground dark:data-[highlighted]:!bg-white/[0.08] dark:data-[highlighted]:!text-foreground"
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="space-y-1">
            {customers.length > 0 && (
              <div className="flex items-center justify-between border-b border-border/60 px-1 pb-3 dark:border-white/[0.07]">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      selectedCustomerIds.size === customers.length
                        ? "border-orange-500 bg-orange-500"
                        : "border-stone-300 hover:border-orange-400 dark:border-white/15"
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
                        className="h-9 gap-1.5 rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/[0.16]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        Acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-xl border-stone-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#171922]/95"
                    >
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          bulkGroupsDrawer.open({
                            customerIds: Array.from(selectedCustomerIds),
                            onAssigned: clearSelection,
                          });
                        }}
                        className="gap-2 rounded-lg text-orange-600 hover:bg-orange-50 hover:text-orange-700 focus:bg-orange-50 focus:text-orange-700 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-700 dark:text-orange-200 dark:hover:bg-orange-500/[0.14] dark:hover:text-orange-100 dark:focus:bg-orange-500/[0.14] dark:focus:text-orange-100 dark:data-[highlighted]:!bg-orange-500/[0.14] dark:data-[highlighted]:!text-orange-100"
                      >
                        <Users className="h-4 w-4" />
                        Asignar grupos
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          bulkTagsModal.open({ customerIds: Array.from(selectedCustomerIds) });
                        }}
                        className="gap-2 rounded-lg text-orange-600 hover:bg-orange-50 hover:text-orange-700 focus:bg-orange-50 focus:text-orange-700 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-700 dark:text-orange-200 dark:hover:bg-orange-500/[0.14] dark:hover:text-orange-100 dark:focus:bg-orange-500/[0.14] dark:focus:text-orange-100 dark:data-[highlighted]:!bg-orange-500/[0.14] dark:data-[highlighted]:!text-orange-100"
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
                showDebt
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

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          className="h-12 w-12 rounded-xl bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.2)] hover:bg-orange-600"
          onClick={() => navigate("/clientes/nuevo")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>

      <BulkCustomerTagsModal />
      <BulkGroupAssignmentDrawer />
      <QuickTagModal />
    </>
  );
}

export default function CustomersPage() {
  const { is } = useBusinessMode();
  return is.cochera ? <CocheraCustomersPage /> : <StandardCustomersPage />;
}
