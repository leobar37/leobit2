/**
 * Visits Management Page
 * Route: /visitas
 * Provides visit management for active distribution with customer/group selection
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  Check,
  X,
  Search,
  Users,
  UserPlus,
  ShoppingCart,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetLayout } from "~/components/layout/app-layout";
import { useCustomers } from "~/hooks/use-customers";
import { useListSearch } from "~/hooks/use-list-search";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useCreateDraftSale } from "~/hooks/use-sales";
import { useCreateVisita, useCreateVisitasFromGroup, useUpdateVisita } from "~/hooks/use-visitas";
import { isOnline } from "~/lib/file-queue/utils";
import { toast } from "sonner";
import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";
import { showError } from "~/lib/errors";
import { cn } from "~/lib/utils";

// Types
interface Customer {
  id: string;
  name: string;
  dni?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface GroupMember {
  customerId: string;
  customerName: string;
  addedAt: string;
}

interface CustomerGroup {
  id: string;
  name: string;
  memberCount?: number;
  members?: GroupMember[];
}

interface Visita {
  id: string;
  distribucionId: string;
  customerId: string;
  customer?: Customer;
  vendedorId: string;
  status: "pendiente" | "compro" | "no_compra";
  motivoNoCompra?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<T> {
  const token = getStoredAuthToken();
  const businessId = getStoredBusinessId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (businessId) {
    headers["x-business-id"] = businessId;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data.data as T;
}

// API functions
async function fetchVisitas(distribucionId: string): Promise<Visita[]> {
  return apiCall<Visita[]>(`/api/visitas?distribucionId=${distribucionId}`);
}

async function fetchGroups(): Promise<CustomerGroup[]> {
  return apiCall<CustomerGroup[]>("/api/groups");
}

// Status colors
const statusColors = {
  pendiente: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: Clock,
  },
  compro: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: CheckCircle,
  },
  no_compra: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: XCircle,
  },
};

const statusLabels = {
  pendiente: "Pendiente",
  compro: "Compró",
  no_compra: "No compró",
};

// Reason options for no purchase
const motivoOptions = [
  "No tenía dinero",
  "No le interesó",
  "Ya compré en otro lugar",
  "Precio muy alto",
  "No había producto",
  "Otro",
];

export default function VisitasPage() {
  useSetLayout({ title: "Visitas" });
  const navigate = useNavigate();

  // Get active distribution
  const { data: distribucion, isLoading: isLoadingDistribucion } = useMiDistribucion();

  // State
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer selection dialog
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"individual" | "group">("individual");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Status update dialog
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [statusDialogMode, setStatusDialogMode] = useState<"purchase" | "no_purchase">("purchase");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch customers and groups
  const { data: customers } = useCustomers();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);

  // Offline-aware mutations for visitas
  const createVistaMutation = useCreateVisita();
  const createVisitasFromGroupMutation = useCreateVisitasFromGroup();
  const updateVistaMutation = useUpdateVisita();

  // Load groups
  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .catch((err) => console.error("Error loading groups:", err));
  }, []);

  // Load visitas when distribution is available
  useEffect(() => {
    if (distribucion?.id) {
      loadVisitas();
    }
  }, [distribucion?.id]);

  async function loadVisitas() {
    if (!distribucion?.id) return;
    setIsLoading(true);
    try {
      const data = await fetchVisitas(distribucion.id);
      setVisitas(data);
    } catch (error) {
      console.error("Error loading visitas:", error);
      toast.error("Error al cargar visitas");
    } finally {
      setIsLoading(false);
    }
  }

  // Filter visitas by search
  const filteredVisitas = useMemo(() => {
    if (!search.trim()) return visitas;
    const lowerSearch = search.toLowerCase();
    return visitas.filter(
      (v) =>
        v.customer?.name?.toLowerCase().includes(lowerSearch) ||
        v.customer?.dni?.includes(search)
    );
  }, [visitas, search]);

  // Get customer by ID
  const getCustomerById = (id: string): Customer | undefined => {
    return customers?.find((c) => c.id === id);
  };

  // Handle single customer selection
  async function handleCreateSingleVisita() {
    if (!distribucion?.id || !selectedCustomerId) return;

    setIsCreating(true);
    try {
      const newVisita = await createVistaMutation.mutateAsync({
        distribucionId: distribucion.id,
        customerId: selectedCustomerId,
      });
      const customer = getCustomerById(selectedCustomerId);
      setVisitas((prev) => [...prev, { ...newVisita, customer }]);
      setIsSelectionOpen(false);
      setSelectedCustomerId("");
      toast.success("Visita creada");
    } catch (error) {
      console.error("Error creating visita:", error);
      toast.error("Error al crear visita");
    } finally {
      setIsCreating(false);
    }
  }

  // Handle group selection
  async function handleCreateGroupVisitas() {
    if (!distribucion?.id || !selectedGroupId) return;

    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group?.members?.length) {
      toast.error("El grupo no tiene miembros");
      return;
    }

    setIsCreating(true);
    try {
      const visits = await createVisitasFromGroupMutation.mutateAsync({
        distribucionId: distribucion.id,
        groupId: selectedGroupId,
      });

      // Add customer info to visits
      const visitsWithCustomer = visits.map((v) => ({
        ...v,
        customer: getCustomerById(v.customerId),
      }));

      setVisitas((prev) => [...prev, ...visitsWithCustomer]);
      setIsSelectionOpen(false);
      setSelectedGroupId("");
      toast.success(`${visits.length} visitas creadas`);
    } catch (error) {
      console.error("Error creating group visitas:", error);
      toast.error("Error al crear visitas");
    } finally {
      setIsLoading(false);
      setIsCreating(false);
    }
  }

  // Handle status update - mark as purchased
  async function handleMarkAsPurchased() {
    if (!selectedVisita) return;

    setIsUpdating(true);
    try {
      const updated = await updateVistaMutation.mutateAsync({
        id: selectedVisita.id,
        status: "compro",
      });
      setVisitas((prev) =>
        prev.map((v) => (v.id === selectedVisita.id ? { ...v, ...updated } : v))
      );
      setSelectedVisita(null);
      toast.success("Visita marcada como comprada");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar estado");
    } finally {
      setIsUpdating(false);
    }
  }

  // Handle status update - mark as not purchased
  async function handleMarkAsNotPurchased() {
    if (!selectedVisita) return;

    const motivo = selectedReason === "Otro" ? customReason : selectedReason;
    if (!motivo) {
      toast.error("Selecciona un motivo");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateVistaMutation.mutateAsync({
        id: selectedVisita.id,
        status: "no_compra",
        motivoNoCompra: motivo,
      });
      setVisitas((prev) =>
        prev.map((v) => (v.id === selectedVisita.id ? { ...v, ...updated } : v))
      );
      setSelectedVisita(null);
      setSelectedReason("");
      setCustomReason("");
      toast.success("Visita marcada como no comprada");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar estado");
    } finally {
      setIsUpdating(false);
    }
  }

  // Generate sale from visit
  const createDraftSale = useCreateDraftSale();

  async function handleGenerateSale(visita: Visita) {
    if (!visita.customer) return;

    // Handle offline case - show info message
    if (!isOnline()) {
      toast.info("Creando venta en modo offline. Se sincronizará cuando haya conexión.");
    }

    try {
      // Create draft sale with customer and distribution info, pass visitaId for linking
      const sale = await createDraftSale.mutateAsync({
        customerId: visita.customerId,
        distribucionId: visita.distribucionId,
      });
      // Navigate to sale edit page with visitaId for later linking
      navigate(`/ventas/${sale.id}/editar?visitaId=${visita.id}`);
    } catch (err) {
      console.error("Error creating sale:", err);
      showError("Error al crear venta", err);
    }
  }

  // No distribution state
  if (!isLoadingDistribucion && !distribucion) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-orange-500" />
        <h3 className="mb-2 text-lg font-semibold">No hay distribución activa</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Necesitas tener una distribución activa para registrar visitas
        </p>
        <Button
          onClick={() => navigate("/mi-distribucion")}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Ir a Mi Distribución
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoadingDistribucion || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Distribution context */}
      {distribucion && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-orange-900">Distribución activa</p>
              <p className="text-sm text-orange-700">
                {distribucion.fecha} - {distribucion.puntoVenta}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
        />
      </div>

      {/* Empty state */}
      {filteredVisitas.length === 0 && !isLoading && (
        <div className="py-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            {search ? "No se encontraron visitas" : "No hay visitas registradas"}
          </p>
          {!search && distribucion && (
            <Button
              onClick={() => setIsSelectionOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar visita
            </Button>
          )}
        </div>
      )}

      {/* Visits list */}
      {filteredVisitas.length > 0 && (
        <div className="space-y-3">
          {filteredVisitas.map((visita) => {
            const colors = statusColors[visita.status];
            const StatusIcon = colors.icon;

            return (
              <Card
                key={visita.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-colors",
                  colors.border
                )}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    colors.bg.replace("bg-", "bg-")
                  )}
                />

                <div className="flex items-start justify-between gap-3 pl-3">
                  {/* Customer info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.05rem] font-semibold text-foreground">
                      {visita.customer?.name || "Cliente"}
                    </p>
                    {visita.customer?.dni && (
                      <p className="text-sm text-muted-foreground">
                        DNI: {visita.customer.dni}
                      </p>
                    )}
                    {visita.motivoNoCompra && (
                      <p className="mt-1 text-sm text-red-600">
                        Motivo: {visita.motivoNoCompra}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                      colors.bg,
                      colors.text
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusLabels[visita.status]}
                  </div>
                </div>

                {/* Actions */}
                {visita.status === "pendiente" && (
                  <div className="mt-3 flex gap-2 pl-3">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedVisita(visita);
                        setStatusDialogMode("purchase");
                      }}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Compró
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setSelectedVisita(visita);
                        setStatusDialogMode("no_purchase");
                      }}
                    >
                      <X className="mr-1 h-4 w-4" />
                      No compró
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                      onClick={() => handleGenerateSale(visita)}
                      title="Generar venta"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating action button */}
      {distribucion && (
        <div className="fixed bottom-28 right-4 z-50">
          <Dialog open={isSelectionOpen} onOpenChange={setIsSelectionOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Visita</DialogTitle>
                <DialogDescription>
                  Selecciona un cliente individual o un grupo
                </DialogDescription>
              </DialogHeader>

              {/* Selection mode tabs */}
              <div className="flex gap-2 py-4">
                <Button
                  variant={selectionMode === "individual" ? "default" : "outline"}
                  onClick={() => setSelectionMode("individual")}
                  className={
                    selectionMode === "individual"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : ""
                  }
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cliente
                </Button>
                <Button
                  variant={selectionMode === "group" ? "default" : "outline"}
                  onClick={() => setSelectionMode("group")}
                  className={
                    selectionMode === "group"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : ""
                  }
                >
                  <Users className="mr-2 h-4 w-4" />
                  Grupo
                </Button>
              </div>

              {/* Individual customer selection */}
              {selectionMode === "individual" && (
                <div className="space-y-4">
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.dni && ` (${customer.dni})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsSelectionOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateSingleVisita}
                      disabled={!selectedCustomerId || isCreating}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isCreating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Crear visita
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Group selection */}
              {selectionMode === "group" && (
                <div className="space-y-4">
                  <Select
                    value={selectedGroupId}
                    onValueChange={setSelectedGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.memberCount || 0} miembros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsSelectionOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateGroupVisitas}
                      disabled={!selectedGroupId || isCreating}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isCreating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Crear visitas para todo el grupo
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Purchase confirmation dialog */}
      <Dialog
        open={!!selectedVisita && statusDialogMode === "purchase"}
        onOpenChange={(open) => !open && setSelectedVisita(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar compra</DialogTitle>
            <DialogDescription>
              ¿El cliente{" "}
              <span className="font-semibold">
                {selectedVisita?.customer?.name}
              </span>{" "}
              realizó una compra?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVisita(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMarkAsPurchased}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sí, compró
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No purchase reason dialog */}
      <Dialog
        open={!!selectedVisita && statusDialogMode === "no_purchase"}
        onOpenChange={(open) => !open && setSelectedVisita(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Por qué no compró?</DialogTitle>
            <DialogDescription>
              Selecciona el motivo por el cual{" "}
              <span className="font-semibold">
                {selectedVisita?.customer?.name}
              </span>{" "}
              no realizó la compra
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivoOptions.map((motivo) => (
                  <SelectItem key={motivo} value={motivo}>
                    {motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedReason === "Otro" && (
              <Input
                placeholder="Especificar motivo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVisita(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMarkAsNotPurchased}
              disabled={isUpdating || !selectedReason || (selectedReason === "Otro" && !customReason)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
