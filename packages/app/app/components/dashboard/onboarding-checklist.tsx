import { Link } from "react-router";
import { X, CheckCircle2, Circle, Store, Package, ShoppingCart } from "lucide-react";
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
    <Card className="mb-6 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
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
              className="p-1 rounded-full hover:bg-orange-100 transition-colors"
              aria-label="Cerrar checklist"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-500 ease-out"
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
                ? "bg-green-50 border border-green-100"
                : "bg-white border border-gray-100 hover:border-orange-200"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.completed
                  ? "bg-green-500 text-white"
                  : "bg-orange-100 text-orange-600"
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
                      item.completed ? "text-green-800" : "text-foreground"
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
                  <span className="text-sm text-green-600 font-medium">
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
