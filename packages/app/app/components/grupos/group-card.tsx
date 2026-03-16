import * as React from "react";
import { ChevronRight, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CustomerGroup } from "~/hooks/use-grupos";

export interface GroupCardProps {
	group: CustomerGroup;
	onEdit: (group: CustomerGroup) => void;
	onDelete: (group: CustomerGroup) => void;
	onManageMembers: (group: CustomerGroup) => void;
}

export function GroupCard({
	group,
	onEdit,
	onDelete,
	onManageMembers,
}: GroupCardProps) {
	return (
		<Card className="group relative flex items-center gap-3 rounded-[24px] border border-stone-200/80 bg-white/80 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-stone-300/90">
			<div className="flex flex-1 items-center justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="truncate text-[1.05rem] font-semibold text-foreground sm:text-lg">
						{group.name}
					</p>
					<p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
						<Users className="h-3 w-3" />
						{group.memberCount || 0} miembro
						{(group.memberCount || 0) !== 1 ? "s" : ""}
					</p>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full text-muted-foreground hover:text-orange-500"
						onClick={() => onManageMembers(group)}
						title="Gestionar miembros"
					>
						<UserPlus className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full text-muted-foreground hover:text-orange-500"
						onClick={() => onEdit(group)}
						title="Editar"
					>
						<ChevronRight className="h-4 w-4 rotate-180" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500"
						onClick={() => onDelete(group)}
						title="Eliminar"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</Card>
	);
}

GroupCard.displayName = "GroupCard";
