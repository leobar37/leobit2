import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { ArrowLeft, Moon, Save, Loader2, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { cn } from "~/lib/utils";

const appearanceConfigSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  compactMode: z.boolean(),
  highContrast: z.boolean(),
  reduceMotion: z.boolean(),
  largeText: z.boolean(),
});

type AppearanceConfigFormData = z.infer<typeof appearanceConfigSchema>;

const themes = [
  { id: "light" as const, name: "Claro", icon: Sun, color: "text-orange-600", bgColor: "bg-orange-100" },
  { id: "dark" as const, name: "Oscuro", icon: Moon, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  { id: "system" as const, name: "Sistema", icon: Monitor, color: "text-green-600", bgColor: "bg-green-100" },
];

export default function AppearanceConfigPage() {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AppearanceConfigFormData>({
    resolver: zodResolver(appearanceConfigSchema),
    defaultValues: {
      theme: "light",
      compactMode: false,
      highContrast: false,
      reduceMotion: false,
      largeText: false,
    },
  });

  const onSubmit = async (data: AppearanceConfigFormData) => {
    setIsSaving(true);
    console.log("Appearance config:", data);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const currentTheme = form.watch("theme");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Apariencia</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <Moon className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle>Configuracion de Apariencia</CardTitle>
              <CardDescription>
                Personaliza el tema y la visualizacion de la aplicacion
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Tema
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((theme) => {
                      const Icon = theme.icon;
                      const isSelected = currentTheme === theme.id;
                      
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => form.setValue("theme", theme.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                            isSelected
                              ? "border-orange-200 bg-orange-50"
                              : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", theme.bgColor)}>
                            <Icon className={cn("h-5 w-5", theme.color)} />
                          </div>
                          <span className="text-sm font-medium">{theme.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Accesibilidad
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Modo compacto</p>
                        <p className="text-sm text-muted-foreground">
                          Reduce el espacio entre elementos
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.watch("compactMode")}
                        onChange={(e) => form.setValue("compactMode", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Alto contraste</p>
                        <p className="text-sm text-muted-foreground">
                          Aumenta el contraste de colores
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.watch("highContrast")}
                        onChange={(e) => form.setValue("highContrast", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Reducir animaciones</p>
                        <p className="text-sm text-muted-foreground">
                          Minimiza los efectos de transicion
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.watch("reduceMotion")}
                        onChange={(e) => form.setValue("reduceMotion", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Texto grande</p>
                        <p className="text-sm text-muted-foreground">
                          Aumenta el tamano de la fuente
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.watch("largeText")}
                        onChange={(e) => form.setValue("largeText", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>
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
