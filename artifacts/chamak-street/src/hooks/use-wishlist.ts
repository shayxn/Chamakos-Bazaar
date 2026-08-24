import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const QK = ["wishlist", "ids"] as const;

export function useWishlist() {
  const qc = useQueryClient();

  const { data: wishlistIds = [] } = useQuery<number[]>({
    queryKey: QK,
    queryFn: () =>
      fetch(`${BASE}/api/wishlist/ids`, { credentials: "include" })
        .then((r) => r.json()) as Promise<number[]>,
    staleTime: 60_000,
  });

  const ids = new Set(wishlistIds);

  const { mutate: toggle } = useMutation({
    mutationFn: async ({ productId, isIn }: { productId: number; isIn: boolean }) => {
      if (isIn) {
        await fetch(`${BASE}/api/wishlist/${productId}`, {
          method: "DELETE", credentials: "include",
        });
      } else {
        await fetch(`${BASE}/api/wishlist`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }
    },
    onMutate: ({ productId, isIn }) => {
      const prev = qc.getQueryData<number[]>(QK) ?? [];
      qc.setQueryData<number[]>(QK, isIn ? prev.filter((id) => id !== productId) : [...prev, productId]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(QK, ctx.prev);
    },
  });

  const toggleItem = (productId: number) => toggle({ productId, isIn: ids.has(productId) });

  return { ids, toggle: toggleItem };
}
