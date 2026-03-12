import { isChangeMessage, type Message, type Row } from "@electric-sql/client";
import type { Txid } from "@tanstack/electric-db-collection";

/**
 * Creates a match function to wait for an INSERT operation
 */
export function matchInsert<T extends Row>(
  id: string | number
): (message: Message<T>) => boolean {
  return (message: Message<T>): boolean =>
    isChangeMessage(message) &&
    message.headers.operation === "insert" &&
    message.value.id === id;
}

/**
 * Creates a match function to wait for an UPDATE operation
 */
export function matchUpdate<T extends Row>(
  id: string | number
): (message: Message<T>) => boolean {
  return (message: Message<T>): boolean =>
    isChangeMessage(message) &&
    message.headers.operation === "update" &&
    message.value.id === id;
}

/**
 * Creates a match function to wait for a DELETE operation
 */
export function matchDelete<T extends Row>(
  id: string | number
): (message: Message<T>) => boolean {
  return (message: Message<T>): boolean =>
    isChangeMessage(message) &&
    message.headers.operation === "delete" &&
    message.value.id === id;
}

/**
 * Creates a match function to wait for a specific transaction ID
 */
export function matchByTxid<T extends Row>(
  expectedTxid: Txid
): (message: Message<T>) => boolean {
  return (message: Message<T>): boolean =>
    isChangeMessage(message) &&
    (message.headers as Record<string, unknown>).txid === expectedTxid;
}

/**
 * Default timeout for awaitMatch calls (in milliseconds)
 */
export const AWAIT_MATCH_TIMEOUT = 5000;
