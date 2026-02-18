import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  CreditCard,
  Save,
  Loader2,
  Smartphone,
  Building2,
  Wallet,
  QrCode,
} from "lucide-react";
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
import {
  usePaymentMethodsConfig,
  useUpdatePaymentMethodsConfig,
} from "~/hooks/use-payment-methods-config";

const METHOD_DEFINITIONS = [
  {
    id: "efectivo" as const,
    name: "Efectivo",
    icon: Wallet,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: "yape" as const,
    name: "Yape",
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    id: "plin" as const,
    name: "Plin",
    icon: QrCode,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "transferencia" as const,
    name: "Transferencia",
    icon: Building2,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    id: "tarjeta" as const,
    name: "Tarjeta",
    icon: CreditCard,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
];

export default function PaymentMethodsConfigPage() {
  const { data: config, isLoading } = usePaymentMethodsConfig();
  const updateMutation = useUpdatePaymentMethodsConfig();
  
  const [methods, setMethods] = useState<Record<string, any>>({});
  const [editingMethod, setEditingMethod] = useState<string | null>(null);

  useEffect(() => {
    if (config?.methods) {
      setMethods(config.methods);
    }
  }, [config]);

  const toggleMethod = (id: string) => {
    setMethods((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const updateMethodDetails = (id: string, field: string, value: string) => {
    setMethods((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync(methods as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Métodos de Pago</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Configurar Métodos de Pago</CardTitle>
              <CardDescription>
                Activa y configura los métodos de pago que aceptas
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {METHOD_DEFINITIONS.map((methodDef) => {
                const methodData = methods[methodDef.id] || { enabled: false };
                const isEditing = editingMethod === methodDef.id;

                return (
                  <div
                    key={methodDef.id}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      methodData.enabled
                        ? "border-orange-200 bg-orange-50/50"
                        : "border-gray-100 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 ${methodDef.bgColor} rounded-xl flex items-center justify-center`}
                        >
                          <methodDef.icon
                            className={`h-5 w-5 ${methodDef.color}`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{methodDef.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {methodData.enabled ? "Activo" : "Desactivado"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {methodData.enabled && methodDef.id !== "efectivo" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                            onClick={() =>
                              setEditingMethod(isEditing ? null : methodDef.id)
                            }
                          >
                            {isEditing ? "Cerrar" : "Configurar"}
                          </Button>
                        )}
                        <Switch
                          checked={methodData.enabled}
                          onCheckedChange={() => toggleMethod(methodDef.id)}
                        />
                      </div>
                    </div>

                    {isEditing && methodData.enabled && (
                      <div className="mt-4 pt-4 border-t border-orange-200 space-y-3">
                        {(methodDef.id === "yape" || methodDef.id === "plin") && (
                          <>
                            <FormInput
                              label="Número de celular"
                              placeholder="999 999 999"
                              value={methodData.phone || ""}
                              onChange={(e) =>
                                updateMethodDetails(
                                  methodDef.id,
                                  "phone",
                                  e.target.value
                                )
                              }
                            />
                            <FormInput
                              label="Nombre del titular"
                              placeholder="Nombre completo"
                              value={methodData.accountName || ""}
                              onChange={(e) =>
                                updateMethodDetails(
                                  methodDef.id,
                                  "accountName",
                                  e.target.value
                                )
                              }
                            />
                          </>
                        )}

                        {methodDef.id === "transferencia" && (
                          <>
                            <FormInput
                              label="Banco"
                              placeholder="Nombre del banco"
                              value={methodData.bank || ""}
                              onChange={(e) =>
                                updateMethodDetails(
                                  methodDef.id,
                                  "bank",
                                  e.target.value
                                )
                              }
                            />
                            <FormInput
                              label="Número de cuenta"
                              placeholder="0000 0000 0000 0000"
                              value={methodData.accountNumber || ""}
                              onChange={(e) =>
                                updateMethodDetails(
                                  methodDef.id,
                                  "accountNumber",
                                  e.target.value
                                )
                              }
                            />
                            <FormInput
                              label="CCI (Código de Cuenta Interbancario)"
                              placeholder="00200000000000000000"
                              value={methodData.cci || ""}
                              onChange={(e) =>
                                updateMethodDetails(
                                  methodDef.id,
                                  "cci",
                                  e.target.value
                                )
                              }
                            />
                            <FormInput
                              label="Titular de la cuenta"
                              placeholder="Nombre completo"
                              value={methodData.accountName || ""}
                              onChange={(e) =>
                                updateMethodDetails(
                                  methodDef.id,
                                  "accountName",
                                  e.target.value
                                )
                              }
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200"
              >
                {updateMutation.isPending ? (
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
