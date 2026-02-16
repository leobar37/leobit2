import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAtom } from "jotai";
import { searchAtom, minBalanceAtom } from "~/atoms/accounts-receivable";

export function FilterCard() {
  const [search, setSearch] = useAtom(searchAtom);
  const [minBalance, setMinBalance] = useAtom(minBalanceAtom);

  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5 text-orange-500" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Monto mínimo (S/)"
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setMinBalance("");
            }}
          >
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
