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
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SyncDevToolsDrawer } from "~/components/sync/sync-devtools-drawer";
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
  { icon: Calendar, label: "Visitas", href: "/visitas" },
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
    [
      config.title,
      config.showBottomNav,
      config.showBackButton,
      config.backHref,
    ],
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

interface AppLayoutProps {
  children: ReactNode;
  headerAccessory?: ReactNode;
}

export function AppLayout({ children, headerAccessory }: AppLayoutProps) {
  const { user, logout, isLoggingOut } = useAuth();
  const location = useLocation();
  const [toolbarPortalHost, setToolbarPortalHost] =
    useState<HTMLDivElement | null>(null);
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
      <div className="h-screen h-dvh app-shell flex flex-col">
        <header className="sticky top-0 z-50 border-b shell-surface">
          <div className="flex items-center justify-between h-16 px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              {showBackButton && (
                <Link
                  to={backHref}
                  className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-5 w-5 pointer-events-none" />
                </Link>
              )}

              {title === "Avileo" && !showBackButton ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 shadow-sm">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <span className="truncate font-bold text-lg tracking-tight text-foreground">
                    Avileo
                  </span>
                </Link>
              ) : (
                <h1 className="truncate font-bold text-lg tracking-tight">
                  {title}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {actions}
              {headerAccessory}

              <Sheet>
                <SheetTrigger
                  className="inline-flex items-center justify-center h-9 w-9 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <User className="h-5 w-5" />
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
                        <p className="text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={logout}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <>
                          <svg
                            className="mr-2 h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Cerrando...
                        </>
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Cerrar sesion
                        </>
                      )}
                    </Button>

                    <SyncDevToolsDrawer />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main
          className={`flex-1 overflow-y-auto overscroll-y-contain px-3 py-5 sm:px-4 ${showBottomNav ? "pb-24" : "pb-8"}`}
        >
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
          <nav className="fixed bottom-0 left-0 right-0 border-t shell-surface px-3 sm:px-4 py-2.5">
            <div className="flex items-center justify-around max-w-md mx-auto">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`shell-nav-item flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-colors ${
                      isActive
                        ? "shell-nav-active text-orange-700"
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${isActive ? "text-orange-600" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`text-xs ${isActive ? "font-semibold text-orange-700" : "text-muted-foreground"}`}
                    >
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
