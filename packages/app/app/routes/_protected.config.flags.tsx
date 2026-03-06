import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Calculator, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import type { CalculatorConfig } from "@avileo/shared";

interface CalculatorSectionProps {
  title: string;
  description: string;
  config: CalculatorConfig;
  onChange: (config: CalculatorConfig) => void;
}

function CalculatorSection({
  title,
  description,
  config,
  onChange,
}: CalculatorSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3 pl-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`${title}-hide-tara`}>Ocultar tara</Label>
            <p className="text-xs text-muted-foreground">
              No mostrar campo de tara en la calculadora
            </p>
          </div>
          <Switch
            id={`${title}-hide-tara`}
            checked={config.hideTara}
            onCheckedChange={(checked) =>
              onChange({ ...config, hideTara: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`${title}-autofill-price`}>
              Autocompletar precio
            </Label>
            <p className="text-xs text-muted-foreground">
              Completar automáticamente el precio al seleccionar variante
            </p>
          </div>
          <Switch
            id={`${title}-autofill-price`}
            checked={config.autoFillPrice}
            onCheckedChange={(checked) =>
              onChange({ ...config, autoFillPrice: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function FlagsConfigPage() {
  const navigate = useNavigate();
  const { settings, isLoading, updateSettings } = useBusinessSettings();

  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when settings load
  if (!localSettings && settings) {
    setLocalSettings(settings);
  }

  const handleSave = async () => {
    if (!localSettings) return;

    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      toast.success("Configuración guardada", {
        description: "Los cambios se aplicarán inmediatamente",
      });
    } catch (error) {
      toast.error("Error", {
        description: "No se pudo guardar la configuración",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateCalculatorConfig = (
    calculator: "sales" | "orders" | "purchases",
    config: CalculatorConfig
  ) => {
    if (!localSettings) return;

    setLocalSettings({
      ...localSettings,
      calculators: {
        ...localSettings.calculators,
        [calculator]: config,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate("/config")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <CardTitle className="text-2xl">Flags</CardTitle>
          <CardDescription className="text-orange-100">
            Configuración de calculadoras y features del negocio
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-0 shadow-md rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calculator className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Calculadoras</CardTitle>
              <CardDescription>
                Personaliza el comportamiento de las calculadoras
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {localSettings && (
            <>
              <CalculatorSection
                title="Ventas"
                description="Configuración para la calculadora de ventas"
                config={localSettings.calculators.sales}
                onChange={(config) => updateCalculatorConfig("sales", config)}
              />

              <div className="border-t" />

              <CalculatorSection
                title="Pedidos"
                description="Configuración para la calculadora de pedidos"
                config={localSettings.calculators.orders}
                onChange={(config) => updateCalculatorConfig("orders", config)}
              />

              <div className="border-t" />

              <CalculatorSection
                title="Compras"
                description="Configuración para la calculadora de compras"
                config={localSettings.calculators.purchases}
                onChange={(config) =>
                  updateCalculatorConfig("purchases", config)
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl"
          onClick={() => navigate("/config")}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1 rounded-xl"
          onClick={handleSave}
          disabled={isSaving || !localSettings}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
