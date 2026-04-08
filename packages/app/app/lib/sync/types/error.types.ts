/**
 * Sync Error Types
 *
 * Error classification system for structured error handling during sync.
 */

export enum SyncErrorCode {
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  VERSION_CONFLICT = "VERSION_CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMITED = "RATE_LIMITED",
  UNKNOWN = "UNKNOWN",
}

export interface ClassifiedError {
  code: SyncErrorCode;
  isRetryable: boolean;
  isSelfHealable: boolean;
  originalError: string;
}

/**
 * Classify an error using regex patterns for structured error handling
 */
export function classifyError(error: string): ClassifiedError {
  const lower = error.toLowerCase();

  const patterns: Array<{
    code: SyncErrorCode;
    patterns: RegExp[];
    isRetryable: boolean;
    isSelfHealable: boolean;
  }> = [
    {
      code: SyncErrorCode.RECORD_NOT_FOUND,
      patterns: [
        /record.*not found/i,
        /no encontrad[oa]/i,
        /does not exist/i,
        /no existe/i,
        /404/i,
        /not found/i,
      ],
      isRetryable: false,
      isSelfHealable: true,
    },
    {
      code: SyncErrorCode.VERSION_CONFLICT,
      patterns: [
        /version.*conflict/i,
        /optimistic.*lock/i,
        /concurrent.*modification/i,
        /409/i,
      ],
      isRetryable: false,
      isSelfHealable: false,
    },
    {
      code: SyncErrorCode.NETWORK_ERROR,
      patterns: [
        /network.*error/i,
        /timeout/i,
        /connection.*refused/i,
        /fetch.*failed/i,
        /abort/i,
        /offline/i,
      ],
      isRetryable: true,
      isSelfHealable: false,
    },
    {
      code: SyncErrorCode.PERMISSION_DENIED,
      patterns: [
        /permission.*denied/i,
        /unauthorized/i,
        /forbidden/i,
        /403/i,
        /401/i,
      ],
      isRetryable: false,
      isSelfHealable: false,
    },
    {
      code: SyncErrorCode.VALIDATION_ERROR,
      patterns: [
        /validation.*failed/i,
        /invalid.*input/i,
        /required.*field/i,
        /constraint.*violated/i,
        /400/i,
      ],
      isRetryable: false,
      isSelfHealable: false,
    },
  ];

  for (const p of patterns) {
    if (p.patterns.some((regex) => regex.test(lower))) {
      return {
        code: p.code,
        isRetryable: p.isRetryable,
        isSelfHealable: p.isSelfHealable,
        originalError: error,
      };
    }
  }

  return {
    code: SyncErrorCode.UNKNOWN,
    isRetryable: true,
    isSelfHealable: false,
    originalError: error,
  };
}
