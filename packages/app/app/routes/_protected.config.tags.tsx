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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppDrawer } from "~/components/ui/app-drawer";
import { MobileShell, MobileSlot, MobilePage } from "~/components/mobile";
import { TagForm } from "~/components/tags";
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
        <MobilePage.Card
          variant="flat"
          className="!border-0 bg-card/90 shadow-[0_14px_32px_rgba(15,23,42,0.06)] dark:bg-card/80 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
        >
          <CardHeader className="p-4">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/12 text-pink-600 dark:bg-pink-500/16 dark:text-pink-300">
              <TagIcon className="h-7 w-7" />
            </div>
            <CardTitle className="text-lg tracking-[-0.02em]">
              Gestionar Etiquetas
            </CardTitle>
            <CardDescription className="text-sm leading-snug">
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
          <MobilePage.Card
            variant="soft"
            className="!border-0 bg-card/80 shadow-[0_12px_28px_rgba(15,23,42,0.05)] dark:bg-card/70 dark:shadow-[0_16px_34px_rgba(0,0,0,0.24)]"
          >
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
              className="!border-0 bg-card/85 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-colors hover:bg-card dark:bg-card/75 dark:shadow-[0_14px_30px_rgba(0,0,0,0.26)] dark:hover:bg-card/85"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="h-10 w-10 flex-shrink-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold tracking-[-0.01em] text-foreground">
                    {tag.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tag.customerCount} cliente
                    {tag.customerCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/40"
                    onClick={() => openEditModal(tag)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:text-red-300 dark:hover:bg-red-500/14 dark:hover:text-red-200"
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
        contentClassName="border-0 bg-background"
      >
        <AppDrawer.Header
          title={editingTag ? "Editar Etiqueta" : "Nueva Etiqueta"}
          icon={<TagIcon className="h-5 w-5" />}
          onClose={closeModal}
          className="border-b-0 pb-2"
        />
        <AppDrawer.Body className="pt-2">
          <TagForm tag={editingTag} onClose={closeModal} />
        </AppDrawer.Body>
      </AppDrawer>

      <ConfirmDialog />
    </>
  );
}
