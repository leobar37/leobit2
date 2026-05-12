export type CocheraPaymentTiming = "entry" | "exit";

export interface CocheraPricingSnapshot {
  hourlyBillingEnabled: boolean;
  hourlyRate: string;
  graceMinutes: number;
  dailyRate: string | null;
  hourlyBaseRate: string;
  hourlyBaseHours: number;
  extraHourRate: string;
}

export interface CocheraBillingInput {
  entryAt: Date | string;
  checkoutAt: Date | string;
  pricing: CocheraPricingSnapshot;
  entryAmountPaid?: string | number | null;
  discount?: number;
}

export interface CocheraBillingCalculation {
  durationMinutes: number;
  billableMinutes: number;
  billableHours: number;
  baseHours: number;
  extraHours: number;
  baseAmount: number;
  extraAmount: number;
  grossAmount: number;
  discountAmount: number;
  totalAmount: number;
  entryAmountPaid: number;
  remainingAmount: number;
  isExtra: boolean;
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createCocheraPricingSnapshot(settings: {
  hourlyBillingEnabled?: boolean;
  hourlyRate?: string | number;
  graceMinutes?: number;
  dailyRate?: string | number | null;
  hourlyBaseRate?: string | number;
  hourlyBaseHours?: number;
  extraHourRate?: string | number;
}): CocheraPricingSnapshot {
  return {
    hourlyBillingEnabled: Boolean(settings.hourlyBillingEnabled),
    hourlyRate: String(settings.hourlyRate ?? "0"),
    graceMinutes: settings.graceMinutes ?? 0,
    dailyRate: settings.dailyRate == null ? null : String(settings.dailyRate),
    hourlyBaseRate: String(settings.hourlyBaseRate ?? settings.hourlyRate ?? "0"),
    hourlyBaseHours: Math.max(1, settings.hourlyBaseHours ?? 1),
    extraHourRate: String(settings.extraHourRate ?? settings.hourlyRate ?? "0"),
  };
}

export function calculateCocheraBilling(input: CocheraBillingInput): CocheraBillingCalculation {
  const entryAt = new Date(input.entryAt);
  const checkoutAt = new Date(input.checkoutAt);
  const durationMinutes = Math.max(
    0,
    Math.floor((checkoutAt.getTime() - entryAt.getTime()) / 1000 / 60)
  );
  const discountAmount = Math.max(0, input.discount ?? 0);
  const entryAmountPaid = Math.max(0, toNumber(input.entryAmountPaid));

  if (!input.pricing.hourlyBillingEnabled) {
    const billableMinutes = Math.max(0, durationMinutes - input.pricing.graceMinutes);
    const billableHours = Math.ceil(billableMinutes / 60);
    const grossAmount = billableHours * Math.max(0, toNumber(input.pricing.hourlyRate));
    const totalAmount = Math.max(0, grossAmount - discountAmount);
    return {
      durationMinutes,
      billableMinutes,
      billableHours,
      baseHours: billableHours,
      extraHours: 0,
      baseAmount: grossAmount,
      extraAmount: 0,
      grossAmount,
      discountAmount,
      totalAmount,
      entryAmountPaid,
      remainingAmount: Math.max(0, totalAmount - entryAmountPaid),
      isExtra: false,
    };
  }

  const baseHours = Math.max(1, input.pricing.hourlyBaseHours);
  const billableMinutes = durationMinutes;
  const billableHours = Math.max(1, Math.ceil(billableMinutes / 60));
  const extraHours = Math.max(0, billableHours - baseHours);
  const baseAmount = Math.max(0, toNumber(input.pricing.hourlyBaseRate));
  const extraAmount = extraHours * Math.max(0, toNumber(input.pricing.extraHourRate));
  const uncappedAmount = baseAmount + extraAmount;
  const dailyRate = input.pricing.dailyRate == null ? null : Math.max(0, toNumber(input.pricing.dailyRate));
  const grossAmount = dailyRate && dailyRate > 0 ? Math.min(uncappedAmount, dailyRate) : uncappedAmount;
  const totalAmount = Math.max(0, grossAmount - discountAmount);

  return {
    durationMinutes,
    billableMinutes,
    billableHours,
    baseHours,
    extraHours,
    baseAmount,
    extraAmount,
    grossAmount,
    discountAmount,
    totalAmount,
    entryAmountPaid,
    remainingAmount: Math.max(0, totalAmount - entryAmountPaid),
    isExtra: extraHours > 0,
  };
}
