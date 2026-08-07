import type { CollectionKey } from "@/lib/collections";
import { jsonError, jsonOk, loadCollection } from "@/lib/data";

export function createCollectionGetHandler(key: CollectionKey) {
  return async function GET() {
    try {
      const payload = await loadCollection(key);
      return jsonOk(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load collection";
      return jsonError(message);
    }
  };
}
