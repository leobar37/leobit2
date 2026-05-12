import { useState } from "react";
import { CarFront, ChevronDown, Plus, User, X } from "lucide-react";
import type { CocheraCustomerVehicle } from "@avileo/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useCocheraCustomers, useCreateCocheraCustomer } from "~/hooks/use-cochera-customers";
import { cn } from "~/lib/utils";

interface GarageCustomerSelection {
  id: string;
  name: string;
  phone?: string | null;
  vehicle?: CocheraCustomerVehicle | null;
  shouldCreateVehicle?: boolean;
}

interface GarageCustomerSelectProps {
  value: string | null;
  selectedCustomer?: GarageCustomerSelection | null;
  currentPlate: string;
  currentVehicleType: string;
  onChange: (customer: GarageCustomerSelection | null) => void;
  required?: boolean;
  helperText?: string;
}

export function GarageCustomerSelect({
  value,
  selectedCustomer,
  currentPlate,
  currentVehicleType,
  onChange,
  required,
  helperText,
}: GarageCustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const { data, isLoading } = useCocheraCustomers({ search });
  const createCustomer = useCreateCocheraCustomer();
  const normalizedPlate = currentPlate.trim().toUpperCase();

  const selectCustomer = (customer: {
    id: string;
    name: string;
    phone?: string | null;
    vehicles?: CocheraCustomerVehicle[];
  }) => {
    const matchingVehicle =
      customer.vehicles?.find((vehicle) => vehicle.plate === normalizedPlate && vehicle.active) ?? null;

    onChange({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      vehicle: matchingVehicle,
      shouldCreateVehicle: !matchingVehicle,
    });
    setOpen(false);
    setSearch("");
  };

  const createQuickCustomer = async () => {
    if (!quickName.trim()) return;

    const result = await createCustomer.mutateAsync({
      name: quickName.trim(),
      phone: quickPhone.trim() || null,
      vehicles: normalizedPlate
        ? [{ plate: normalizedPlate, vehicleType: currentVehicleType }]
        : [],
    });

    onChange({
      id: result.customer.id,
      name: result.customer.name,
      phone: result.customer.phone,
      vehicle: result.vehicles[0] ?? null,
      shouldCreateVehicle: false,
    });
    setQuickName("");
    setQuickPhone("");
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <Card
        className="cursor-pointer rounded-[24px] border-0 bg-white/80 shadow-none transition-colors hover:bg-orange-50/75 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500/[0.12] text-orange-600 dark:text-orange-300">
                <User className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {selectedCustomer?.name || "Seleccionar cliente"}
                </p>
                {selectedCustomer?.phone ? (
                  <p className="truncate text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                ) : null}
                {selectedCustomer?.shouldCreateVehicle ? (
                  <p className="mt-1 text-xs text-orange-600">
                    Se asociará la placa {normalizedPlate} a este cliente
                  </p>
                ) : selectedCustomer?.vehicle ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedCustomer.vehicle.plate} registrado
                  </p>
                ) : !selectedCustomer && required ? (
                  <p className="text-sm text-orange-600">
                    {helperText || "Seleccione un cliente"}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedCustomer ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              ) : null}
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={open} onOpenChange={setOpen} size="large">
        <AppDrawer.Header
          title="Cliente responsable"
          icon={<User className="h-5 w-5" />}
          onClose={() => setOpen(false)}
        />
        <AppDrawer.Body className="space-y-3">
          <Input
            placeholder="Buscar cliente, teléfono o placa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="shell-search-field px-4"
          />

          <div className="rounded-2xl border border-dashed border-orange-300/60 p-3 dark:border-orange-400/20">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
              <Plus className="h-4 w-4" />
              Crear cliente rápido
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Nombre completo"
                value={quickName}
                onChange={(event) => setQuickName(event.target.value)}
              />
              <Input
                placeholder="Teléfono"
                value={quickPhone}
                onChange={(event) => setQuickPhone(event.target.value)}
              />
              <Button
                type="button"
                className="h-11 w-full rounded-xl"
                disabled={!quickName.trim() || createCustomer.isPending}
                onClick={createQuickCustomer}
              >
                {createCustomer.isPending ? "Creando..." : `Crear y asociar ${normalizedPlate}`}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Cargando clientes...</p>
            ) : data?.items.length ? (
              data.items.map((customer) => {
                const matchingVehicle = customer.vehicles.find(
                  (vehicle) => vehicle.plate === normalizedPlate && vehicle.active
                );
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      value === customer.id
                        ? "border-orange-300 bg-orange-50/90 dark:border-orange-500/40 dark:bg-orange-500/20"
                        : "border-border bg-card hover:bg-accent"
                    )}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80 dark:bg-orange-500/[0.14]">
                      <User className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{customer.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {customer.phone || "Sin teléfono"}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CarFront className="h-3.5 w-3.5" />
                        {matchingVehicle
                          ? `${normalizedPlate} registrado`
                          : `Asociar ${normalizedPlate} al cobrar`}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay clientes registrados
              </p>
            )}
          </div>
        </AppDrawer.Body>
      </AppDrawer>
    </>
  );
}
