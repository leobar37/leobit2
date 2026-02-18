import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowLeft, Bell, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const notificationsConfigSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  lowStockAlert: z.boolean(),
  dailySummary: z.boolean(),
  newSaleAlert: z.boolean(),
  paymentReminder: z.boolean(),
});

type NotificationsConfigFormData = z.infer<typeof notificationsConfigSchema>;

export default function NotificationsConfigPage() {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<NotificationsConfigFormData>({
    resolver: zodResolver(notificationsConfigSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      lowStockAlert: true,
      dailySummary: true,
      newSaleAlert: true,
      paymentReminder: true,
    },
  });

  const onSubmit = async (data: NotificationsConfigFormData) => {
    setIsSaving(true);
    console.log("Notifications config:", data);
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
          <span className="font-bold text-lg text-foreground">Notificaciones</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle>Configuracion de Notificaciones</CardTitle>
              <CardDescription>
                Personaliza como y cuando recibes alertas
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Canales de notificacion
                  </h3>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Notificaciones por email</p>
                      <p className="text-sm text-muted-foreground">
                        Recibe alertas en tu correo electronico
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("emailNotifications")}
                      onCheckedChange={(checked) =>
                        form.setValue("emailNotifications", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Notificaciones push</p>
                      <p className="text-sm text-muted-foreground">
                        Alertas en tiempo real en el navegador
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("pushNotifications")}
                      onCheckedChange={(checked) =>
                        form.setValue("pushNotifications", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Notificaciones SMS</p>
                      <p className="text-sm text-muted-foreground">
                        Mensajes de texto a tu celular
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("smsNotifications")}
                      onCheckedChange={(checked) =>
                        form.setValue("smsNotifications", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Tipos de alertas
                  </h3>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Stock bajo</p>
                      <p className="text-sm text-muted-foreground">
                        Alerta cuando un producto tenga poco stock
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("lowStockAlert")}
                      onCheckedChange={(checked) =>
                        form.setValue("lowStockAlert", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Resumen diario</p>
                      <p className="text-sm text-muted-foreground">
                        Reporte de ventas al final del dia
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("dailySummary")}
                      onCheckedChange={(checked) =>
                        form.setValue("dailySummary", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Nueva venta</p>
                      <p className="text-sm text-muted-foreground">
                        Notificacion cuando se registre una venta
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("newSaleAlert")}
                      onCheckedChange={(checked) =>
                        form.setValue("newSaleAlert", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Recordatorio de pago</p>
                      <p className="text-sm text-muted-foreground">
                        Alerta de cobros pendientes
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("paymentReminder")}
                      onCheckedChange={(checked) =>
                        form.setValue("paymentReminder", checked)
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
