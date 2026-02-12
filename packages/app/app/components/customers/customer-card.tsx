import { User, Phone, MapPin, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "~/lib/db/schema";

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
  showDebt?: boolean;
}

export function CustomerCard({ customer, onClick, showDebt = false }: CustomerCardProps) {
  return (
    <Card 
      className="border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="h-6 w-6 text-orange-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {customer.name}
            </h3>
            
            <div className="mt-2 space-y-1">
              {customer.dni && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{customer.dni}</span>
                </div>
              )}
              
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}
              
              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
