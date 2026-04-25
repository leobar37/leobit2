/**
 * Tag Form Component
 * Form for creating or editing tags
 */
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormInput } from "~/components/forms/form-input";
import { Button } from "@/components/ui/button";
import { useCreateTag, useUpdateTag } from "~/hooks/use-tags";
import type { Tags as Tag } from "~/lib/sync/generated/schema";

const tagSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
});

type TagFormData = z.infer<typeof tagSchema>;

// Preset colors for quick selection
const PRESET_COLORS = [
  "#f97316", // Orange (primary)
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#f43f5e", // Rose
  "#6b7280", // Gray
  "#1f2937", // Dark Gray
];

interface TagFormProps {
  tag?: Tag | null;
  onClose: () => void;
}

export function TagForm({ tag, onClose }: TagFormProps) {
  const form = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    mode: "onChange",
    defaultValues: {
      name: tag?.name || "",
      color: tag?.color || "#f97316",
    },
  });

  const createTag = useCreateTag();
  const updateTag = useUpdateTag();

  const onSubmit = form.handleSubmit(async (formData) => {
    if (tag) {
      await updateTag.mutateAsync({ id: tag.id, input: formData });
    } else {
      await createTag.mutateAsync(formData);
    }
    onClose();
  });

  const isPending = createTag.isPending || updateTag.isPending;
  const selectedColor = form.watch("color");

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormInput
          name="name"
          label="Nombre"
          placeholder="Ej: Cliente VIP"
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

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending
              ? "Guardando..."
              : tag
              ? "Actualizar"
              : "Crear"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
