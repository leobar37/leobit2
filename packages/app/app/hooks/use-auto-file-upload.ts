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
      } catch (error) {
        console.error("Error processing file upload queue:", error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    processQueue();

    const handleOnline = () => {
      console.log("Network is online, processing pending uploads...");
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
