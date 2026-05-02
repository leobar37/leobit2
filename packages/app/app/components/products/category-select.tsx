import { forwardRef, useMemo, useState } from "react";
import { Controller, useFormContext, type Control } from "react-hook-form";
import { Check, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormFieldShell } from "@/components/forms/form-field-shell";
import { FormInput } from "@/components/forms/form-input";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateProductCategory,
  useProductCategories,
} from "~/hooks/use-product-categories";
import { categorySchema, type CategoryFormData } from "~/lib/schemas/category-schema";
import {
  CATEGORY_PRESET_COLORS,
  DEFAULT_CATEGORY_COLOR,
  getCategoryColor,
} from "~/lib/utils/category-colors";

export interface CategorySelectProps {
  name: string;
  label?: string;
  placeholder?: string;
  error?: string;
  control?: Control;
  className?: string;
}

const CategorySelect = forwardRef<HTMLDivElement, CategorySelectProps>(
  (
    {
      name,
      label = "Categoría",
      placeholder = "Seleccionar categoría",
      error,
      control: controlProp,
      className,
    },
    ref
  ) => {
    const formContext = useFormContext();
    const control = controlProp || formContext?.control;

    if (!controlProp && !formContext) {
      throw new Error(
        "CategorySelect must be used within a FormProvider or receive a control prop. " +
          "Either wrap your form with <FormProvider {...form}> or pass control={form.control} to CategorySelect."
      );
    }

    const errors = formContext?.formState?.errors || {};
    const fieldError = errors[name]?.message as string | undefined;
    const displayError = error ?? fieldError;

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const { data: categories, isLoading } = useProductCategories();
    const createCategory = useCreateProductCategory();

    const filteredCategories = useMemo(() => {
      if (!categories) return [];
      const term = search.trim().toLowerCase();
      if (!term) return categories;
      return categories.filter((c) => c.name.toLowerCase().includes(term));
    }, [categories, search]);

    const createForm = useForm<CategoryFormData>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: "", color: DEFAULT_CATEGORY_COLOR },
    });

    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selectedCategory = categories?.find((c) => c.id === field.value);

          const handleSelect = (categoryId: string | null) => {
            field.onChange(categoryId);
            setDrawerOpen(false);
          };

          const handleCreateSubmit = async (data: CategoryFormData) => {
            const newCategory = await createCategory.mutateAsync(data);
            field.onChange(newCategory.id);
            setCreateDialogOpen(false);
            setDrawerOpen(false);
            createForm.reset();
          };

          return (
            <div ref={ref} className={cn("space-y-2", className)}>
              <CategorySelectTrigger
                label={label}
                placeholder={placeholder}
                selectedCategory={selectedCategory}
                error={displayError}
                onPress={() => setDrawerOpen(true)}
              />

              <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <AppDrawer.Header title={label} />
                <AppDrawer.Body scrollable>
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                       <Input
                         data-testid="product-category-search-input"
                         placeholder="Buscar categoría..."
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="pl-9 rounded-xl"
                       />
                    </div>

                    <button
                      data-testid="product-category-option-none"
                      type="button"
                      onClick={() => handleSelect(null)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors",
                        "hover:bg-accent focus-visible:outline-none focus-visible:bg-accent",
                        field.value === null || field.value === undefined || field.value === ""
                          ? "bg-orange-50 text-orange-600 font-medium dark:bg-orange-500/12 dark:text-orange-300"
                          : "text-foreground"
                      )}
                    >
                      <span className="w-3 h-3 rounded-full border border-muted-foreground bg-transparent flex-shrink-0" />
                      <span className="flex-1">Sin categoría</span>
                      {(field.value === null ||
                        field.value === undefined ||
                        field.value === "") && (
                        <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      )}
                    </button>

                    <div className="flex flex-col gap-1">
                      {isLoading && (
                        <p className="text-sm text-muted-foreground px-4 py-2">
                          Cargando...
                        </p>
                      )}
                      {!isLoading && filteredCategories.length === 0 && (
                        <p className="text-sm text-muted-foreground px-4 py-2">
                          No se encontraron categorías
                        </p>
                      )}
                      <ScrollArea className="h-full">
                        {filteredCategories.map((category) => {
                          const isSelected = field.value === category.id;
                          return (
                            <button
                              key={category.id}
                              data-testid="product-category-option"
                              type="button"
                              onClick={() => handleSelect(category.id)}
                              className={cn(
                                "flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left text-sm transition-colors",
                                "hover:bg-accent focus-visible:outline-none focus-visible:bg-accent",
                                isSelected
                                  ? "bg-orange-50 text-orange-600 font-medium dark:bg-orange-500/12 dark:text-orange-300"
                                  : "text-foreground"
                              )}
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: getCategoryColor(category.color),
                                }}
                              />
                              <span className="flex-1">{category.name}</span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </ScrollArea>
                    </div>
                  </div>
                </AppDrawer.Body>
                <AppDrawer.Footer>
                  <Button
                    data-testid="product-category-create-button"
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva categoría
                  </Button>
                </AppDrawer.Footer>
              </AppDrawer>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent data-testid="product-category-create-dialog" className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Nueva categoría</DialogTitle>
                  </DialogHeader>
                  <FormProvider {...createForm}>
                    <form
                      onSubmit={createForm.handleSubmit(handleCreateSubmit)}
                      className="space-y-4"
                    >
                      <FormInput
                        name="name"
                        label="Nombre"
                        placeholder="Nombre de la categoría"
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORY_PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => createForm.setValue("color", color)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-transform",
                                createForm.watch("color") === color
                                  ? "border-foreground scale-110"
                                  : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                              aria-label={`Color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          data-testid="product-category-save-button"
                          type="submit"
                          disabled={createCategory.isPending}
                          className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                        >
                          {createCategory.isPending
                            ? "Guardando..."
                            : "Guardar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setCreateDialogOpen(false);
                            createForm.reset();
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </FormProvider>
                </DialogContent>
              </Dialog>
            </div>
          );
        }}
      />
    );
  }
);

CategorySelect.displayName = "CategorySelect";

export { CategorySelect };

interface CategorySelectTriggerProps {
  label?: string;
  placeholder?: string;
  selectedCategory?: { name: string; color: string } | null;
  error?: string;
  onPress: () => void;
}

function CategorySelectTrigger({
  label,
  placeholder,
  selectedCategory,
  error,
  onPress,
}: CategorySelectTriggerProps) {
  return (
    <FormFieldShell label={label} error={error} reserveMessageSpace={false}>
      <button
        data-testid="product-category-select-trigger"
        type="button"
        onClick={onPress}
        className={cn(
          "shell-field h-12 w-full rounded-[20px] px-4 flex items-center gap-3 text-left",
          "bg-background border border-input",
          "hover:bg-accent/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          error && "border-destructive focus-visible:ring-destructive"
        )}
      >
        {selectedCategory ? (
          <>
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor: getCategoryColor(selectedCategory.color),
              }}
            />
            <span className="flex-1 text-foreground">
              {selectedCategory.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground">{placeholder}</span>
        )}
        <svg
          className="h-4 w-4 text-muted-foreground flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          />
        </svg>
      </button>
    </FormFieldShell>
  );
}
