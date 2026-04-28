import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Save,
  Loader2,
  Smartphone,
  Building2,
  Wallet,
  QrCode,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  usePaymentMethodsConfig,
  useUpdatePaymentMethodsConfig,
  type PaymentMethodsConfig,
} from "~/hooks/use-payment-methods-config";
import { useUploadFile, validateFile } from "~/hooks/use-files";

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

interface QRUploadProps {
  methodId: string;
  qrImageUrl?: string;
  onQRImageChange: (methodId: string, url: string | undefined) => void;
}

function QRImageUpload({ methodId, qrImageUrl, onQRImageChange }: QRUploadProps) {
  const uploadFile = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile.mutateAsync(file);
      const fileUrl = `/api/files/${result.id}`;
      onQRImageChange(methodId, fileUrl);
      toast.success("Código QR subido correctamente");
    } catch (error) {
      toast.error("Error al subir el código QR");
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onQRImageChange(methodId, undefined);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Código QR (opcional)</label>
      
      {qrImageUrl ? (
        <div className="relative">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
            <img
              src={qrImageUrl}
              alt="Código QR"
              className="max-h-48 mx-auto object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 rounded-full h-8 w-8 p-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Los clientes podrán escanear este código para pagar
          </p>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            ) : (
              <>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Upload className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Subir código QR
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG o WEBP (máx. 5MB)
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentMethodsConfigPage() {
  const { data: config, isLoading } = usePaymentMethodsConfig();
  const updateMutation = useUpdatePaymentMethodsConfig();
  
  const [methods, setMethods] = useState<PaymentMethodsConfig["methods"] | null>(null);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);

  useEffect(() => {
    if (config?.methods) {
      setMethods(config.methods);
    }
  }, [config]);

  const toggleMethod = (id: string) => {
    setMethods((prev) => {
      if (!prev) return prev;
      const method = prev[id as keyof typeof prev];
      if (!method) return prev;
      return {
        ...prev,
        [id]: { ...method, enabled: !method.enabled },
      };
    });
  };

  const updateMethodDetails = (id: string, field: string, value: string | undefined) => {
    setMethods((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [id]: { ...prev[id as keyof typeof prev], [field]: value },
      };
    });
  };

  const handleQRImageChange = (methodId: string, url: string | undefined) => {
    setMethods((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [methodId]: { ...prev[methodId as keyof typeof prev], qrImageUrl: url },
      };
    });
  };

  const handleSave = async () => {
    if (!methods) return;
    try {
      await updateMutation.mutateAsync(methods);
      toast.success("Métodos de pago guardados correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message || "Error al guardar los métodos de pago");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                const methodData = methods?.[methodDef.id] || { enabled: false };
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
                            <div className="space-y-2">
                              <Label>Número de celular</Label>
                              <Input
                                placeholder="999 999 999"
                                value={methodData.phone || ""}
                                onChange={(e) =>
                                  updateMethodDetails(
                                    methodDef.id,
                                    "phone",
                                    e.target.value
                                  )
                                }
                                className="shell-field h-12 rounded-[16px] px-4"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Nombre del titular</Label>
                              <Input
                                placeholder="Nombre completo"
                                value={methodData.accountName || ""}
                                onChange={(e) =>
                                  updateMethodDetails(
                                    methodDef.id,
                                    "accountName",
                                    e.target.value
                                  )
                                }
                                className="shell-field h-12 rounded-[16px] px-4"
                              />
                            </div>
                            <QRImageUpload
                              methodId={methodDef.id}
                              qrImageUrl={methodData.qrImageUrl}
                              onQRImageChange={handleQRImageChange}
                            />
                          </>
                        )}

                        {methodDef.id === "transferencia" && (
                          <>
                            <div className="space-y-2">
                              <Label>Banco</Label>
                              <Input
                                placeholder="Nombre del banco"
                                value={methodData.bank || ""}
                                onChange={(e) =>
                                  updateMethodDetails(
                                    methodDef.id,
                                    "bank",
                                    e.target.value
                                  )
                                }
                                className="shell-field h-12 rounded-[16px] px-4"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Número de cuenta</Label>
                              <Input
                                placeholder="0000 0000 0000 0000"
                                value={methodData.accountNumber || ""}
                                onChange={(e) =>
                                  updateMethodDetails(
                                    methodDef.id,
                                    "accountNumber",
                                    e.target.value
                                  )
                                }
                                className="shell-field h-12 rounded-[16px] px-4"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>CCI (Código de Cuenta Interbancario)</Label>
                              <Input
                                placeholder="00200000000000000000"
                                value={methodData.cci || ""}
                                onChange={(e) =>
                                  updateMethodDetails(
                                    methodDef.id,
                                    "cci",
                                    e.target.value
                                  )
                                }
                                className="shell-field h-12 rounded-[16px] px-4"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Titular de la cuenta</Label>
                              <Input
                                placeholder="Nombre completo"
                                value={methodData.accountName || ""}
                                onChange={(e) =>
                                  updateMethodDetails(
                                    methodDef.id,
                                    "accountName",
                                    e.target.value
                                  )
                                }
                                className="shell-field h-12 rounded-[16px] px-4"
                              />
                            </div>
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
