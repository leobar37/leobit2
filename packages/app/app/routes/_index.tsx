import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Avileo" },
    { name: "description", content: "Sistema de ventas de pollo" },
  ];
}

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
