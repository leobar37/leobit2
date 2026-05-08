import { sql } from "drizzle-orm";

type TransactionLike = {
  execute: (query: ReturnType<typeof sql>) => Promise<Array<{ txid: string | number }>>;
};

export async function getCurrentTransactionId(
  tx: TransactionLike
): Promise<number> {
  const rows = await tx.execute(sql`select txid_current()::text as txid`);
  const txid = Number(rows[0]?.txid);

  if (!Number.isFinite(txid)) {
    throw new Error("No se pudo obtener el identificador de transaccion");
  }

  return txid;
}
