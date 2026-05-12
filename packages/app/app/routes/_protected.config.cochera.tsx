import { useCallback, useMemo } from "react";
import { Link } from "react-router";
import { ArrowLeft, Loader2, CarFront } from "lucide-react";
import { MobileSlot } from "~/components/mobile/mobile-slots";
import { MobilePage } from "~/components/mobile/mobile-page";
import {
  CocheraSettingsForm,
  type CocheraSettingsFormData,
} from "~/components/cochera/cochera-settings-form";
import {
  useCocheraSettings,
  useUpdateCocheraSettings,
} from "~/hooks/use-cochera-settings";
import { useBusiness } from "~/hooks/use-business";
import { BusinessUserRole } from "@avileo/shared";

function decimalStringOrZero(value: string | null | undefined): number {
  if (value == null) return "0.00" as unknown as number;
  const parsed = Number(value);
  return (Number.isNaN(parsed) ? "0.00" : parsed.toFixed(2)) as unknown as number;
}

function decimalStringOrNull(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : (parsed.toFixed(2) as unknown as number);
}

export default function CocheraConfigPage() {
  const { data: business, isLoading: isLoadingBusiness } = useBusiness();
  const isCocheraMode = business?.businessMode === "cochera";
  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;
  const canManageCocheraConfig = isCocheraMode && isAdmin;
  const { data: settings, isLoading, error } = useCocheraSettings({
    enabled: canManageCocheraConfig,
  });
  const updateMutation = useUpdateCocheraSettings();
  const backButton = useMemo(
    () => (
      <Link
        to="/config"
        className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
    ),
    []
  );
  const headerTitle = useMemo(
    () => (
      <div className="flex min-w-0 items-center gap-2 flex-1">
        <CarFront className="h-5 w-5 text-orange-600 shrink-0" />
        <h1 className="font-bold text-lg truncate">Configuración de Cochera</h1>
      </div>
    ),
    []
  );

  const handleSubmit = useCallback(
    async (data: CocheraSettingsFormData) => {
      await updateMutation.mutateAsync({
        displayName: data.displayName,
        displayAddress: data.displayAddress,
        hourlyRate: data.hourlyRate,
        dailyRate: data.dailyRate ?? null,
        graceMinutes: data.graceMinutes,
        totalSpaces: data.totalSpaces,
        hourlyBillingEnabled: data.hourlyBillingEnabled,
        hourlyBaseRate: data.hourlyBaseRate,
        hourlyBaseHours: data.hourlyBaseHours,
        extraHourRate: data.extraHourRate,
        defaultPaymentTiming: data.defaultPaymentTiming,
        acceptedPaymentMethods: data.acceptedPaymentMethods,
        vehicleTypes: data.vehicleTypes,
      });
    },
    [updateMutation]
  );

  if (isLoadingBusiness || (canManageCocheraConfig && isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isCocheraMode) {
    return (
      <>
        <MobileSlot name="header:left" priority={10}>
          {backButton}
        </MobileSlot>

        <MobileSlot name="header:center" priority={10}>
          {headerTitle}
        </MobileSlot>

        <MobilePage.Root maxWidth="md">
          <div data-testid="cochera-config-restricted" className="text-center space-y-4 py-12">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
              <CarFront className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Modo no disponible</h2>
              <p className="text-sm text-muted-foreground">
                Esta configuración solo está disponible para negocios tipo cochera.
              </p>
            </div>
          </div>
        </MobilePage.Root>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <MobileSlot name="header:left" priority={10}>
          {backButton}
        </MobileSlot>

        <MobileSlot name="header:center" priority={10}>
          {headerTitle}
        </MobileSlot>

        <MobilePage.Root maxWidth="md">
            <div data-testid="cochera-config-restricted" className="text-center space-y-4 py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Acceso restringido</h2>
                <p className="text-sm text-muted-foreground">
                  Solo un administrador del negocio puede editar la configuración de cochera.
                </p>
              </div>
            </div>
        </MobilePage.Root>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MobileSlot name="header:left" priority={10}>
          {backButton}
        </MobileSlot>

        <MobileSlot name="header:center" priority={10}>
          {headerTitle}
        </MobileSlot>

        <MobilePage.Root maxWidth="md">
            <div className="text-center space-y-4 py-12">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Error al cargar</h2>
                <p className="text-sm text-muted-foreground">
                  No se pudieron cargar los ajustes. Intenta de nuevo.
                </p>
              </div>
            </div>
        </MobilePage.Root>
      </>
    );
  }

  const defaultValues: CocheraSettingsFormData | undefined = settings
    ? {
        displayName: settings.displayName ?? undefined,
        displayAddress: settings.displayAddress ?? undefined,
        hourlyRate: decimalStringOrZero(settings.hourlyRate),
        dailyRate: decimalStringOrNull(settings.dailyRate),
        graceMinutes: String(settings.graceMinutes) as unknown as number,
        totalSpaces: String(settings.totalSpaces) as unknown as number,
        hourlyBillingEnabled: settings.hourlyBillingEnabled,
        hourlyBaseRate: decimalStringOrZero(settings.hourlyBaseRate),
        hourlyBaseHours: String(settings.hourlyBaseHours) as unknown as number,
        extraHourRate: decimalStringOrZero(settings.extraHourRate),
        defaultPaymentTiming: settings.defaultPaymentTiming,
        acceptedPaymentMethods: settings.acceptedPaymentMethods,
        vehicleTypes: settings.vehicleTypes.map((type) => ({
          ...type,
          pricing: type.pricing
            ? {
                ...type.pricing,
                dailyRate: type.pricing.dailyRate ?? null,
              }
            : null,
        })),
      }
    : undefined;

  return (
    <>
      <MobileSlot name="header:left" priority={10}>
        {backButton}
      </MobileSlot>

      <MobileSlot name="header:center" priority={10}>
        {headerTitle}
      </MobileSlot>

      <MobilePage.Root maxWidth="md">
          <div
            className="space-y-6"
            style={{
              paddingBottom:
                "calc(var(--shell-bottom-nav-height, 0px) + var(--shell-safe-area-bottom, env(safe-area-inset-bottom)) + 5.5rem)",
            }}
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto">
                <CarFront className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Configuración de Cochera</h2>
                <p className="text-sm text-muted-foreground">
                  Ajusta tarifas, plazas y métodos de pago
                </p>
              </div>
            </div>

            <div data-testid="cochera-config-form">
              <CocheraSettingsForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                isSubmitting={updateMutation.isPending}
              />
            </div>
          </div>
      </MobilePage.Root>
    </>
  );
}
