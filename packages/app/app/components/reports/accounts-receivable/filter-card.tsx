import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { filtersAtom, searchAtom } from "~/atoms/accounts-receivable";

export function FilterCard() {
  const filters = useAtomValue(filtersAtom);
  const setSearch = useSetAtom(searchAtom);

  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardContent className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-10"
            value={filters.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
