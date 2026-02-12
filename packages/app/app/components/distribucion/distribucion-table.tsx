import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import type { Distribucion } from "~/hooks/use-distribuciones";

interface DistribucionTableProps {
  distribuciones: Distribucion[];
  onEdit: (distribucion: Distribucion) => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function DistribucionTable({
  distribuciones,
  onEdit,
  onClose,
  onDelete,
  isLoading,
}: DistribucionTableProps) {
  const getStatusBadge = (estado: Distribucion["estado"]) => {
    const variants = {
      activo: { variant: "default" as const, label: "Activo" },
      "en_ruta": { variant: "secondary" as const, label: "En ruta" },
      cerrado: { variant: "outline" as const, label: "Cerrado" },
    };

    const config = variants[estado];

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.label}
      </Badge>
    );
  };

  const formatKilos = (value: number) => `${value.toFixed(1)} kg`;

  if (isLoading) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Cargando distribuciones...
      </div>
    );
  }

  if (distribuciones.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No hay distribuciones para mostrar
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendedor</TableHead>
            <TableHead>Punto de Venta</TableHead>
            <TableHead className="text-right">Asignado</TableHead>
            <TableHead className="text-right">Vendido</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribuciones.map((dist) => (
            <TableRow key={dist.id}>
              <TableCell className="font-medium">{dist.vendedorName}</TableCell>
              <TableCell>{dist.puntoVenta}</TableCell>
              <TableCell className="text-right">
                {formatKilos(dist.kilosAsignados)}
              </TableCell>
              <TableCell className="text-right">
                {formatKilos(dist.kilosVendidos)}
              </TableCell>
              <TableCell>{getStatusBadge(dist.estado)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(dist)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {dist.estado !== "cerrado" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onClose(dist.id)}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDelete(dist.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
