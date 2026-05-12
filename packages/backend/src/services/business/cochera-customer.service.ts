import { db } from "../../lib/db";
import type { RequestContext } from "../../context/request-context";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors";
import type { CustomerRepository } from "../repository/customer.repository";
import type { CocheraCustomerVehicleRepository } from "../repository/cochera-customer-vehicle.repository";
import type { CocheraSessionRepository } from "../repository/cochera-session.repository";
import type {
  CocheraCustomerListResult,
  CocheraCustomerSummary,
  CocheraCustomerVehicle,
  CreateCocheraCustomerInput,
  CreateCocheraCustomerVehicleInput,
  UpdateCocheraCustomerVehicleInput,
} from "@avileo/shared";

function money(value: string | number | null | undefined): number {
  return Number.parseFloat(String(value ?? "0")) || 0;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase();
}

export class CocheraCustomerService {
  constructor(
    private customerRepo: CustomerRepository,
    private vehicleRepo: CocheraCustomerVehicleRepository,
    private sessionRepo: CocheraSessionRepository
  ) {}

  private ensureCocheraMode(ctx: RequestContext): void {
    if (ctx.businessMode !== "cochera") {
      throw new ForbiddenError("Esta función solo está disponible para cocheras");
    }
  }

  private async assertVehiclePlateAvailable(
    ctx: RequestContext,
    plate: string,
    currentVehicleId?: string
  ): Promise<void> {
    const existing = await this.vehicleRepo.findActiveByPlate(ctx, normalizePlate(plate));
    if (existing && existing.id !== currentVehicleId) {
      throw new ValidationError("Ya existe un vehículo activo con esa placa");
    }
  }

  private toVehicleDto(vehicle: {
    id: string;
    businessId: string;
    customerId: string;
    plate: string;
    vehicleType: string;
    alias: string | null;
    notes: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CocheraCustomerVehicle {
    return {
      ...vehicle,
      vehicleType: vehicle.vehicleType as never,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }

  async listCustomers(
    ctx: RequestContext,
    filters: { search?: string; limit?: number; offset?: number } = {}
  ): Promise<CocheraCustomerListResult> {
    this.ensureCocheraMode(ctx);
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    const rows = await this.vehicleRepo.listCustomerSummaries(ctx, filters);
    const customerIds = rows.map((row) => row.customer.id);
    const vehicles = await this.vehicleRepo.findByCustomerIds(ctx, customerIds);
    const vehiclesByCustomer = new Map<string, typeof vehicles>();

    for (const vehicle of vehicles) {
      const list = vehiclesByCustomer.get(vehicle.customerId) ?? [];
      list.push(vehicle);
      vehiclesByCustomer.set(vehicle.customerId, list);
    }

    const items: CocheraCustomerSummary[] = rows.map((row) => {
      const customerVehicles = vehiclesByCustomer.get(row.customer.id) ?? [];
      return {
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
        dni: row.customer.dni,
        address: row.customer.address,
        notes: row.customer.notes,
        vehicles: customerVehicles.map((vehicle) => this.toVehicleDto(vehicle)),
        vehicleCount: Number(row.vehicleCount ?? customerVehicles.length),
        activeDebt: toMoney(money(row.activeDebt)),
        pendingSessions: Number(row.pendingSessions ?? 0),
        lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt).toISOString() : null,
      };
    });

    return {
      items,
      summary: {
        totalCustomers: items.length,
        totalDebt: toMoney(items.reduce((sum, item) => sum + money(item.activeDebt), 0)),
        totalVehicles: items.reduce((sum, item) => sum + item.vehicleCount, 0),
      },
    };
  }

  async getCustomer(ctx: RequestContext, customerId: string) {
    this.ensureCocheraMode(ctx);
    if (!ctx.hasPermission("customers.read")) {
      throw new ForbiddenError("No tiene permisos para ver clientes");
    }

    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) throw new NotFoundError("Cliente");

    const [vehicles, debts] = await Promise.all([
      this.vehicleRepo.findByCustomerId(ctx, customerId),
      this.sessionRepo.listDebts(ctx, { customerId }),
    ]);

    return {
      customer,
      vehicles: vehicles.map((vehicle) => this.toVehicleDto(vehicle)),
      debts,
    };
  }

  async createCustomer(ctx: RequestContext, input: CreateCocheraCustomerInput) {
    this.ensureCocheraMode(ctx);
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para crear clientes");
    }

    if (!input.name || input.name.trim().length < 2) {
      throw new ValidationError("El nombre debe tener al menos 2 caracteres");
    }

    const vehicles = input.vehicles ?? [];
    for (const vehicle of vehicles) {
      await this.assertVehiclePlateAvailable(ctx, vehicle.plate);
    }

    return db.transaction(async (tx) => {
      const customer = await this.customerRepo.create(
        ctx,
        {
          name: input.name.trim(),
          dni: input.dni ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          notes: input.notes ?? null,
        },
        tx
      );

      const createdVehicles = [];
      for (const vehicle of vehicles) {
        createdVehicles.push(
          await this.vehicleRepo.create(
            ctx,
            {
              customerId: customer.id,
              plate: normalizePlate(vehicle.plate),
              vehicleType: vehicle.vehicleType,
              alias: vehicle.alias ?? null,
              notes: vehicle.notes ?? null,
              active: true,
            },
            tx
          )
        );
      }

      return {
        customer,
        vehicles: createdVehicles.map((vehicle) => this.toVehicleDto(vehicle)),
      };
    });
  }

  async createVehicle(
    ctx: RequestContext,
    customerId: string,
    input: CreateCocheraCustomerVehicleInput
  ): Promise<CocheraCustomerVehicle> {
    this.ensureCocheraMode(ctx);
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para editar clientes");
    }

    const customer = await this.customerRepo.findById(ctx, customerId);
    if (!customer) throw new NotFoundError("Cliente");

    await this.assertVehiclePlateAvailable(ctx, input.plate);
    const vehicle = await this.vehicleRepo.create(ctx, {
      customerId,
      plate: normalizePlate(input.plate),
      vehicleType: input.vehicleType,
      alias: input.alias ?? null,
      notes: input.notes ?? null,
      active: true,
    });

    return this.toVehicleDto(vehicle);
  }

  async updateVehicle(
    ctx: RequestContext,
    vehicleId: string,
    input: UpdateCocheraCustomerVehicleInput
  ): Promise<CocheraCustomerVehicle> {
    this.ensureCocheraMode(ctx);
    if (!ctx.hasPermission("customers.write")) {
      throw new ForbiddenError("No tiene permisos para editar clientes");
    }

    const existing = await this.vehicleRepo.findById(ctx, vehicleId);
    if (!existing) throw new NotFoundError("Vehículo");

    if (input.plate && normalizePlate(input.plate) !== existing.plate) {
      await this.assertVehiclePlateAvailable(ctx, input.plate, vehicleId);
    }

    const vehicle = await this.vehicleRepo.update(ctx, vehicleId, {
      ...(input.plate !== undefined && { plate: normalizePlate(input.plate) }),
      ...(input.vehicleType !== undefined && { vehicleType: input.vehicleType }),
      ...(input.alias !== undefined && { alias: input.alias }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.active !== undefined && { active: input.active }),
    });

    if (!vehicle) throw new NotFoundError("Vehículo");
    return this.toVehicleDto(vehicle);
  }
}
