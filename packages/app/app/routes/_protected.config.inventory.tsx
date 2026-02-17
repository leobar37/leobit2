import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowLeft, Package, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const inventoryConfigSchema = z.object({
  stockMinimo: z.string().optional(),
  alertaStockBajo: z.boolean(),
  controlarPorKilos: z.boolean(),
  permitirVentaSinStock: z.boolean(),
  alertasPorEmail: z.boolean(),
});

type InventoryConfigFormData = z.infer<typeof inventoryConfigSchema>;

export default function InventoryConfigPage() {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<InventoryConfigFormData>({
    resolver: zodResolver(inventoryConfigSchema),
    defaultValues: {
      stockMinimo: "10",
      alertaStockBajo: true,
      controlarPorKilos: true,
      permitirVentaSinStock: false,
      alertasPorEmail: true,
    },
  });

  const onSubmit = async (data: InventoryConfigFormData) => {
    setIsSaving(true);
    console.log("Inventory config:", data);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Inventario</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Configuración de Inventario</CardTitle>
              <CardDescription>
                Gestiona las alertas y controles de stock
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Alertas de Stock
                  </h3>

                  <FormInput
                    label="Stock mínimo de alerta"
                    type="number"
                    placeholder="10"
                    {...form.register("stockMinimo")}
                  />
                  <p className="text-sm text-muted-foreground -mt-2">
                    Cantidad mínima antes de mostrar alerta
                  </p>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Alertas de stock bajo</p>
                      <p className="text-sm text-muted-foreground">
                        Notificar cuando el stock esté por debajo del mínimo
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("alertaStockBajo")}
                      onCheckedChange={(checked) =>
                        form.setValue("alertaStockBajo", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Control de Ventas
                  </h3>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Controlar por kilos</p>
                      <p className="text-sm text-muted-foreground">
                        Seguimiento detallado por peso
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("controlarPorKilos")}
                      onCheckedChange={(checked) =>
                        form.setValue("controlarPorKilos", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Permitir ventas sin stock</p>
                      <p className="text-sm text-muted-foreground">
                        Vender aunque no haya stock disponible
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("permitirVentaSinStock")}
                      onCheckedChange={(checked) =>
                        form.setValue("permitirVentaSinStock", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Notificaciones
                  </h3>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Alertas por email</p>
                      <p className="text-sm text-muted-foreground">
                        Recibir notificaciones en tu correo
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("alertasPorEmail")}
                      onCheckedChange={(checked) =>
                        form.setValue("alertasPorEmail", checked)
                      }
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
