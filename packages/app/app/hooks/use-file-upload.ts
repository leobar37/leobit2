// Stub for file-upload hook
export function useFileUpload() {
  return {
    upload: async () => ({ url: "" }),
    isUploading: false,
  };
}
