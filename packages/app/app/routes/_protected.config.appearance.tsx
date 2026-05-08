import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import {
  ArrowLeft,
  Check,
  Eye,
  Gauge,
  Loader2,
  Monitor,
  Moon,
  Save,
  Sparkles,
  Sun,
  Type,
  ZapOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { MobileSlot, MobilePage } from "~/components/mobile";
import { useTheme } from "~/components/theme";
import type { ThemeMode } from "~/components/theme";

const appearanceConfigSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  compactMode: z.boolean(),
  highContrast: z.boolean(),
  reduceMotion: z.boolean(),
  largeText: z.boolean(),
});

type AppearanceConfigFormData = z.infer<typeof appearanceConfigSchema>;

const themes: Array<{
  id: ThemeMode;
  name: string;
  description: string;
  icon: typeof Sun;
  color: string;
  bgColor: string;
}> = [
  {
    id: "light",
    name: "Claro",
    description: "Fondo limpio",
    icon: Sun,
    color: "text-orange-600 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-500/15",
  },
  {
    id: "dark",
    name: "Oscuro",
    description: "Menos brillo",
    icon: Moon,
    color: "text-indigo-600 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-500/15",
  },
  {
    id: "system",
    name: "Sistema",
    description: "Según equipo",
    icon: Monitor,
    color: "text-emerald-600 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/15",
  },
];

const accessibilityOptions: Array<{
  id: keyof Omit<AppearanceConfigFormData, "theme">;
  title: string;
  description: string;
  icon: typeof Gauge;
}> = [
  {
    id: "compactMode",
    title: "Modo compacto",
    description: "Reduce espacio entre filas y controles.",
    icon: Gauge,
  },
  {
    id: "highContrast",
    title: "Alto contraste",
    description: "Aumenta la diferencia entre texto y fondos.",
    icon: Eye,
  },
  {
    id: "reduceMotion",
    title: "Reducir animaciones",
    description: "Minimiza transiciones y efectos de movimiento.",
    icon: ZapOff,
  },
  {
    id: "largeText",
    title: "Texto grande",
    description: "Aumenta el tamaño de lectura en la app.",
    icon: Type,
  },
];

export default function AppearanceConfigPage() {
  const { mode, setMode } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AppearanceConfigFormData>({
    resolver: zodResolver(appearanceConfigSchema),
    defaultValues: {
      theme: mode,
      compactMode: false,
      highContrast: false,
      reduceMotion: false,
      largeText: false,
    },
  });

  const onSubmit = async (data: AppearanceConfigFormData) => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const currentTheme = form.watch("theme");

  const handleThemeChange = (themeId: ThemeMode) => {
    form.setValue("theme", themeId);
    setMode(themeId);
  };

  return (
    <>
      <MobileSlot name="header:left" priority={10}>
        <Link
          to="/config"
          className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 pointer-events-none" />
        </Link>
      </MobileSlot>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate font-bold text-lg tracking-tight">Apariencia</h1>
      </MobileSlot>

      <MobilePage.Root maxWidth="md" className="space-y-4">
        <div className="space-y-5 pb-3">
          <div className="rounded-[24px] border border-border/70 bg-card/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#151821]">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                  Personalización
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  Apariencia de Avileo
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Ajusta el tema visual y las preferencias de lectura para usar
                  la app con más comodidad.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Tema
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Elige cómo quieres ver la aplicación.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Actual: {themes.find((theme) => theme.id === currentTheme)?.name}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  const isSelected = currentTheme === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme.id)}
                      className={cn(
                        "relative flex min-h-[126px] flex-col items-start gap-3 rounded-[20px] border p-3 text-left transition-colors",
                        isSelected
                          ? "border-orange-500 bg-orange-500 text-white shadow-sm dark:border-orange-400 dark:bg-orange-500"
                          : "border-border/80 bg-card text-foreground hover:border-orange-300/80 hover:bg-muted/40 dark:border-white/10 dark:bg-[#151821] dark:hover:bg-white/[0.06]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl",
                          isSelected ? "bg-white/15" : theme.bgColor
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            isSelected ? "text-white" : theme.color
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {theme.name}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs leading-4",
                            isSelected
                              ? "text-orange-50/90"
                              : "text-muted-foreground"
                          )}
                        >
                          {theme.description}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-orange-600">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Accesibilidad
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preferencias visuales para trabajar más cómodo.
                </p>
              </div>

              <div className="space-y-2">
                {accessibilityOptions.map((option) => {
                  const Icon = option.icon;
                  const checked = form.watch(option.id);
                  const toggleOption = () => form.setValue(option.id, !checked);

                  return (
                    <div
                      key={option.id}
                      role="button"
                      tabIndex={0}
                      className="flex items-center gap-3 rounded-[20px] border border-border/80 bg-card p-3 shadow-sm dark:border-white/10 dark:bg-[#151821]"
                      onClick={toggleOption}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleOption();
                        }
                      }}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground dark:bg-white/[0.06]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{option.title}</p>
                        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      <div onClick={(event) => event.stopPropagation()}>
                        <Switch
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            form.setValue(option.id, nextChecked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-orange-500 font-semibold text-white shadow-sm hover:bg-orange-600"
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
        </div>
      </MobilePage.Root>
    </>
  );
}
