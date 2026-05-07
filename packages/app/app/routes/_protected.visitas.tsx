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
import { toast } from "sonner";
import { showError } from "~/lib/errors";

export default function VisitasPage() {
  useSetLayout({ title: "Visitas" });
  const navigate = useNavigate();

  const { data: distribucion, isLoading: isLoadingDistribucion } = useMiDistribucion();
  const [search, setSearch] = useState("");

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

  const filteredVisitas = useMemo(() => {
    const visitasList = visitasData || [];
    if (!search.trim()) return visitasList;
    const lowerSearch = search.toLowerCase();
    return visitasList.filter(
      (v) =>
        v.customer?.name?.toLowerCase().includes(lowerSearch) ||
        v.customer?.dni?.includes(search)
    );
  }, [visitasData, search]);

  async function handleCreateSingleVisita() {
    if (!distribucion?.id || !selectedCustomerId) return;

    setIsCreating(true);
    try {
      await createVistaMutation.mutateAsync({
        distribucionId: distribucion.id,
        customerId: selectedCustomerId,
      });
      selectionModal.close();
      resetSelectionState();
      toast.success("Visita creada");
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
      const visits = await createVisitasFromGroupMutation.mutateAsync({
        distribucionId: distribucion.id,
        groupId: selectedGroupId,
      });

      selectionModal.close();
      resetSelectionState();
      toast.success(`${visits.length} visitas creadas`);
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

      {filteredVisitas.length === 0 && !isLoadingVisitas && (
        <div className="py-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            {search ? "No se encontraron visitas" : "No hay visitas registradas"}
          </p>
          {!search && distribucion && (
            <Button
              onClick={() => selectionModal.open()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar visita
            </Button>
          )}
        </div>
      )}

      {filteredVisitas.length > 0 && (
        <div className="space-y-3">
          {filteredVisitas.map((visita) => (
            <VisitaCard
              key={visita.id}
              visita={visita}
              onMarkAsNotPurchased={handleMarkAsNotPurchasedClick}
              onGenerateSale={handleGenerateSale}
            />
          ))}
        </div>
      )}

      {distribucion && (
        <MobileShell.FloatingAction>
          <Button
            size="icon"
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
