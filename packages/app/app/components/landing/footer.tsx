import { Route } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Route className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">Avileo</span>
          </div>
          <div className="flex items-center gap-6 text-muted-foreground text-sm">
            <a href="#" className="hover:text-foreground transition-colors">Términos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidad</a>
            <a href="#" className="hover:text-foreground transition-colors">Contacto</a>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 Avileo. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
