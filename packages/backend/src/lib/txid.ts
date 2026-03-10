import { sql } from "drizzle-orm";
import { db } from "./db";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface MutationResult<T> {
  data: T;
  txid: number;
}

export async function getTxid(tx: DbTransaction): Promise<number> {
  const result = await tx.execute(sql<{ txid: string | number }>`select txid_current() as txid`);
  const txid = Number(result[0]?.txid);

  if (!Number.isInteger(txid) || txid <= 0) {
    throw new Error("Failed to resolve transaction id");
  }

  return txid;
}
