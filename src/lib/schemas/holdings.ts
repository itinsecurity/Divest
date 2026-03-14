import { z } from "zod";

export const createHoldingSchema = z
  .object({
    instrumentIdentifier: z.string().min(1, "Instrument identifier is required"),
    instrumentType: z.enum(["STOCK", "FUND"]),
    accountName: z.string().min(1, "Account name is required"),
    shares: z.number().positive("Shares must be greater than 0").optional(),
    pricePerShare: z
      .number()
      .positive("Price per share must be greater than 0")
      .optional(),
    currentValue: z
      .number()
      .positive("Current value must be greater than 0")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.instrumentType === "STOCK") {
      if (!data.shares) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shares is required for STOCK holdings",
          path: ["shares"],
        });
      }
      if (!data.pricePerShare) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Price per share is required for STOCK holdings",
          path: ["pricePerShare"],
        });
      }
    }
    if (data.instrumentType === "FUND") {
      if (!data.currentValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Current value is required for FUND holdings",
          path: ["currentValue"],
        });
      }
    }
  });

export const updateHoldingSchema = z.object({
  accountName: z.string().min(1, "Account name cannot be empty").optional(),
  shares: z.number().positive("Shares must be greater than 0").optional(),
  pricePerShare: z
    .number()
    .positive("Price per share must be greater than 0")
    .optional(),
  currentValue: z
    .number()
    .positive("Current value must be greater than 0")
    .optional(),
});
