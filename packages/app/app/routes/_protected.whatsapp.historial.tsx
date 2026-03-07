import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  History,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useWhatsAppMessages,
  useRetryWhatsAppMessage,
  type MessageStatus,
} from "~/hooks/use-whatsapp-messages";
import { formatDate } from "~/lib/formatting";

export default function WhatsAppHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MessageStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, refetch } = useWhatsAppMessages({
    status: status === "all" ? undefined : status,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 50,
  });

  const retryMutation = useRetryWhatsAppMessage();

  const handleRetry = async (messageId: string) => {
    try {
      await retryMutation.mutateAsync(messageId);
      toast.success("Mensaje reenviado correctamente");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al reenviar el mensaje";
      toast.error(message);
    }
  };

  const getStatusBadge = (status: MessageStatus) => {
    if (status === "enviado") {
      return (
        <Badge
          variant="default"
          className="rounded-full bg-green-100 text-green-700 hover:bg-green-100"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Enviado
        </Badge>
      );
    }
    return (
      <Badge
        variant="default"
        className="rounded-full bg-red-100 text-red-700 hover:bg-red-100"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Fallido
      </Badge>
    );
  };

  const messages = data?.messages || [];
  const total = data?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config/whatsapp">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">
            Historial de Mensajes
          </span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                    <History className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle>Historial de Mensajes</CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    {isLoading ? (
                      "Cargando..."
                    ) : (
                      <>
                        {total} mensaje{total !== 1 ? "s" : ""} enviado
                        {total !== 1 ? "s" : ""}
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="rounded-xl"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente o teléfono..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={status === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatus("all")}
                      className="rounded-xl"
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Todos
                    </Button>
                    <Button
                      variant={status === "enviado" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatus("enviado")}
                      className="rounded-xl"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Enviados
                    </Button>
                    <Button
                      variant={status === "fallido" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatus("fallido")}
                      className="rounded-xl"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Fallidos
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="rounded-xl"
                      placeholder="Desde"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="rounded-xl"
                      placeholder="Hasta"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                      <MessageSquare className="h-10 w-10 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">No hay mensajes</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Los mensajes enviados aparecerán aquí
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 bg-gray-50 rounded-2xl border border-gray-100"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {message.customer?.name || "Cliente desconocido"}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{message.phoneNumber}</span>
                                </div>
                              </div>
                            </div>

                            <div className="ml-10">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                                {message.messageContent}
                              </p>

                              {message.template?.name && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="rounded-full text-xs">
                                    {message.template.name}
                                  </Badge>
                                </div>
                              )}

                              {message.errorMessage && (
                                <p className="text-xs text-red-600 mt-2">
                                  Error: {message.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {getStatusBadge(message.status)}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(new Date(message.sentAt))}
                            </p>
                            {message.status === "fallido" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetry(message.id)}
                                disabled={retryMutation.isPending}
                                className="h-8 mt-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                {retryMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                )}
                                Reintentar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
