import { useState, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  MessageCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  QrCode,
  Smartphone,
  RefreshCw,
  History,
  FileText,
  ChevronRight,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useWhatsAppStatus,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  type WhatsAppConnectResult,
} from "~/hooks/use-whatsapp-settings";
import { useOnline } from "~/hooks/use-online";

export default function WhatsAppConfigPage() {
  const [qrData, setQrData] = useState<WhatsAppConnectResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { data: status, isLoading: isStatusLoading } = useWhatsAppStatus(
    isPolling ? 5000 : 5000
  );
  const connectMutation = useConnectWhatsApp();
  const disconnectMutation = useDisconnectWhatsApp();
  const { isOnline } = useOnline();

  useEffect(() => {
    if (status?.isConnected && isPolling) {
      setIsPolling(false);
      setQrData(null);
      toast.success("¡WhatsApp conectado exitosamente!");
    }
  }, [status?.isConnected, isPolling]);

  // Auto-render QR from status if available
  useEffect(() => {
    if (status?.qrCode && !status.isConnected && !qrData) {
      setQrData({
        qrCode: status.qrCode,
        instanceName: status.instanceName || "",
      });
      setIsPolling(true);
    }
  }, [status?.qrCode, status?.isConnected, status?.instanceName, qrData]);

  const handleConnect = async () => {
    try {
      const result = await connectMutation.mutateAsync();
      setQrData(result);
      setIsPolling(true);
      toast.success("Código QR generado. Escanea con WhatsApp en tu teléfono.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al generar el código QR";
      toast.error(message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      setQrData(null);
      setIsPolling(false);
      toast.success("WhatsApp desconectado correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al desconectar WhatsApp";
      toast.error(message);
    }
  };

  const getStatusBadge = () => {
    if (isStatusLoading) {
      return (
        <Badge variant="secondary" className="rounded-full">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Verificando...
        </Badge>
      );
    }

    if (status?.isConnected) {
      return (
        <Badge
          variant="default"
          className="rounded-full bg-green-100 text-green-700 hover:bg-green-100"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Conectado
        </Badge>
      );
    }

    return (
      <Badge
        variant="secondary"
        className="rounded-full bg-red-100 text-red-700 hover:bg-red-100"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Desconectado
      </Badge>
    );
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
          <span className="font-bold text-lg text-foreground">
            Configuración WhatsApp
          </span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                {getStatusBadge()}
              </div>
              <CardTitle>WhatsApp Business</CardTitle>
              <CardDescription>
                Conecta tu WhatsApp para enviar notificaciones a tus clientes
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {status?.isConnected && status.phoneNumber && (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Número conectado
                      </p>
                      <p className="font-semibold text-green-700">
                        {status.phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!status?.isConnected && !qrData && !status?.qrCode && (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-muted/50 rounded-2xl">
                    <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Escanea el código QR con WhatsApp en tu teléfono para
                      conectar tu cuenta
                    </p>
                  </div>

                  {!isOnline && (
                    <Alert variant="destructive" className="text-left">
                      <WifiOff className="h-4 w-4" />
                      <AlertDescription>
                        Conéctate a internet para vincular WhatsApp
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleConnect}
                    disabled={connectMutation.isPending || !isOnline}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg shadow-green-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Conectar WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              )}

              {(qrData || status?.qrCode) && !status?.isConnected && (
                <div className="space-y-4">
                  <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-green-200">
                    <div className="text-center space-y-4">
                      <img
                        src={qrData?.qrCode || status?.qrCode || ""}
                        alt="WhatsApp QR Code"
                        className="mx-auto w-64 h-64"
                      />
                      <p className="text-sm text-muted-foreground">
                        Escanea este código QR con WhatsApp en tu teléfono
                      </p>
                    </div>
                  </div>

                  {isPolling && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Esperando conexión...
                    </div>
                  )}

                  <Button
                    onClick={handleConnect}
                    disabled={connectMutation.isPending || !isOnline}
                    variant="outline"
                    className="w-full h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando QR...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerar QR
                      </>
                    )}
                  </Button>
                </div>
              )}

              {status?.isConnected && (
                <>
                  {!isOnline && (
                    <Alert variant="destructive" className="text-left">
                      <WifiOff className="h-4 w-4" />
                      <AlertDescription>
                        Conéctate a internet para desvincular WhatsApp
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending || !isOnline}
                    variant="destructive"
                    className="w-full h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Desconectar WhatsApp
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">
                ¿Cómo conectar?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Abre WhatsApp en tu teléfono</li>
                <li>
                  Ve a Ajustes → Dispositivos vinculados → Vincular un
                  dispositivo
                </li>
                <li>Escanea el código QR que aparece aquí</li>
                <li>¡Listo! Tu WhatsApp está conectado</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Gestión de Mensajes</CardTitle>
              <CardDescription>
                Administra tus plantillas y revisa el historial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/config/whatsapp/templates" className="block">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Plantillas de Mensajes</p>
                    <p className="text-sm text-muted-foreground">
                      Crea y edita plantillas personalizadas
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>

              <Link to="/whatsapp/historial" className="block">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <History className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Historial de Mensajes</p>
                    <p className="text-sm text-muted-foreground">
                      Revisa mensajes enviados y reintenta fallidos
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
