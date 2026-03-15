/**
 * Groups Management Page
 * Route: /grupos
 * Provides CRUD operations for customer groups and member management
 */

import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { 
  ChevronRight, 
  Plus, 
  Search, 
  Users, 
  Check, 
  X, 
  Trash2,
  UserPlus,
  UserMinus,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useSetLayout } from "~/components/layout/app-layout";
import { useCustomers } from "~/hooks/use-customers";
import { useListSearch } from "~/hooks/use-list-search";
import { toast } from "sonner";
import { getStoredAuthToken, getStoredBusinessId } from "~/lib/session-storage";

// Types
interface GroupMember {
  customerId: string;
  customerName: string;
  addedAt: string;
}

interface CustomerGroup {
  id: string;
  name: string;
  businessId: string;
  syncStatus: string;
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: GroupMember[];
}

// API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5201";

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string, 
  method: string = "GET", 
  body?: unknown
): Promise<T> {
  const token = getStoredAuthToken();
  const businessId = getStoredBusinessId();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (businessId) {
    headers["x-business-id"] = businessId;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Request failed");
  }
  
  return data.data as T;
}

// API functions
async function fetchGroups(): Promise<CustomerGroup[]> {
  return apiCall<CustomerGroup[]>("/api/groups");
}

async function createGroup(name: string): Promise<CustomerGroup> {
  return apiCall<CustomerGroup>("/api/groups", "POST", { name });
}

async function updateGroup(id: string, name: string): Promise<CustomerGroup> {
  return apiCall<CustomerGroup>(`/api/groups/${id}`, "PUT", { name });
}

async function deleteGroup(id: string): Promise<void> {
  return apiCall<void>(`/api/groups/${id}`, "DELETE");
}

async function addMembers(groupId: string, customerIds: string[]): Promise<void> {
  return apiCall<void>(`/api/groups/${groupId}/members`, "POST", { customerIds });
}

async function removeMember(groupId: string, customerId: string): Promise<void> {
  return apiCall<void>(`/api/groups/${groupId}/members/${customerId}`, "DELETE");
}

async function fetchGroupDetails(groupId: string): Promise<CustomerGroup> {
  return apiCall<CustomerGroup>(`/api/groups/${groupId}`);
}

