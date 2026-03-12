import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { distribucionSchema, type Distribucion } from "../schema";
import { api } from "~/lib/api-client";
import { createShapeOptions } from "./utils";

/**
 * Distribucion Collection
 * Supports offline-first sync for daily distribution assignments to vendors
 *
 * Operations:
 * - onInsert: Create new distribution (admin only)
 * - onUpdate: Update distribution (puntoVenta)
 * - onDelete: Delete distribution (admin only)
 *
 * Note: Close operation is handled via backend API directly (not offline sync)
 * since it requires server-side inventory return logic.
 */
export const distribucionCollection = createCollection(
  // @ts-ignore - electricCollectionOptions types are not fully aligned across TanStack DB versions
  electricCollectionOptions({
    id: "distribuciones",
    schema: distribucionSchema,
    getKey: (distribucion) => distribucion.id,
    shapeOptions: createShapeOptions("distribuciones"),
    syncMode: "eager",
    startSync: true,
    onInsert: async ({ transaction }) => {
      const newDistribucion = transaction.mutations[0].modified as Distribucion;

      const payload: any = {
        vendedorId: newDistribucion.vendedorId,
        puntoVenta: newDistribucion.puntoVenta,
        fecha: newDistribucion.fecha,
        modo: newDistribucion.modo || "estricto",
        confiarEnVendedor: newDistribucion.confiarEnVendedor || false,
        items: [],
      };

      const response = await api.distribuciones.post(payload);

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { data: { id: string; txid?: number } };
      const txid = data?.data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }

      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0] as {
        original: Distribucion;
        changes: Partial<Distribucion>;
      };

      // Handle puntoVenta update
      if (changes.puntoVenta && changes.puntoVenta !== original.puntoVenta) {
        const response = await api.distribuciones({ id: original.id }).put({
          puntoVenta: changes.puntoVenta,
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        const txid = data?.txid;
        if (!txid) {
          throw new Error("No txid returned from server");
        }

        return { txid };
      }

      // Handle estado change (cerrar)
      if (changes.estado === "cerrado" && original.estado !== "cerrado") {
        const response = await api.distribuciones({ id: original.id }).put({
          estado: "cerrado",
        });

        if (response.error) {
          throw new Error(String(response.error.value));
        }

        const data = response.data as { txid?: number };
        const txid = data?.txid;
        if (!txid) {
          throw new Error("No txid returned from server");
        }

        return { txid };
      }

      // Regular update
      const response = await api.distribuciones({ id: original.id }).put({
        puntoVenta: changes.puntoVenta,
        kilosAsignados: changes.kilosAsignados
          ? parseFloat(changes.kilosAsignados)
          : undefined,
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      const data = response.data as { txid?: number };
      const txid = data?.txid;
      if (!txid) {
        throw new Error("No txid returned from server");
      }

      return { txid };
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0] as { original: Distribucion };

      const response = await api.distribuciones({ id: original.id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
  })
);
