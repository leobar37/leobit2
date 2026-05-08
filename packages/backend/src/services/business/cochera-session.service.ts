import { CocheraSessionRepository } from "../repository/cochera-session.repository";
import { ValidationError, ConflictError, NotFoundError, ForbiddenError } from "../../errors";
import type { RequestContext } from "../../context/request-context";
import type { CocheraSession, NewCocheraSession } from "../../db/schema";
import { z } from "zod";

const vehicleTypes = ["auto", "moto", "camioneta"] as const;

const createSchema = z.object({
  plate: z.string().min(1, "La placa es requerida").max(20, "Placa muy larga"),
  vehicleType: z.enum(vehicleTypes, {
    message: "Tipo de vehículo inválido",
  }),
  notes: z.string().max(500, "Nota muy larga").optional(),
});

export type CreateCocheraSessionInput = z.infer<typeof createSchema>;

export class CocheraSessionService {
  constructor(private repo: CocheraSessionRepository) {}

  private ensureCocheraMode(ctx: RequestContext): void {
    if (ctx.businessMode !== "cochera") {
      throw new ForbiddenError("Esta función solo está disponible para cocheras");
    }
  }

  async listActive(
    ctx: RequestContext,
    options: { search?: string; limit?: number; offset?: number } = {}
  ): Promise<CocheraSession[]> {
    this.ensureCocheraMode(ctx);
    return this.repo.listActive(ctx, options);
  }

  async countActive(ctx: RequestContext): Promise<number> {
    this.ensureCocheraMode(ctx);
    return this.repo.countActive(ctx);
  }

  async findById(ctx: RequestContext, id: string): Promise<CocheraSession> {
    this.ensureCocheraMode(ctx);
    const session = await this.repo.findById(ctx, id);
    if (!session) {
      throw new NotFoundError("Sesión de vehículo");
    }
    return session;
  }

  async create(
    ctx: RequestContext,
    input: CreateCocheraSessionInput
  ): Promise<CocheraSession> {
    this.ensureCocheraMode(ctx);

    const result = createSchema.safeParse(input);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new ValidationError(String(firstError.message));
    }

    const normalizedPlate = result.data.plate.trim().toUpperCase();

    // Prevent duplicate active plate per business
    const existing = await this.repo.findActiveByPlate(ctx, normalizedPlate);
    if (existing) {
      throw new ConflictError(
        `El vehículo con placa ${normalizedPlate} ya se encuentra dentro`
      );
    }

    const data: Omit<NewCocheraSession, "businessId"> = {
      plate: normalizedPlate,
      vehicleType: result.data.vehicleType,
      status: "dentro",
      notes: result.data.notes,
      entryAt: new Date(),
    };

    return this.repo.create(ctx, data);
  }

  async getDashboard(
    ctx: RequestContext
  ): Promise<{
    todayEntries: number;
    activeInside: number;
    todayIncome: string;
    monthIncome: string;
    chartData: { date: string; income: string; count: number }[];
    recentActivity: CocheraSession[];
  }> {
    this.ensureCocheraMode(ctx);

    const [
      todayEntries,
      activeInside,
      todayIncome,
      monthIncome,
      chartData,
      recentActivity,
    ] = await Promise.all([
      this.repo.countEntriesToday(ctx),
      this.repo.countActive(ctx),
      this.repo.sumIncomeToday(ctx),
      this.repo.sumIncomeThisMonth(ctx),
      this.repo.getDailyIncomeLast7Days(ctx),
      this.repo.getRecentActivity(ctx, undefined, 5),
    ]);

    return {
      todayEntries,
      activeInside,
      todayIncome,
      monthIncome,
      chartData,
      recentActivity,
    };
  }
}
