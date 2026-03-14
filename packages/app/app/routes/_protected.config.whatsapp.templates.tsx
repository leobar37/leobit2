import { useState, useRef } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Star,
  User,
  DollarSign,
  Calendar,
  Phone,
  MessageSquare,
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useWhatsAppTemplates,
  useCreateWhatsAppTemplate,
  useUpdateWhatsAppTemplate,
  useDeleteWhatsAppTemplate,
  TEMPLATE_VARIABLES,
  TEMPLATE_CATEGORIES,
  previewTemplate,
  insertVariable,
  type WhatsAppTemplate,
  type CreateTemplateInput,
  type TemplateCategory,
} from "~/hooks/use-whatsapp-templates";

interface TemplateFormData {
  name: string;
  content: string;
  category: TemplateCategory;
  isDefault: boolean;
}

const VARIABLE_ICONS: Record<string, React.ReactNode> = {
  nombre_cliente: <User className="h-3 w-3" />,
  monto: <DollarSign className="h-3 w-3" />,
  fecha: <Calendar className="h-3 w-3" />,
  telefono: <Phone className="h-3 w-3" />,
  productos: <ShoppingCart className="h-3 w-3" />,
  total: <Receipt className="h-3 w-3" />,
};

function TemplateForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: TemplateFormData;
  onSubmit: (data: TemplateFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [category, setCategory] = useState<TemplateCategory>(initialData?.category ?? "otros");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({
    nombre_cliente: "Juan Pérez",
    monto: "S/ 150.00",
    fecha: new Date().toLocaleDateString("es-PE"),
    telefono: "+51 999 888 777",
    productos: "1 Pollo entero, 2 kg de alitas",
    total: "S/ 150.00",
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInsertVariable = (variableKey: string) => {
    const position = textareaRef.current?.selectionStart ?? content.length;
    const { newContent, newCursorPosition } = insertVariable(
      content,
      position,
      variableKey
    );
    setContent(newContent);
    setCursorPosition(newCursorPosition);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      toast.error("Nombre y contenido son requeridos");
      return;
    }
    onSubmit({ name: name.trim(), content: content.trim(), category, isDefault });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la plantilla</Label>
        <Input
          id="name"
          placeholder="Ej: Recordatorio de pago"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoría</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TemplateCategory)}
          disabled={isSubmitting}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          {TEMPLATE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Contenido del mensaje</Label>
        <Textarea
          id="content"
          ref={textareaRef}
          placeholder="Escribe tu mensaje aquí... Usa las variables disponibles"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={(e) =>
            setCursorPosition(e.currentTarget.selectionStart)
          }
          disabled={isSubmitting}
          rows={6}
          className="resize-none font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Insertar variables
        </Label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((variable) => (
            <Button
              key={variable.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInsertVariable(variable.key)}
              disabled={isSubmitting}
              className="rounded-full text-xs"
            >
              {VARIABLE_ICONS[variable.key]}
              <span className="ml-1">{`{${variable.key}}`}</span>
            </Button>
          ))}
        </div>
      </div>

      {content && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Vista previa</Label>
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-green-900 whitespace-pre-wrap">
                  {previewTemplate(content, previewValues)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATE_VARIABLES.map((variable) => (
              <div key={variable.key} className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {variable.label}:
                </span>
                <Input
                  value={previewValues[variable.key] ?? ""}
                  onChange={(e) =>
                    setPreviewValues((prev) => ({
                      ...prev,
                      [variable.key]: e.target.value,
                    }))
                  }
                  className="h-6 w-24 text-xs px-2"
                  placeholder={variable.example}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
        <div className="flex items-center gap-2">
          <Star
            className={`h-4 w-4 ${
              isDefault ? "text-orange-500 fill-orange-500" : "text-gray-400"
            }`}
          />
          <span className="text-sm">Marcar como plantilla por defecto</span>
        </div>
        <Switch
          checked={isDefault}
          onCheckedChange={setIsDefault}
          disabled={isSubmitting}
        />
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || !content.trim()}
          className="bg-gradient-to-r from-orange-500 to-orange-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

import { Save } from "lucide-react";
import type { TemplateFilters } from "~/hooks/use-whatsapp-templates";

const CATEGORY_COLORS: Record<string, string> = {
  cobranza: "bg-blue-100 text-blue-700",
  ventas: "bg-green-100 text-green-700",
  agradecimiento: "bg-purple-100 text-purple-700",
  entrega: "bg-orange-100 text-orange-700",
  otros: "bg-gray-100 text-gray-700",
};

export default function WhatsAppTemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">("all");
  const filters: TemplateFilters = categoryFilter !== "all" ? { category: categoryFilter } : {};
  const { data: templates, isLoading } = useWhatsAppTemplates(filters);
  const createMutation = useCreateWhatsAppTemplate();
  const updateMutation = useUpdateWhatsAppTemplate();
  const deleteMutation = useDeleteWhatsAppTemplate();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(
    null
  );
  const [deletingTemplate, setDeletingTemplate] = useState<WhatsAppTemplate | null>(
    null
  );

  const handleCreate = async (data: CreateTemplateInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Plantilla creada correctamente");
      setIsCreateDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message || "Error al crear la plantilla");
    }
  };

  const handleUpdate = async (data: TemplateFormData) => {
    if (!editingTemplate) return;
    try {
      await updateMutation.mutateAsync({
        id: editingTemplate.id,
        data,
      });
      toast.success("Plantilla actualizada correctamente");
      setEditingTemplate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message || "Error al actualizar la plantilla");
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteMutation.mutateAsync(deletingTemplate.id);
      toast.success("Plantilla eliminada correctamente");
      setDeletingTemplate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message || "Error al eliminar la plantilla");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config/whatsapp">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">
            Plantillas de Mensajes
          </span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle>Plantillas WhatsApp</CardTitle>
                  <CardDescription>
                    Crea y gestiona plantillas para enviar mensajes a tus clientes
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : !templates?.length ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      No tienes plantillas creadas
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Crea tu primera plantilla para enviar mensajes personalizados
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear plantilla
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        categoryFilter === "all"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Todas
                    </button>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategoryFilter(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          categoryFilter === cat.value
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 rounded-2xl border-2 transition-all hover:shadow-md ${
                          template.isDefault
                            ? "border-orange-200 bg-orange-50/50"
                            : "border-gray-100 bg-white"
                        }`}
                      >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">
                              {template.name}
                            </h3>
                            <Badge
                              className={`rounded-full text-xs ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.otros}`}
                            >
                              {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label || "Otros"}
                            </Badge>
                            {template.isDefault && (
                              <Badge
                                variant="default"
                                className="rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs"
                              >
                                <Star className="h-3 w-3 mr-1 fill-orange-500" />
                                Por defecto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {TEMPLATE_VARIABLES.filter((v) =>
                              template.content.includes(`{${v.key}}`)
                            ).map((variable) => (
                              <Badge
                                key={variable.key}
                                variant="secondary"
                                className="rounded-full text-xs"
                              >
                                {VARIABLE_ICONS[variable.key]}
                                <span className="ml-1">{`{${variable.key}}`}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center rounded-xl h-8 w-8 hover:bg-accent"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem
                              onClick={() => setEditingTemplate(template)}
                              className="rounded-lg cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingTemplate(template)}
                              className="rounded-lg cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Variables disponibles</CardTitle>
              <CardDescription>
                Usa estas variables en tus plantillas para personalizar los mensajes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <div
                    key={variable.key}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      {VARIABLE_ICONS[variable.key]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{variable.label}</p>
                      <code className="text-xs text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded">
                        {`{${variable.key}}`}
                      </code>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Ej: {variable.example}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Plantilla</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla para enviar mensajes personalizados a tus
              clientes
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plantilla</DialogTitle>
            <DialogDescription>Modifica los datos de la plantilla</DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              initialData={{
                name: editingTemplate.name,
                content: editingTemplate.content,
                category: editingTemplate.category || "otros",
                isDefault: editingTemplate.isDefault,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingTemplate(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Eliminar Plantilla
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la plantilla
              <strong>"{deletingTemplate?.name}"</strong>? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
