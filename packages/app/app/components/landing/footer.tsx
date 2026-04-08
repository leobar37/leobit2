import { Route } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <Route className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Avileo</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Terminos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Avileo. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
