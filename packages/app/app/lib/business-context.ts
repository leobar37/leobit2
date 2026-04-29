import { api } from "~/lib/api-client";
import {
  getStoredBusinessId,
  setStoredBusinessId,
  setStoredBusinessUserId,
} from "~/lib/session-storage";

export async function hydrateCurrentBusinessContext() {
  try {
    const { data, error } = await api.businesses.me.get();

    if (error || !data?.success || !data.data?.id) {
      const storedId = getStoredBusinessId();
      return storedId
        ? { businessId: storedId, businessUserId: null }
        : null;
    }

    setStoredBusinessId(data.data.id);
    if (data.data.businessUserId) {
      setStoredBusinessUserId(data.data.businessUserId);
    }

    return {
      businessId: data.data.id,
      businessUserId: data.data.businessUserId ?? null,
    };
  } catch {
    const storedId = getStoredBusinessId();
    return storedId
      ? { businessId: storedId, businessUserId: null }
      : null;
  }
}
