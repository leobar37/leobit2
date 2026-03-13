import { useEffect, useRef } from "react";
import { processAllPendingUploads } from "~/lib/file-queue";
import { isOnline } from "~/lib/file-queue/utils";

export function useAutoFileUploadProcessor() {
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingRef.current || !isOnline()) {
        return;
      }

      isProcessingRef.current = true;
      try {
        await processAllPendingUploads();
      } catch {
        // Silently ignore upload errors
      } finally {
        isProcessingRef.current = false;
      }
    };

    processQueue();

    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener("online", handleOnline);

    const intervalId = setInterval(() => {
      if (isOnline() && !isProcessingRef.current) {
        processQueue();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(intervalId);
    };
  }, []);
}