export default function GroupsPage() {
  useSetLayout({ title: "Grupos de Clientes" });
  const navigate = useNavigate();
  
  // State
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Create group dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Edit group dialog
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Delete confirmation
  const [deletingGroup, setDeletingGroup] = useState<CustomerGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Member management dialog
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  
  // Fetch customers for member selection
  const { data: customers } = useCustomers();
  
  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const lowerSearch = search.toLowerCase();
    return groups.filter(group => 
      group.name.toLowerCase().includes(lowerSearch)
    );
  }, [groups, search]);
  
  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);
  
  async function loadGroups() {
    setIsLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Error al cargar grupos");
    } finally {
      setIsLoading(false);
    }
  }
  
  // Create group
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    
    setIsCreating(true);
    try {
      const newGroup = await createGroup(newGroupName.trim());
      setGroups(prev => [...prev, { ...newGroup, memberCount: 0 }]);
      setNewGroupName("");
      setIsCreateDialogOpen(false);
      toast.success("Grupo creado correctamente");
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Error al crear grupo");
    } finally {
      setIsCreating(false);
    }
  }
  
  // Update group
  async function handleUpdateGroup() {
    if (!editingGroup || !editGroupName.trim()) return;
    
    setIsEditing(true);
    try {
      const updated = await updateGroup(editingGroup.id, editGroupName.trim());
      setGroups(prev => prev.map(g => 
        g.id === editingGroup.id ? { ...g, ...updated } : g
      ));
      setEditingGroup(null);
      setEditGroupName("");
      toast.success("Grupo actualizado correctamente");
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Error al actualizar grupo");
    } finally {
      setIsEditing(false);
    }
  }
  
  // Delete group
  async function handleDeleteGroup() {
    if (!deletingGroup) return;
    
    setIsDeleting(true);
    try {
      await deleteGroup(deletingGroup.id);
      setGroups(prev => prev.filter(g => g.id !== deletingGroup.id));
      setDeletingGroup(null);
      toast.success("Grupo eliminado correctamente");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Error al eliminar grupo");
    } finally {
      setIsDeleting(false);
    }
  }
  
  // Open member management
  async function openMemberManagement(group: CustomerGroup) {
    setSelectedGroup(group);
    setIsLoadingMembers(true);
    setIsMemberDialogOpen(true);
    setSelectedCustomerIds(new Set());
    
    try {
      const details = await fetchGroupDetails(group.id);
      setGroupMembers(details.members || []);
    } catch (error) {
      console.error("Error loading group members:", error);
      toast.error("Error al cargar miembros");
    } finally {
      setIsLoadingMembers(false);
    }
  }
  
  // Toggle customer selection
  function toggleCustomerSelection(customerId: string) {
    setSelectedCustomerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  }
  
  // Add selected members
  async function handleAddMembers() {
    if (!selectedGroup || selectedCustomerIds.size === 0) return;
    
    setIsManagingMembers(true);
    try {
      await addMembers(selectedGroup.id, Array.from(selectedCustomerIds));
      
      // Refresh members
      const details = await fetchGroupDetails(selectedGroup.id);
      setGroupMembers(details.members || []);
      
      // Update member count in list
      setGroups(prev => prev.map(g => 
        g.id === selectedGroup.id 
          ? { ...g, memberCount: (g.memberCount || 0) + selectedCustomerIds.size } 
          : g
      ));
      
      setSelectedCustomerIds(new Set());
      toast.success("Miembros agregados correctamente");
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error("Error al agregar miembros");
    } finally {
      setIsManagingMembers(false);
    }
  }
  
  // Remove a member
  async function handleRemoveMember(customerId: string, customerName: string) {
    if (!selectedGroup) return;
    
    try {
      await removeMember(selectedGroup.id, customerId);
      
      // Update local state
      setGroupMembers(prev => prev.filter(m => m.customerId !== customerId));
      
      // Update member count in list
      setGroups(prev => prev.map(g => 
        g.id === selectedGroup.id 
          ? { ...g, memberCount: Math.max(0, (g.memberCount || 1) - 1) } 
          : g
      ));
      
      toast.success(`${customerName} eliminado del grupo`);
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Error al eliminar miembro");
    }
  }
  
  // Get customer IDs that are already members
  const memberCustomerIds = useMemo(() => 
    new Set(groupMembers.map(m => m.customerId)), 
    [groupMembers]
  );
  
  // Get customers not yet in the group
  const availableCustomers = useMemo(() => 
    customers?.filter(c => !memberCustomerIds.has(c.id)) || [],
    [customers, memberCustomerIds]
  );

  // Loading state component
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar grupos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
        />
      </div>

      {/* Empty state */}
      {filteredGroups.length === 0 && !isLoading && (
        <div className="py-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            {search ? "No se encontraron grupos" : "No hay grupos de clientes"}
          </p>
          {!search && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer grupo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Grupo de Clientes</DialogTitle>
                  <DialogDescription>
                    Crea un grupo para organizar tus clientes
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Nombre del grupo"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || isCreating}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Crear grupo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Groups list */}
      {filteredGroups.length > 0 && (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="group relative flex items-center gap-3 rounded-[24px] border border-stone-200/80 bg-white/80 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-stone-300/90"
            >
              {/* Group info */}
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.05rem] font-semibold text-foreground sm:text-lg">
                    {group.name}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {group.memberCount || 0} miembro{(group.memberCount || 0) !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {/* Manage members button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-orange-500"
                    onClick={() => openMemberManagement(group)}
                    title="Gestionar miembros"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  
                  {/* Edit button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-orange-500"
                    onClick={() => {
                      setEditingGroup(group);
                      setEditGroupName(group.name);
                    }}
                    title="Editar"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500"
                    onClick={() => setDeletingGroup(group)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Floating action button */}
      <div className="fixed bottom-28 right-4 z-50">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Grupo de Clientes</DialogTitle>
              <DialogDescription>
                Crea un grupo para organizar tus clientes
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Nombre del grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || isCreating}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Crear grupo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Actualiza el nombre del grupo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nombre del grupo"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateGroup()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingGroup(null)}
              disabled={isEditing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateGroup}
              disabled={!editGroupName.trim() || isEditing}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isEditing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el grupo "{deletingGroup?.name}"? 
              Esta acción eliminará todos los miembros asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingGroup(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Management Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestionar Miembros</DialogTitle>
            <DialogDescription>
              {selectedGroup?.name} - {groupMembers.length} miembro{groupMembers.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Current members */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Miembros actuales</h4>
              {isLoadingMembers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No hay miembros en este grupo</p>
              ) : (
                <div className="space-y-2">
                  {groupMembers.map((member) => (
                    <div
                      key={member.customerId}
                      className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3"
                    >
                      <span className="font-medium">{member.customerName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500"
                        onClick={() => handleRemoveMember(member.customerId, member.customerName)}
                        title="Eliminar del grupo"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add members section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Agregar miembros</h4>
              {availableCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No hay clientes disponibles para agregar</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 hover:border-orange-300"
                      onClick={() => toggleCustomerSelection(customer.id)}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          selectedCustomerIds.has(customer.id)
                            ? "border-orange-500 bg-orange-500"
                            : "border-stone-300 hover:border-orange-400"
                        }`}
                      >
                        {selectedCustomerIds.has(customer.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.name}</p>
                        {customer.dni && (
                          <p className="text-xs text-muted-foreground">DNI: {customer.dni}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsMemberDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button 
              onClick={handleAddMembers}
              disabled={selectedCustomerIds.size === 0 || isManagingMembers}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isManagingMembers ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Agregar {selectedCustomerIds.size > 0 && `(${selectedCustomerIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
