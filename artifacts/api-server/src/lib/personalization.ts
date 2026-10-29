import { z } from "zod";

// Prices are server-owned, in AED, per physical item.
export const personalizationInput = z.object({
  personalizationName: z.string().trim().min(1).max(30)
    .refine(value => !/[\u0000-\u001f\u007f-\u009f]/.test(value), "Name cannot contain control characters.")
    .nullish(),
  personalizationNumber: z.string().regex(/^[0-9]{1,3}$/, "Enter a number with 1–3 digits.").nullish(),
});

export function personalizationFee(item: {
  personalizationName?: string | null;
  personalizationNumber?: string | null;
}): number {
  return (item.personalizationName ? 10 : 0) + (item.personalizationNumber ? 10 : 0);
}
