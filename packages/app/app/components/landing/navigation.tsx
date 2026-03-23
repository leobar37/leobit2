import { Link } from "react-router";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Avileo</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">Caracteristicas</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">Como funciona</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="text-slate-300 hover:text-white">
              <Link to="/login">Iniciar sesion</Link>
            </Button>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link to="/register">Prueba gratis</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
