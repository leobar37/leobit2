import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { createModal } from "~/lib/modal/create-modal";
import { useCreateTag } from "~/hooks/use-tags";
import { FormInput } from "~/components/forms/form-input";

const quickTagSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50, "Máximo 50 caracteres"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
});

type QuickTagFormData = z.infer<typeof quickTagSchema>;

const PRESET_COLORS = [
  "#f97316",
  "#ef4444",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#f43f5e",
  "#6b7280",
  "#1f2937",
];

function QuickTagModalContent({ close }: { close: () => void }) {
  const form = useForm<QuickTagFormData>({
    resolver: zodResolver(quickTagSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      color: "#f97316",
    },
  });

  const createTag = useCreateTag();

  const onSubmit = form.handleSubmit(async (formData) => {
    try {
      await createTag.mutateAsync(formData);
      toast.success("Etiqueta creada");
      close();
    } catch (error) {
      console.error("[QuickTagModal] Error creating tag:", error);
      const message = error instanceof Error ? error.message : "Error al crear etiqueta";
      toast.error(message);
    }
  });

  const selectedColor = form.watch("color");

  return (
    <>
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>Crear etiqueta</DrawerTitle>
        <DrawerDescription>
          Crea una nueva etiqueta para organizar tus clientes.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={onSubmit} className="px-4 py-4 space-y-4">
        <FormInput
          {...form.register("name", { required: "El nombre es requerido" })}
          label="Nombre"
          placeholder="Ej: Cliente VIP"
          error={form.formState.errors.name?.message}
          required
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => form.setValue("color", color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  selectedColor === color
                    ? "ring-2 ring-offset-2 ring-orange-500 scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </form>

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          className="h-12 flex-1 rounded-xl"
          disabled={createTag.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={onSubmit}
          className="h-12 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
          disabled={createTag.isPending || !form.formState.isValid}
        >
          {createTag.isPending ? "Creando..." : "Crear"}
        </Button>
      </DrawerFooter>
    </>
  );
}

export const [QuickTagModal, useQuickTagModal] = createModal(QuickTagModalContent, {
  type: "drawer",
});
