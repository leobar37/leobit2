import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { syncClient } from "~/lib/sync/client";
import { createSyncId, isOnline } from "~/lib/sync/utils";

export interface Distribucion {
  id: string;
  vendedorId: string;
  vendedorName: string;
  puntoVenta: string;
  kilosAsignados: number;
  kilosVendidos: number;
  montoRecaudado: number;
  estado: "activo" | "en_ruta" | "cerrado";
  fecha: Date;
  syncStatus: "pending" | "synced" | "error";
  createdAt: Date;
  updatedAt: Date;
}

export interface DistribucionFilters {
  fecha?: string;
  vendedorId?: string;
  estado?: "activo" | "en_ruta" | "cerrado";
  limit?: number;
  offset?: number;
}

export interface CreateDistribucionInput {
  vendedorId: string;
  puntoVenta: string;
  kilosAsignados: number;
  fecha?: string;
}

export interface UpdateDistribucionInput {
  puntoVenta?: string;
  kilosAsignados?: number;
  estado?: "activo" | "en_ruta" | "cerrado";
}

export interface StockDisponibleResult {
  disponible: number;
  asignado: number;
  vendido: number;
}

async function getDistribuciones(
  filters?: DistribucionFilters
): Promise<Distribucion[]> {
  const { data, error } = await api.distribuciones.get({
    query: filters as Record<string, string>,
  });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Distribucion[];
}

async function getDistribucion(id: string): Promise<Distribucion> {
  const { data, error } = await api.distribuciones({ id }).get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Distribucion;
}

async function getMiDistribucion(fecha?: string): Promise<Distribucion | null> {
  const { data, error } = await api.distribuciones.mine.get({
    query: fecha ? { fecha } : {},
  });

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Distribucion | null;
}

async function getStockDisponible(
  id: string
): Promise<StockDisponibleResult> {
  const { data, error } = await api.distribuciones({ id }).stock.get();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as StockDisponibleResult;
}

async function createDistribucion(
  input: CreateDistribucionInput
): Promise<Distribucion> {
  if (!isOnline()) {
    const tempId = createSyncId();

    await syncClient.enqueueOperation({
      entity: "distribuciones",
      operation: "insert",
      entityId: tempId,
      data: {
        ...input,
      },
      lastError: undefined,
    });

    const now = new Date();
    return {
      id: tempId,
      vendedorId: input.vendedorId,
      vendedorName: "",
      puntoVenta: input.puntoVenta,
      kilosAsignados: input.kilosAsignados,
      kilosVendidos: 0,
      montoRecaudado: 0,
      estado: "activo",
      fecha: input.fecha ? new Date(input.fecha) : new Date(),
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };
  }

  const { data, error } = await api.distribuciones.post(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Distribucion;
}

async function updateDistribucion({
  id,
  ...input
}: UpdateDistribucionInput & { id: string }): Promise<Distribucion> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "distribuciones",
      operation: "update",
      entityId: id,
      data: {
        ...input,
      },
      lastError: undefined,
    });

    const now = new Date();
    return {
      id,
      vendedorId: "",
      vendedorName: "",
      puntoVenta: input.puntoVenta ?? "",
      kilosAsignados: input.kilosAsignados ?? 0,
      kilosVendidos: 0,
      montoRecaudado: 0,
      estado: input.estado ?? "activo",
      fecha: new Date(),
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };
  }

  const { data, error } = await api.distribuciones({ id }).put(input);

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Distribucion;
}

async function closeDistribucion(id: string): Promise<Distribucion> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "distribuciones",
      operation: "update",
      entityId: id,
      data: {
        estado: "cerrado",
      },
      lastError: undefined,
    });

    const now = new Date();
    return {
      id,
      vendedorId: "",
      vendedorName: "",
      puntoVenta: "",
      kilosAsignados: 0,
      kilosVendidos: 0,
      montoRecaudado: 0,
      estado: "cerrado",
      fecha: new Date(),
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };
  }

  const { data, error } = await api.distribuciones({ id }).close.patch();

  if (error) {
    throw new Error(String(error.value));
  }

  return data as unknown as Distribucion;
}

async function deleteDistribucion(id: string): Promise<void> {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "distribuciones",
      operation: "delete",
      entityId: id,
      data: {},
      lastError: undefined,
    });
    return;
  }

  const { error } = await api.distribuciones({ id }).delete();

  if (error) {
    throw new Error(String(error.value));
  }
}

export function useDistribuciones(filters?: DistribucionFilters) {
  return useQuery({
    queryKey: ["distribuciones", filters],
    queryFn: () => getDistribuciones(filters),
  });
}

export function useDistribucion(id: string) {
  return useQuery({
    queryKey: ["distribuciones", id],
    queryFn: () => getDistribucion(id),
    enabled: !!id,
  });
}

export function useMiDistribucion(fecha?: string) {
  return useQuery({
    queryKey: ["distribuciones", "mine", fecha],
    queryFn: () => getMiDistribucion(fecha),
  });
}

export function useStockDisponible(id: string) {
  return useQuery({
    queryKey: ["distribuciones", id, "stock"],
    queryFn: () => getStockDisponible(id),
    enabled: !!id,
  });
}

export function useCreateDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDistribucion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
    },
  });
}

export function useUpdateDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDistribucion,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
      queryClient.invalidateQueries({
        queryKey: ["distribuciones", variables.id],
      });
    },
  });
}

export function useCloseDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeDistribucion,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
      queryClient.invalidateQueries({ queryKey: ["distribuciones", id] });
    },
  });
}

export function useDeleteDistribucion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDistribucion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribuciones"] });
    },
  });
}
