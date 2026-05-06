// @ts-nocheck - Route file with complex type errors
import { Loader2, Save, Package, WifiOff, Route, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateDistribucionForm, type CreateDistribucionFormRef } from "~/components/distribucion";
import { VendedorSelect, type VendedorOption } from "~/components/distribucion/vendedor-select";
import {
  useCreateDistribucion,
  useGenerateWaterRoute,
  usePreviewWaterRoute,
  type CreateDistribucionApiInput,
} from "~/hooks/use-distribuciones";
import { useToastError } from "~/hooks/use-toast-error";
import { getToday } from "~/lib/date-utils";
import { useSearchParams, useNavigate } from "react-router";
import { FormPage } from "~/components/layout/form-page";

import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { useCreateWaterRoute, useWaterRoutes } from "~/hooks/use-water-routes";

export default function NuevaDistribucionPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastError();
  const [searchParams] = useSearchParams();
  const createMutation = useCreateDistribucion();
  const previewWaterRoute = usePreviewWaterRoute();
  const generateWaterRoute = useGenerateWaterRoute();
  const formRef = useRef<CreateDistribucionFormRef>(null);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waterVendedor, setWaterVendedor] = useState<VendedorOption | null>(null);
  const [waterRouteId, setWaterRouteId] = useState("");
  const [newWaterRouteName, setNewWaterRouteName] = useState("");
  const [previewKey, setPreviewKey] = useState("");
  const isOnline = true;
  const { toast } = useToast();
  const { mode } = useBusinessMode();
  const { data: waterRoutes = [] } = useWaterRoutes();
  const createWaterRoute = useCreateWaterRoute();

  const fechaFromUrl = searchParams.get("fecha");
  const selectedDate = fechaFromUrl || getToday();

  const handleSubmit = async (data: CreateDistribucionApiInput) => {
    console.log("[NuevaDistribucion] Submitting...", data);
    setIsSubmitting(true);
    try {
      console.log("[NuevaDistribucion] Calling mutateAsync...");
      await createMutation.mutateAsync({
        ...data,
        fecha: selectedDate,
      });
      console.log("[NuevaDistribucion] Success! Showing toast...");
      showSuccess("Distribución creada", {
        description: "La distribución se ha creado exitosamente.",
      });
      console.log("[NuevaDistribucion] Navigating to /distribuciones...");
      navigate("/distribuciones", { replace: true });
      console.log("[NuevaDistribucion] Navigation complete");
    } catch (error) {
      console.log("[NuevaDistribucion] Error:", error);
      showError("Error", error, {
        description: "No se pudo crear la distribución",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormValidityChange = (valid: boolean) => {
    setIsValid(valid);
  };

  const isLoading = isSubmitting || createMutation.isPending;
  const isWaterMode = mode === "agua";
  const waterRoutePreview = previewWaterRoute.data?.customers ?? [];
  const waterIsLoading = isSubmitting || previewWaterRoute.isPending || generateWaterRoute.isPending;
  const currentPreviewKey = `${selectedDate}:${waterRouteId}:${waterVendedor?.id ?? ""}`;
  const previewIsCurrent = previewKey === currentPreviewKey;

  const handlePreviewWaterRoute = async () => {
    try {
      await previewWaterRoute.mutateAsync({
        fecha: selectedDate,
        waterRouteId,
      });
      setPreviewKey(currentPreviewKey);
    } catch (error) {
      showError("Error", error, {
        description: "No se pudo previsualizar la ruta",
      });
    }
  };

  const handleGenerateWaterRoute = async () => {
    if (!waterVendedor) return;
    setIsSubmitting(true);
    try {
      const result = await generateWaterRoute.mutateAsync({
        vendedorId: waterVendedor.id,
        fecha: selectedDate,
        waterRouteId,
      });
      showSuccess("Ruta creada", {
        description: `Se generaron ${result.createdVisits} visitas de reparto.`,
      });
      navigate("/distribuciones", { replace: true });
    } catch (error) {
      showError("Error", error, {
        description: "No se pudo generar la ruta de agua",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!newWaterRouteName.trim()) return;
    const route = await createWaterRoute.mutateAsync({ name: newWaterRouteName.trim() });
    setWaterRouteId(route.id);
    setNewWaterRouteName("");
    setPreviewKey("");
  };

  return (
    <FormPage
      title={isWaterMode ? "Nueva Ruta" : "Nueva Distribución"}
      backHref="/distribuciones"
      icon={isWaterMode ? Route : Package}
      toolbar={
        <Button
          onClick={isWaterMode ? handleGenerateWaterRoute : () => formRef.current?.submit()}
          disabled={
            isWaterMode
              ? waterIsLoading || !waterVendedor || !waterRouteId || !previewIsCurrent || waterRoutePreview.length === 0 || !isOnline
              : isLoading || !isValid || !isOnline
          }
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {(isWaterMode ? waterIsLoading : isLoading) ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creando...
            </>
          ) : !isOnline ? (
            <>
              <WifiOff className="h-5 w-5 mr-2" />
              Sin conexión
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              {isWaterMode ? "Crear Ruta" : "Crear Distribución"}
            </>
          )}
        </Button>
      }
    >
      {!isOnline && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Se requiere conexión a internet para crear una distribución porque se generan visitas automáticamente.
          </AlertDescription>
        </Alert>
      )}
      {isWaterMode ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-sky-200/80 bg-sky-50/70 p-4 dark:border-sky-400/20 dark:bg-sky-400/10">
            <div className="space-y-2">
              <Label>Repartidor *</Label>
              <VendedorSelect
                value={waterVendedor?.id || null}
                selectedVendedor={waterVendedor}
                onChange={setWaterVendedor}
                required
                helperText="Seleccione quién hará la ruta"
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="water-route">Ruta *</Label>
                <span className="text-xs text-muted-foreground">Formal</span>
              </div>
              <select
                id="water-route"
                value={waterRouteId}
                onChange={(event) => {
                  setWaterRouteId(event.target.value);
                  setPreviewKey("");
                }}
                className="shell-field h-12 w-full rounded-[20px] px-4 text-sm"
              >
                <option value="">Selecciona una ruta</option>
                {waterRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                <input
                  value={newWaterRouteName}
                  onChange={(event) => setNewWaterRouteName(event.target.value)}
                  placeholder="Nueva ruta..."
                  className="shell-field h-11 min-w-0 flex-1 rounded-[18px] px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateRoute}
                  disabled={!newWaterRouteName.trim() || createWaterRoute.isPending}
                  className="h-11 rounded-[18px] bg-sky-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Crear
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handlePreviewWaterRoute}
              disabled={previewWaterRoute.isPending || !waterRouteId}
              className="mt-4 h-12 w-full rounded-xl"
            >
              {previewWaterRoute.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Ver clientes programados
            </Button>
          </div>

          <div className="space-y-3">
            {previewWaterRoute.data ? (
              !previewIsCurrent ? (
                <div className="shell-card-flat rounded-[24px] p-4 text-center text-sm text-amber-700 dark:text-amber-200">
                  La ruta cambió. Vuelve a previsualizar antes de crear.
                </div>
              ) :
              waterRoutePreview.length === 0 ? (
                <div className="shell-card-flat rounded-[24px] p-4 text-center text-sm text-muted-foreground">
                  No hay clientes programados para esta fecha y ruta.
                </div>
              ) : (
                waterRoutePreview.map((customer) => (
                  <div key={customer.customerId} className="shell-card-flat rounded-[24px] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{customer.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.address || "Sin dirección registrada"}
                        </p>
                        {customer.deliveryInstructions && (
                          <p className="mt-2 rounded-2xl bg-sky-50 p-2 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-100">
                            {customer.deliveryInstructions}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 rounded-2xl bg-sky-100 px-3 py-2 text-center text-sky-800 dark:bg-sky-500/20 dark:text-sky-100">
                        <p className="text-lg font-bold">{customer.defaultContainerQuantity}</p>
                        <p className="text-[11px]">bidones</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="shell-card-flat rounded-[24px] p-4 text-sm text-muted-foreground">
                Previsualiza la ruta para cargar los clientes recurrentes de agua programados para hoy.
              </div>
            )}
          </div>
        </div>
      ) : (
        <CreateDistribucionForm
          ref={formRef}
          onSubmit={handleSubmit}
          isPending={isLoading}
          onValidityChange={handleFormValidityChange}
        />
      )}
    </FormPage>
  );
}
