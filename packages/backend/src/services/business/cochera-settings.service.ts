import { CocheraSettingsRepository } from "../repository/cochera-settings.repository";
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
  acceptedPaymentMethods: z.array(z.enum(["efectivo", "yape", "plin"])).min(1),
});

export type CocheraSettingsUpdateInput = z.infer<typeof updateSchema>;

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

    const data = {
      displayName: result.data.displayName,
      displayAddress: result.data.displayAddress,
      hourlyRate: String(result.data.hourlyRate),
      dailyRate: result.data.dailyRate != null ? String(result.data.dailyRate) : null,
      graceMinutes: result.data.graceMinutes,
      totalSpaces: result.data.totalSpaces,
      acceptedPaymentMethods: result.data.acceptedPaymentMethods,
    };

    if (existing) {
      return this.repo.update(ctx, existing.id, data);
    }

    return this.repo.create(ctx, data);
  }
}
