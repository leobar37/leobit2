import { Link } from "react-router";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Route className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Avileo</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Caracteristicas</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/login">Iniciar sesion</Link>
            </Button>
            <Button size="sm" asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
              <Link to="/register">Prueba gratis</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
