import { useState } from "react";
import { Link } from "react-router";
import { Route, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "~/components/theme";
import { cn } from "~/lib/utils";

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Características" },
    { href: "#use-cases", label: "Rubros" },
    { href: "#how-it-works", label: "Cómo funciona" },
    { href: "#pricing", label: "Precios" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border/50 backdrop-blur-sm" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center" aria-hidden="true">
              <Route className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Avileo</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-muted-foreground hover:text-foreground">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild className="hidden md:inline-flex bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
              <Link to="/register">Prueba gratis</Link>
            </Button>
            <button
              type="button"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      <div
        id="mobile-navigation"
        aria-hidden={!mobileMenuOpen}
        className={cn(
          "md:hidden overflow-hidden border-t border-border/50 bg-background transition-all duration-300",
          mobileMenuOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="px-4 py-3 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              {link.label}
            </a>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login" tabIndex={mobileMenuOpen ? 0 : -1}>
                Iniciar sesión
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link to="/register" tabIndex={mobileMenuOpen ? 0 : -1}>
                Prueba gratis
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
