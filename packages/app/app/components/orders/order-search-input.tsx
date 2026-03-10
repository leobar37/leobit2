import { useAtom } from "jotai";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchTermAtom } from "~/atoms/orders";

export function OrderSearchInput() {
  const [search, setSearch] = useAtom(searchTermAtom);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
