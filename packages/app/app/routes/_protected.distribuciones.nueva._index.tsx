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
import { WaterRouteSelector } from "~/components/water/water-route-selector";
import { useAuth } from "~/hooks/use-auth";
import { useTeam } from "~/hooks/use-team";
import { useBusiness } from "~/hooks/use-business";

export default function NuevaDistribucionPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastError();
  const [searchParams] = useSearchParams();
  const createMutation = useCreateDistribucion();
  const previewWaterRoute = usePreviewWaterRoute();
  const generateWaterRoute = useGenerateWaterRoute();
  const formRef = useRef<CreateDistribucionFormRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waterVendedor, setWaterVendedor] = useState<VendedorOption | null>(null);
  const [waterRouteId, setWaterRouteId] = useState("");
  const [previewKey, setPreviewKey] = useState("");
  const isOnline = true;
  const { toast } = useToast();
  const { mode } = useBusinessMode();
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: team = [] } = useTeam();

  const fechaFromUrl = searchParams.get("fecha");
  const selectedDate = fechaFromUrl || getToday();

  const handleSubmit = async (data: CreateDistribucionApiInput) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        ...data,
        fecha: selectedDate,
        items: data.items ?? [],
      });
      showSuccess("Distribución creada", {
        description: "La distribución se ha creado exitosamente.",
      });
      navigate("/distribuciones", { replace: true });
    } catch (error) {
      showError("No se pudo crear la distribución", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || createMutation.isPending;
  const isWaterMode = mode === "agua";
  const waterRoutePreview = previewWaterRoute.data?.customers ?? [];
  const waterIsLoading = isSubmitting || previewWaterRoute.isPending || generateWaterRoute.isPending;
  const currentPreviewKey = `${selectedDate}:${waterRouteId}:${waterVendedor?.id ?? ""}`;
  const previewIsCurrent = previewKey === currentPreviewKey;
  const currentMember =
    team.find((member) => member.userId === user?.id && member.isActive) ??
    (business?.businessUserId && user
      ? {
          id: business.businessUserId,
          name: user.name || user.email || "Yo",
          role: business.role,
          userId: user.id,
          isActive: business.isActive,
        }
      : null);
  const canAssignToSelf = currentMember?.role === "VENDEDOR" || currentMember?.role === "ADMIN_NEGOCIO";

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

  const handleAssignToSelf = () => {
    if (!canAssignToSelf || !currentMember) return;
    setWaterVendedor({
      id: currentMember.id,
      name: currentMember.name,
      role: currentMember.role,
      userId: currentMember.userId,
    });
    setPreviewKey("");
  };

  return (
    <FormPage
      title={isWaterMode ? "Nueva Ruta" : "Nueva Distribución"}
      backHref="/distribuciones"
      icon={isWaterMode ? Route : Package}
      toolbar={
        <Button
          data-testid={isWaterMode ? "water-route-create-button" : undefined}
          onClick={() => {
            if (isWaterMode) {
              void handleGenerateWaterRoute();
              return;
            }

            const result = formRef.current?.submit();
            if (result && !result.submitted && result.reason) {
              toast.error("Completa la distribución", {
                description: result.reason,
              });
            }
          }}
          disabled={
            isWaterMode
              ? waterIsLoading || !waterVendedor || !waterRouteId || !previewIsCurrent || waterRoutePreview.length === 0 || !isOnline
              : isLoading || !isOnline
          }
          className="h-12 w-full rounded-lg bg-orange-500 text-base font-semibold hover:bg-orange-600 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
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
        <div className="space-y-5">
          <section className="space-y-4 border-b border-border/60 pb-5 dark:border-white/[0.07]">
            <div className="border-l-2 border-sky-500/70 py-2 pl-3 text-sm text-muted-foreground">
              Primero elige la ruta formal. Luego asigna quién hará la distribución de hoy.
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Repartidor *</Label>
                {canAssignToSelf && !waterVendedor && (
                  <button
                    type="button"
                    onClick={handleAssignToSelf}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-300"
                  >
                    Asignarme a mí
                  </button>
                )}
              </div>
              <VendedorSelect
                value={waterVendedor?.id || null}
                selectedVendedor={waterVendedor}
                onChange={setWaterVendedor}
                placeholder="Seleccionar repartidor"
                required
                helperText="Seleccione quién hará la ruta"
                compact
              />
            </div>

            <WaterRouteSelector
              value={waterRouteId || null}
              onChange={(route) => {
                setWaterRouteId(route?.id ?? "");
                setPreviewKey("");
              }}
              label="Ruta"
              helperText="Ruta recurrente"
              placeholder="Selecciona una ruta"
              allowEmpty={false}
              required
            />
            <input data-testid="water-route-select" type="hidden" value={waterRouteId} readOnly />

            <Button
              data-testid="water-route-preview-button"
              type="button"
              variant="outline"
              onClick={handlePreviewWaterRoute}
              disabled={previewWaterRoute.isPending || !waterRouteId}
              className="h-11 w-full justify-center rounded-lg border-border/70 text-sm font-medium"
            >
              {previewWaterRoute.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Ver clientes programados
            </Button>
          </section>

          <section className="space-y-3">
            {previewWaterRoute.data ? (
              !previewIsCurrent ? (
                <div className="border-l-2 border-amber-500 py-2 pl-3 text-sm text-amber-700 dark:text-amber-200">
                  La ruta cambió. Vuelve a previsualizar antes de crear.
                </div>
              ) :
              waterRoutePreview.length === 0 ? (
                <div className="border-l-2 border-border py-2 pl-3 text-sm text-muted-foreground">
                  No hay clientes programados para esta fecha y ruta.
                </div>
              ) : (
                waterRoutePreview.map((customer) => (
                  <div
                    key={customer.customerId}
                    data-testid="water-route-preview-customer"
                    className="border-b border-border/60 py-3 last:border-b-0 dark:border-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{customer.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.address || "Sin dirección registrada"}
                        </p>
                        {customer.deliveryInstructions && (
                          <p className="mt-2 border-l-2 border-sky-500/70 pl-2 text-xs text-muted-foreground">
                            {customer.deliveryInstructions}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold">{customer.defaultContainerQuantity}</p>
                        <p className="text-[11px] text-muted-foreground">bidones</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <div className="border-l-2 border-sky-500/70 py-2 pl-3 text-sm text-muted-foreground">
                Previsualiza la ruta para cargar los clientes recurrentes de agua programados para hoy.
              </div>
            )}
          </section>
        </div>
      ) : (
        <CreateDistribucionForm
          ref={formRef}
          onSubmit={handleSubmit}
          isPending={isLoading}
        />
      )}
    </FormPage>
  );
}
