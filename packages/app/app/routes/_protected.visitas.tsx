// @ts-nocheck - Route file with complex type errors
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, Search, Users, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { useSetLayout } from "~/components/layout/app-layout";
import { MobileShell } from "~/components/mobile";
import { useCustomers } from "~/hooks/use-customers";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useCreateDraftSale } from "~/hooks/use-sales";
import {
  useCreateVisita,
  useCreateVisitasFromGroup,
  useUpdateVisita,
  useVisitas,
  type Visita,
} from "~/hooks/use-visitas";
import { useCustomerGroups } from "~/hooks/use-grupos";
import { useVisitaDialogs } from "~/hooks/use-visita-dialogs";
import { VisitaCard } from "~/components/visitas/visita-card";
import { SelectionDialog } from "~/components/visitas/selection-dialog";
import { NoPurchaseDialog } from "~/components/visitas/no-purchase-dialog";
import { DistributionHeader } from "~/components/visitas/distribution-header";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { toast } from "sonner";
import { showError } from "~/lib/errors";

export default function VisitasPage() {
  const { is } = useBusinessMode();
  const isWaterMode = is.agua;
  useSetLayout({ title: isWaterMode ? "Entregas" : "Visitas" });
  const navigate = useNavigate();

  const { data: distribucion, isLoading: isLoadingDistribucion } = useMiDistribucion();
  const [search, setSearch] = useState("");
  const [selectedFilterGroupId, setSelectedFilterGroupId] = useState<string | null>(null);
  const [expectedContainerQuantity, setExpectedContainerQuantity] = useState(1);

  const {
    selectionModal,
    selectionMode,
    setSelectionMode,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedGroupId,
    setSelectedGroupId,
    isCreating,
    setIsCreating,
    resetSelectionState,
    noPurchaseModal,
    selectedReason,
    setSelectedReason,
    customReason,
    setCustomReason,
    isUpdatingNoPurchase,
    setIsUpdatingNoPurchase,
    resetNoPurchaseState,
  } = useVisitaDialogs();

  const { data: customers } = useCustomers();
  const { data: groups } = useCustomerGroups();

  const createVistaMutation = useCreateVisita();
  const createVisitasFromGroupMutation = useCreateVisitasFromGroup();
  const updateVistaMutation = useUpdateVisita();

  const { data: visitasData, isLoading: isLoadingVisitas } = useVisitas(distribucion?.id);

  const groupFilterOptions = useMemo(() => {
    const groupMap = new Map<string, string>();
    for (const visita of visitasData || []) {
      for (const group of visita.groups || []) {
        groupMap.set(group.id, group.name);
      }
    }
    return Array.from(groupMap, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [visitasData]);

  const filteredVisitas = useMemo(() => {
    const visitasList = visitasData || [];
    const lowerSearch = search.toLowerCase();
    return visitasList.filter((v) => {
      const matchesSearch =
        !search.trim() ||
        v.customer?.name?.toLowerCase().includes(lowerSearch) ||
        v.customer?.dni?.includes(search);
      const matchesGroup =
        !selectedFilterGroupId ||
        v.groups?.some((group) => group.id === selectedFilterGroupId);

      return matchesSearch && matchesGroup;
    });
  }, [visitasData, search, selectedFilterGroupId]);

  async function handleCreateSingleVisita() {
    if (!distribucion?.id || !selectedCustomerId) return;

    setIsCreating(true);
    try {
      await createVistaMutation.mutateAsync({
        distribucionId: distribucion.id,
        customerId: selectedCustomerId,
        ...(isWaterMode ? { expectedContainerQuantity } : {}),
      });
      selectionModal.close();
      resetSelectionState();
    } catch (error) {
      console.error("Error creating visita:", error);
      toast.error("Error al crear visita");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateGroupVisitas() {
    if (!distribucion?.id || !selectedGroupId) return;

    const groupList = groups || [];
    const group = groupList.find((g) => g.id === selectedGroupId);
    if (!group?.memberCount || group.memberCount === 0) {
      toast.error("El grupo no tiene miembros");
      return;
    }

    setIsCreating(true);
    try {
      await createVisitasFromGroupMutation.mutateAsync({
        distribucionId: distribucion.id,
        groupId: selectedGroupId,
        ...(isWaterMode ? { expectedContainerQuantity } : {}),
      });

      selectionModal.close();
      resetSelectionState();
    } catch (error) {
      console.error("Error creating group visitas:", error);
      toast.error("Error al crear visitas");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleMarkAsNotPurchased() {
    const visita = noPurchaseModal.data;
    if (!visita) return;

    const motivo = selectedReason === "Otro" ? customReason : selectedReason;
    if (!motivo) {
      toast.error("Selecciona un motivo");
      return;
    }

    setIsUpdatingNoPurchase(true);
    try {
      await updateVistaMutation.mutateAsync({
        id: visita.id,
        status: "no_compra",
        motivoNoCompra: motivo,
      });
      noPurchaseModal.close();
      resetNoPurchaseState();
      toast.success("Visita marcada como no comprada");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar estado");
    } finally {
      setIsUpdatingNoPurchase(false);
    }
  }

  const createDraftSale = useCreateDraftSale();

  async function handleGenerateSale(visita: Visita) {
    if (!visita.customer) return;

    if (isWaterMode) {
      navigate("/mi-distribucion");
      return;
    }

    try {
      const sale = await createDraftSale.mutateAsync({
        customerId: visita.customerId,
        distribucionId: visita.distribucionId,
        visitaId: visita.id,
      });

      // Mark attendance: update visita status to "compro" with the sale link
      await updateVistaMutation.mutateAsync({
        id: visita.id,
        status: "compro",
        saleId: sale.id,
      });

      navigate(`/ventas/${sale.id}/editar?visitaId=${visita.id}`);
    } catch (err) {
      console.error("Error creating sale:", err);
      showError("Error al crear venta", err);
    }
  }

  function handleMarkAsNotPurchasedClick(visita: Visita) {
    noPurchaseModal.open(visita);
  }

  const isDistribucionActiva = distribucion?.estado === "activo";

  if (!isLoadingDistribucion && (!distribucion || !isDistribucionActiva)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-orange-500" />
        <h3 className="mb-2 text-lg font-semibold">
          {distribucion ? "Distribución cerrada" : "No hay distribución activa"}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {distribucion
            ? "Esta distribución ya fue cerrada. No se pueden registrar nuevas visitas."
            : isWaterMode
              ? "Necesitas tener una ruta activa para registrar entregas"
              : "Necesitas tener una distribución activa para registrar visitas"}
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

  if (isLoadingDistribucion || isLoadingVisitas) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {distribucion && <DistributionHeader distribucion={distribucion} />}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shell-search-field pl-11 pr-4"
        />
      </div>

      {groupFilterOptions.length > 0 && (
        <div className="flex gap-1 overflow-x-auto border-b border-border/70 pb-2">
          <Button
            type="button"
            size="sm"
            variant={selectedFilterGroupId === null ? "default" : "outline"}
            className="h-8 shrink-0 rounded-md px-3 text-xs"
            onClick={() => setSelectedFilterGroupId(null)}
          >
            Todos
          </Button>
          {groupFilterOptions.map((group) => (
            <Button
              key={group.id}
              type="button"
              size="sm"
              variant={selectedFilterGroupId === group.id ? "default" : "outline"}
              className="h-8 shrink-0 rounded-md px-3 text-xs"
              onClick={() => setSelectedFilterGroupId(group.id)}
            >
              {group.name}
            </Button>
          ))}
        </div>
      )}

      {filteredVisitas.length === 0 && !isLoadingVisitas && (
        <div className="py-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            {search || selectedFilterGroupId
              ? isWaterMode ? "No se encontraron entregas" : "No se encontraron visitas"
              : isWaterMode ? "No hay entregas registradas" : "No hay visitas registradas"}
          </p>
          {!search && !selectedFilterGroupId && distribucion && (
            <Button
              onClick={() => selectionModal.open()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isWaterMode ? "Agregar entrega" : "Agregar visita"}
            </Button>
          )}
        </div>
      )}

      {filteredVisitas.length > 0 && (
        <div className="border-t border-border/70">
          {filteredVisitas.map((visita) => (
            <VisitaCard
              key={visita.id}
              visita={visita}
              onMarkAsNotPurchased={handleMarkAsNotPurchasedClick}
              onGenerateSale={handleGenerateSale}
              isWaterMode={isWaterMode}
            />
          ))}
        </div>
      )}

      {distribucion && (
        <MobileShell.FloatingAction>
          <Button
            size="icon"
            aria-label={isWaterMode ? "Agregar entrega" : "Agregar visita"}
            className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
            onClick={() => selectionModal.open()}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </MobileShell.FloatingAction>
      )}

      <SelectionDialog
        isOpen={selectionModal.isOpen}
        onOpenChange={selectionModal.close}
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
        customers={customers}
        groups={groups}
        selectedCustomerId={selectedCustomerId}
        onCustomerSelect={setSelectedCustomerId}
        selectedGroupId={selectedGroupId}
        onGroupSelect={setSelectedGroupId}
        isCreating={isCreating}
        isWaterMode={isWaterMode}
        expectedContainerQuantity={expectedContainerQuantity}
        onExpectedContainerQuantityChange={setExpectedContainerQuantity}
        onCreateSingle={handleCreateSingleVisita}
        onCreateGroup={handleCreateGroupVisitas}
      />

      <NoPurchaseDialog
        visita={noPurchaseModal.data}
        isOpen={noPurchaseModal.isOpen}
        onOpenChange={noPurchaseModal.close}
        selectedReason={selectedReason}
        onReasonChange={setSelectedReason}
        customReason={customReason}
        onCustomReasonChange={setCustomReason}
        isUpdating={isUpdatingNoPurchase}
        onConfirm={handleMarkAsNotPurchased}
      />
    </div>
  );
}
