import { Link, useLocation } from "react-router";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Home,
  ShoppingCart,
  ClipboardList,
  Users,
  Menu,
  LogOut,
  User,
  ArrowLeft,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useClearSyncStorage } from "@/hooks/use-clear-sync-storage";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const menuItems = [
  { icon: Home, label: "Inicio", href: "/dashboard" },
  { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
  { icon: Wallet, label: "Cobros", href: "/cobros" },
  { icon: Users, label: "Clientes", href: "/clientes" },
  { icon: Menu, label: "Más", href: "/config" },
];

interface LayoutConfig {
  title?: string;
  actions?: ReactNode;
  showBottomNav?: boolean;
  showBackButton?: boolean;
  backHref?: string;
}

interface LayoutContextValue {
  config: LayoutConfig;
  setConfig: (config: LayoutConfig) => void;
  toolbarPortalHost: HTMLDivElement | null;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within an AppLayout");
  }
  return context;
}

export function useSetLayout(config: LayoutConfig) {
  const { setConfig } = useLayout();

  const stableConfig = useMemo(
    () => ({
      title: config.title,
      showBottomNav: config.showBottomNav,
      showBackButton: config.showBackButton,
      backHref: config.backHref,
    }),
    [config.title, config.showBottomNav, config.showBackButton, config.backHref]
  );

  const actionsRef = useRef(config.actions);
  actionsRef.current = config.actions;

  useEffect(() => {
    setConfig({
      ...stableConfig,
      actions: actionsRef.current,
    });
  }, [stableConfig, setConfig]);
}

function ClearSyncButton() {
  const clearSync = useClearSyncStorage();

  const handleClear = async () => {
    if (!confirm("¿Estás seguro? Esto limpiará solo los datos locales de sincronización y conservará tu sesión.")) {
      return;
    }

    try {
      await clearSync.mutateAsync({ preserveSession: true });
    } catch (error) {
      console.error("Failed to clear storage:", error);
      // If automatic cleanup fails, show manual instructions
      alert(
        "No se pudo reiniciar automáticamente.\n\n" +
        "Para limpiar manualmente:\n" +
        "1. Abre las Developer Tools (F12)\n" +
        "2. Ve a Application > Storage\n" +
        "3. Haz clic en 'Clear site data'\n" +
        "4. Recarga la página (F5)"
      );
    }
  };

  return (
    <Button
      variant="ghost"
      className="w-full rounded-xl text-muted-foreground hover:text-orange-600"
      onClick={handleClear}
      disabled={clearSync.isPending}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${clearSync.isPending ? "animate-spin" : ""}`} />
      {clearSync.isPending ? "Reiniciando..." : "Reiniciar sincronización"}
    </Button>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [toolbarPortalHost, setToolbarPortalHost] = useState<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<LayoutConfig>({
    title: "Avileo",
    showBottomNav: true,
    showBackButton: false,
  });

  useEffect(() => {
    setConfig({
      title: "Avileo",
      showBottomNav: true,
      showBackButton: false,
    });
  }, [location.pathname]);

  const {
    title = "Avileo",
    actions,
    showBottomNav = true,
    showBackButton = false,
    backHref = "/dashboard",
  } = config;

  return (
    <LayoutContext.Provider value={{ config, setConfig, toolbarPortalHost }}>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-3 sm:px-4">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Link to={backHref} className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
                  <ArrowLeft className="h-5 w-5 pointer-events-none" />
                </Link>
              )}

              {title === "Avileo" && !showBackButton ? (
                <>
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <span className="font-bold text-lg text-foreground">Avileo</span>
                </>
              ) : (
                <h1 className="font-bold text-lg">{title}</h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              {actions}

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <User className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Perfil</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold">
                          {user?.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={logout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesion
                    </Button>

                    <ClearSyncButton />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className={`px-3 py-4 sm:px-4 ${showBottomNav ? "pb-24" : "pb-8"}`}>
          {children}
        </main>

        {showBottomNav && (
          <div
            ref={setToolbarPortalHost}
            className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 pointer-events-none"
          >
            <div className="px-3 sm:px-4 py-4" />
          </div>
        )}

        {showBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 px-3 sm:px-4 py-2">
            <div className="flex items-center justify-around max-w-md mx-auto">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                      isActive
                        ? "bg-orange-100 text-orange-600"
                        : "hover:bg-orange-50"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-orange-600" : "text-muted-foreground"}`} />
                    <span className={`text-xs ${isActive ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </LayoutContext.Provider>
  );
}
