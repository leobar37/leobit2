import {
  CocheraSettingsRepository,
  DEFAULT_COCHERA_VEHICLE_TYPES,
} from "../repository/cochera-settings.repository";
import { ForbiddenError, ValidationError } from "../../errors";
import type { RequestContext } from "../../context/request-context";
import type { CocheraSettings } from "../../db/schema";
import { z } from "zod";

const updateSchema = z.object({
  displayName: z.string().max(120).optional(),
  displayAddress: z.string().optional(),
  hourlyRate: z.number().min(0),
  dailyRate: z.number().min(0).nullable().optional(),
  graceMinutes: z.number().int().min(0).max(120),
  totalSpaces: z.number().int().min(0),
  hourlyBillingEnabled: z.boolean().optional().default(false),
  hourlyBaseRate: z.number().min(0).optional().default(0),
  hourlyBaseHours: z.number().int().min(1).optional().default(1),
  extraHourRate: z.number().min(0).optional().default(0),
  defaultPaymentTiming: z.enum(["entry", "exit"]).optional().default("exit"),
  acceptedPaymentMethods: z.array(z.enum(["efectivo", "yape", "plin"])).min(1),
  vehicleTypes: z.array(z.object({
    id: z.string().trim().min(2).max(30).regex(/^[a-z0-9-]+$/),
    label: z.string().trim().min(2).max(40),
    enabled: z.boolean(),
    isDefault: z.boolean().optional(),
  })).min(1),
});

export type CocheraSettingsUpdateInput = z.input<typeof updateSchema>;

export class CocheraSettingsService {
  constructor(private repo: CocheraSettingsRepository) {}

  private ensureCocheraMode(ctx: RequestContext): void {
    if (ctx.businessMode !== "cochera") {
      throw new ForbiddenError("Esta función solo está disponible para cocheras");
    }
  }

  async getSettings(ctx: RequestContext): Promise<CocheraSettings> {
    this.ensureCocheraMode(ctx);
    return this.repo.getOrCreate(ctx);
  }

  async updateSettings(
    ctx: RequestContext,
    input: CocheraSettingsUpdateInput
  ): Promise<CocheraSettings> {
    this.ensureCocheraMode(ctx);
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("Solo un administrador puede editar la configuración de cochera");
    }

    const result = updateSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(String(firstError.message));
    }

    const existing = await this.repo.findByBusinessId(ctx);

    const normalizedVehicleTypes = result.data.vehicleTypes.map((type) => ({
      id: type.id.trim().toLowerCase(),
      label: type.label.trim(),
      enabled: type.enabled,
      isDefault: Boolean(
        type.isDefault ||
          DEFAULT_COCHERA_VEHICLE_TYPES.some((defaultType) => defaultType.id === type.id)
      ),
    }));
    const enabledCount = normalizedVehicleTypes.filter((type) => type.enabled).length;
    const uniqueCount = new Set(normalizedVehicleTypes.map((type) => type.id)).size;
    if (enabledCount === 0) {
      throw new ValidationError("Activa al menos un tipo de vehículo");
    }
    if (uniqueCount !== normalizedVehicleTypes.length) {
      throw new ValidationError("No repitas tipos de vehículo");
    }

    const data = {
      displayName: result.data.displayName,
      displayAddress: result.data.displayAddress,
      hourlyRate: String(result.data.hourlyRate),
      dailyRate: result.data.dailyRate != null ? String(result.data.dailyRate) : null,
      graceMinutes: result.data.graceMinutes,
      totalSpaces: result.data.totalSpaces,
      hourlyBillingEnabled: result.data.hourlyBillingEnabled,
      hourlyBaseRate: String(result.data.hourlyBaseRate),
      hourlyBaseHours: result.data.hourlyBaseHours,
      extraHourRate: String(result.data.extraHourRate),
      defaultPaymentTiming: result.data.defaultPaymentTiming,
      acceptedPaymentMethods: result.data.acceptedPaymentMethods,
      vehicleTypes: normalizedVehicleTypes,
    };

    if (existing) {
      return this.repo.update(ctx, existing.id, data);
    }

    return this.repo.create(ctx, data);
  }
}
