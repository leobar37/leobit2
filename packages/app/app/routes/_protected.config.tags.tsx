// @ts-nocheck - Route file with complex type errors
/**
 * Tags Configuration Page
 * Manage customer tags for segmentation
 */
import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppDrawer } from "~/components/ui/app-drawer";
import { MobileShell, MobileSlot, MobilePage } from "~/components/mobile";
import { TagForm, TagBadge } from "~/components/tags";
import { useTags, useDeleteTag, type Tag } from "~/hooks/use-tags";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";

export default function TagsConfigPage() {
  const { data: tags, isLoading } = useTags();
  const deleteTag = useDeleteTag();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar etiqueta",
      description: "¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteTag.mutateAsync(id);
        toast.success("Etiqueta eliminada");
      } catch (error) {
        toast.error("Error al eliminar la etiqueta");
      }
    }
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
  };

  return (
    <>
      <MobileSlot name="header:left" priority={10}>
        <Link
          to="/config"
          className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 pointer-events-none" />
        </Link>
      </MobileSlot>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate font-bold text-lg tracking-tight">Etiquetas</h1>
      </MobileSlot>

      <MobilePage.Root maxWidth="md" className="space-y-4">
        {/* Intro Card */}
        <MobilePage.Card variant="flat">
          <CardHeader>
            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-4">
              <TagIcon className="h-8 w-8 text-pink-600" />
            </div>
            <CardTitle>Gestionar Etiquetas</CardTitle>
            <CardDescription>
              Crea etiquetas para segmentar tus clientes y facilitar la
              mensajería masiva
            </CardDescription>
          </CardHeader>
        </MobilePage.Card>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando etiquetas...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tags?.length === 0 && (
          <MobilePage.Card variant="soft">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No tienes etiquetas creadas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea tu primera etiqueta para empezar a segmentar clientes
              </p>
            </CardContent>
          </MobilePage.Card>
        )}

        {/* Tags List */}
        <div className="space-y-3">
          {tags?.map((tag) => (
            <MobilePage.Card
              key={tag.id}
              variant="soft"
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tag.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tag.customerCount} cliente
                    {tag.customerCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg h-9 w-9"
                    onClick={() => openEditModal(tag)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(tag.id)}
                    disabled={deleteTag.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </MobilePage.Card>
          ))}
        </div>
      </MobilePage.Root>

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={openCreateModal}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>

      {/* Create/Edit Drawer */}
      <AppDrawer
        open={isModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeModal();
        }}
      >
        <AppDrawer.Header
          title={editingTag ? "Editar Etiqueta" : "Nueva Etiqueta"}
          icon={<TagIcon className="h-5 w-5" />}
          onClose={closeModal}
        />
        <AppDrawer.Body>
          <TagForm tag={editingTag} onClose={closeModal} />
        </AppDrawer.Body>
      </AppDrawer>

      <ConfirmDialog />
    </>
  );
}
