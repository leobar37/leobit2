import { Link } from "react-router";
import { X, CheckCircle2, Store, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface OnboardingChecklistProps {
  hasProducts: boolean;
  hasSales: boolean;
  userName?: string;
  onCreateSale?: () => void;
}

const CHECKLIST_DISMISSED_KEY = "avileo:onboarding-checklist-dismissed";
const CHECKLIST_COMPLETED_KEY = "avileo:onboarding-checklist-completed";

export function OnboardingChecklist({ hasProducts, hasSales, userName, onCreateSale }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "true";
    const completed = localStorage.getItem(CHECKLIST_COMPLETED_KEY) === "true";
    
    if (!dismissed && !completed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  const items = [
    {
      id: "business_created",
      label: "Negocio creado",
      description: "Tu negocio está configurado y listo",
      completed: true,
      actionLabel: "Ver",
      actionHref: "/config",
      icon: Store,
    },
    {
      id: "first_product",
      label: "Agregar tu primer producto",
      description: "Ej: Pollo entero, medio pollo, etc.",
      completed: hasProducts,
      actionLabel: hasProducts ? "Listo" : "Hacer ahora",
      actionHref: "/productos/nuevo",
      icon: Package,
    },
    {
      id: "first_sale",
      label: "Registrar tu primera venta",
      description: "Empieza a registrar tus ventas diarias",
      completed: hasSales,
      actionLabel: hasSales ? "Listo" : "Empezar",
      actionHref: "/ventas/nueva",
      icon: ShoppingCart,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const allCompleted = completedCount === totalCount;

  useEffect(() => {
    if (allCompleted && isVisible) {
      localStorage.setItem(CHECKLIST_COMPLETED_KEY, "true");
    }
  }, [allCompleted, isVisible]);

  if (!isVisible || isDismissed || allCompleted) {
    return null;
  }

  return (
    <Card className="shell-card mb-6 overflow-hidden rounded-[28px] border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,248,240,0.96)_0%,rgba(255,255,255,0.9)_100%)] dark:border-orange-500/20 dark:bg-[linear-gradient(180deg,rgba(35,30,28,0.96)_0%,rgba(24,26,32,0.92)_100%)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              ¡Bienvenido{userName ? `, ${userName}` : ""}!
            </h2>
            <p className="text-sm text-muted-foreground">
              Completa estos pasos para activar tu negocio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-orange-600">
              {completedCount}/{totalCount}
            </span>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 transition-colors hover:bg-orange-100/80 dark:hover:bg-white/10"
              aria-label="Cerrar checklist"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full bg-orange-500 transition-all duration-500 ease-out dark:bg-orange-400"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
              item.completed
                ? "border border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                : "border border-black/5 bg-white/70 hover:border-orange-200 dark:border-white/8 dark:bg-white/[0.04] dark:hover:border-orange-400/30"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.completed
                  ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950"
                  : "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="text-sm font-bold">{index + 1}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3
                    className={`font-medium ${
                      item.completed ? "text-emerald-800 dark:text-emerald-200" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                {!item.completed && (
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => {
                      if (item.id === "first_sale" && onCreateSale) {
                        onCreateSale();
                      }
                    }}
                    asChild={item.id !== "first_sale"}
                  >
                    {item.id === "first_sale" ? (
                      item.actionLabel
                    ) : (
                      <Link to={item.actionHref}>{item.actionLabel}</Link>
                    )}
                  </Button>
                )}
                {item.completed && (
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    Listo
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
