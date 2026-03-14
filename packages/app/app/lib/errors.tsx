import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import * as React from "react";

interface ErrorLogData {
  message: string;
  error: unknown;
  timestamp: string;
  userAgent: string;
  url: string;
}

function formatErrorLog(data: ErrorLogData): string {
  const error = data.error;
  let errorDetails = "";

  if (error instanceof Error) {
    errorDetails = `Error: ${error.message}\nStack: ${error.stack || "No stack trace"}`;
  } else if (typeof error === "string") {
    errorDetails = `Error: ${error}`;
  } else if (error && typeof error === "object") {
    try {
      errorDetails = `Error: ${JSON.stringify(error, null, 2)}`;
    } catch {
      errorDetails = `Error: [Object unable to stringify]`;
    }
  } else {
    errorDetails = `Error: ${String(error)}`;
  }

  return `[${data.timestamp}]
Message: ${data.message}
URL: ${data.url}
User-Agent: ${data.userAgent}

${errorDetails}`;
}

function CopyLogButton({ logText }: { logText: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy log:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          <span>Copiado</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copiar log</span>
        </>
      )}
    </Button>
  );
}

export function showError(message: string, error?: unknown) {
  const logData: ErrorLogData = {
    message,
    error,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  const logText = formatErrorLog(logData);

  console.error("[App Error]", logData);

  toast.error(message, {
    description: React.createElement(
      "div",
      { className: "flex items-center gap-2 mt-1" },
      React.createElement(CopyLogButton, { logText })
    ),
    duration: 8000,
  });
}

export function showErrorWithDescription(
  message: string,
  description: string,
  error?: unknown
) {
  const logData: ErrorLogData = {
    message: `${message} - ${description}`,
    error,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  const logText = formatErrorLog(logData);

  console.error("[App Error]", logData);

  toast.error(message, {
    description: React.createElement(
      "div",
      { className: "space-y-2" },
      React.createElement("p", { className: "text-sm text-muted-foreground" }, description),
      React.createElement(CopyLogButton, { logText })
    ),
    duration: 8000,
  });
}
