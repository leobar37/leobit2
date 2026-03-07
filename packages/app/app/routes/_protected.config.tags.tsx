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
import { TagForm, TagBadge } from "~/components/tags";
import { useTags, useDeleteTag, type Tag } from "~/hooks/use-tags";

export default function TagsConfigPage() {
  const { data: tags, isLoading } = useTags();
  const deleteTag = useDeleteTag();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteTag.mutateAsync(id);
      toast.success("Etiqueta eliminada");
    } catch (error) {
      toast.error("Error al eliminar la etiqueta");
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4">
          <Link to="/config">
            <Button variant="ghost" size="icon" className="rounded-xl mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg text-foreground">Etiquetas</span>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          {/* Intro Card */}
          <Card className="border-0 shadow-lg rounded-3xl">
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
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando etiquetas...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && tags?.length === 0 && (
            <Card className="border-0 shadow-md rounded-2xl">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No tienes etiquetas creadas
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea tu primera etiqueta para empezar a segmentar clientes
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tags List */}
          <div className="space-y-3">
            {tags?.map((tag) => (
              <Card
                key={tag.id}
                className="border-0 shadow-md rounded-2xl hover:shadow-lg transition-shadow"
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
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* FAB - New Tag */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-28 right-4 z-50 h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

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
    </div>
  );
}
