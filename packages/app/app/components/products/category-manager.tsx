import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Tag,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  X,
  Settings2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormInput } from "@/components/forms/form-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
  type ProductCategory,
} from "~/hooks/use-product-categories";
import { categorySchema, type CategoryFormData } from "~/lib/schemas/category-schema";
import {
  CATEGORY_PRESET_COLORS,
  DEFAULT_CATEGORY_COLOR,
  getCategoryColor,
} from "~/lib/utils/category-colors";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ManagerMode =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; category: ProductCategory };

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const { data: categories, isLoading } = useProductCategories();
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();

  const [mode, setMode] = useState<ManagerMode>({ type: "list" });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isFormOpen = mode.type === "create" || mode.type === "edit";

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      color: DEFAULT_CATEGORY_COLOR,
    },
  });

  const resetToList = () => {
    setMode({ type: "list" });
    setDeleteError(null);
    form.reset({ name: "", color: DEFAULT_CATEGORY_COLOR });
  };

  const handleCreateClick = () => {
    form.reset({ name: "", color: DEFAULT_CATEGORY_COLOR });
    setMode({ type: "create" });
    setDeleteError(null);
  };

  const handleEditClick = (category: ProductCategory) => {
    form.reset({
      name: category.name,
      color: getCategoryColor(category.color),
    });
    setMode({ type: "edit", category });
    setDeleteError(null);
  };

  const handleFormClose = () => {
    resetToList();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (mode.type === "create") {
      await createCategory.mutateAsync(data);
      resetToList();
    } else if (mode.type === "edit") {
      await updateCategory.mutateAsync({
        id: mode.category.id,
        input: data,
      });
      resetToList();
    }
  });

  const handleDelete = async (category: ProductCategory) => {
    setDeleteError(null);
    try {
      await deleteCategory.mutateAsync(category.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo eliminar la categoría";
      if (
        message.toLowerCase().includes("reference") ||
        message.toLowerCase().includes("foreign key") ||
        message.toLowerCase().includes(" restrict") ||
        message.toLowerCase().includes("asignad") ||
        message.toLowerCase().includes("product")
      ) {
        setDeleteError(
          `No se puede eliminar "${category.name}" porque tiene productos asignados. Reasigna o quita la categoría de los productos primero.`
        );
      } else {
        setDeleteError(message);
      }
    }
  };

  const isPending =
    createCategory.isPending ||
    updateCategory.isPending ||
    deleteCategory.isPending;

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
  }, [categories]);

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => {
        if (!val) {
          resetToList();
        }
        onOpenChange(val);
      }}>
        <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh] flex flex-col">
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-orange-500" />
              Categorías
            </SheetTitle>
            <SheetDescription>
              Administra las categorías de tus productos
            </SheetDescription>
          </SheetHeader>

          {deleteError && (
            <Alert variant="destructive" className="mx-6 mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-hidden px-6 py-2">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Cargando categorías...
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay categorías registradas
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2 pb-2">
                  {sortedCategories.map((category) => (
                    <CategoryListItem
                      key={category.id}
                      category={category}
                      onEdit={() => handleEditClick(category)}
                      onDelete={() => handleDelete(category)}
                      isDeleting={deleteCategory.isPending}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={handleCreateClick}
              disabled={isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva categoría
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={isFormOpen}
        onOpenChange={(val) => {
          if (!val) handleFormClose();
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode.type === "create" ? "Nueva categoría" : "Editar categoría"}
            </DialogTitle>
          </DialogHeader>

          <FormProvider {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormInput
                name="name"
                label="Nombre"
                placeholder="Nombre de la categoría"
                required
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => form.setValue("color", color)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-transform",
                        form.watch("color") === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={handleFormClose}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                  disabled={isPending || !form.formState.isValid}
                >
                  {isPending
                    ? "Guardando..."
                    : mode.type === "create"
                    ? "Crear"
                    : "Guardar"}
                </Button>
              </div>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CategoryListItemProps {
  category: ProductCategory;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function CategoryListItem({
  category,
  onEdit,
  onDelete,
  isDeleting,
}: CategoryListItemProps) {
  const color = getCategoryColor(category.color);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3",
        "bg-muted/50 hover:bg-muted transition-colors"
      )}
    >
      <span
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-sm font-medium truncate">
        {category.name}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
          aria-label={`Editar ${category.name}`}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label={`Eliminar ${category.name}`}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}

interface CategoryManagerTriggerProps {
  onClick: () => void;
}

export function CategoryManagerTrigger({ onClick }: CategoryManagerTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
        "px-3 py-1.5 rounded-full hover:bg-muted"
      )}
    >
      <Settings2 className="h-3.5 w-3.5" />
      <span>Categorías</span>
    </button>
  );
}
