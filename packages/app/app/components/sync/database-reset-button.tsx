import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Database, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";

export function DatabaseResetButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Delete IndexedDB database
      const request = indexedDB.deleteDatabase("avileo-pg");
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      toast({
        title: "Base de datos reseteada",
        description: "La página se recargará para aplicar los cambios.",
      });

      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: "Error al resetear",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center w-full rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
      >
        <Database className="mr-2 h-4 w-4" />
        Resetear base de datos local
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            ¿Resetear base de datos?
          </DialogTitle>
          <DialogDescription className="pt-2">
            Esta acción eliminará <strong>todos los datos locales</strong>{" "}
            incluyendo:
            <ul className="mt-2 list-disc pl-5 text-sm">
              <li>Clientes no sincronizados</li>
              <li>Ventas pendientes</li>
              <li>Abonos y cobros</li>
              <li>Configuración local</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-destructive">
              Esta acción no se puede deshacer.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetear...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Sí, resetear todo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
