/**
 * Error handling utilities for TanStack DB collections
 * Provides consistent error messages and retry logic
 */

export interface CollectionError {
  message: string;
  shouldRetry: boolean;
  isOffline: boolean;
  isValidationError: boolean;
  isConflictError: boolean;
}

/**
 * Analyzes an error from TanStack DB/ElectricSQL and returns
 * a structured error object with user-friendly messages
 */
export function handleCollectionError(error: unknown): CollectionError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/offline errors
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("internet") ||
      message.includes("connection")
    ) {
      return {
        message: "Sin conexión a internet. Los cambios se sincronizarán automáticamente cuando vuelva la conexión.",
        shouldRetry: true,
        isOffline: true,
        isValidationError: false,
        isConflictError: false,
      };
    }

    // Validation errors (schema, required fields)
    if (
      message.includes("validation") ||
      message.includes("schema") ||
      message.includes("required") ||
      message.includes("invalid")
    ) {
      return {
        message: "Datos inválidos. Por favor verifique la información ingresada.",
        shouldRetry: false,
        isOffline: false,
        isValidationError: true,
        isConflictError: false,
      };
    }

    // Conflict errors (txid, concurrent updates)
    if (
      message.includes("txid") ||
      message.includes("conflict") ||
      message.includes("concurrent") ||
      message.includes("version")
    ) {
      return {
        message: "Conflicto de sincronización. Recargando datos actualizados...",
        shouldRetry: true,
        isOffline: false,
        isValidationError: false,
        isConflictError: true,
      };
    }

    // Not found errors
    if (message.includes("not found") || message.includes("no encontrado")) {
      return {
        message: "El registro no existe o fue eliminado.",
        shouldRetry: false,
        isOffline: false,
        isValidationError: false,
        isConflictError: false,
      };
    }

    // Permission errors
    if (
      message.includes("permission") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return {
        message: "No tiene permisos para realizar esta acción.",
        shouldRetry: false,
        isOffline: false,
        isValidationError: false,
        isConflictError: false,
      };
    }
  }

  // Default error
  return {
    message: "Error inesperado. Por favor intente nuevamente.",
    shouldRetry: true,
    isOffline: false,
    isValidationError: false,
    isConflictError: false,
  };
}

/**
 * Wraps a collection mutation with error handling
 * Returns the result or throws a user-friendly error
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  onError?: (error: CollectionError) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const collectionError = handleCollectionError(error);
    
    if (onError) {
      onError(collectionError);
    }
    
    throw new Error(collectionError.message);
  }
}

/**
 * Hook-compatible error handler for mutations
 * Usage: const { error, handleMutation } = useCollectionMutation()
 */
export function createMutationHandler() {
  let lastError: CollectionError | null = null;

  return {
    getLastError: () => lastError,
    clearError: () => {
      lastError = null;
    },
    handle: async <T>(operation: () => Promise<T>): Promise<T> => {
      try {
        lastError = null;
        return await operation();
      } catch (error) {
        lastError = handleCollectionError(error);
        throw new Error(lastError.message);
      }
    },
  };
}
