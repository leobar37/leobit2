import type { Route } from "./+types/guia-negocios";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Car,
  ClipboardCheck,
  Droplets,
  FileSearch,
  ListChecks,
  Map,
  PackageCheck,
  Route as RouteIcon,
  ShieldCheck,
  ShoppingBasket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BUSINESS_MODE_DEFAULTS } from "@avileo/shared";
import type { BusinessModeSlug } from "@avileo/shared";
import { cn } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Guia de negocios - Avileo" },
    {
      name: "description",
      content:
        "Guia publica de QA y manual operativo para polleria, agua y cochera en Avileo.",
    },
  ];
}

type BusinessGuide = {
  mode: BusinessModeSlug;
  name: string;
  shortName: string;
  status: string;
  icon: typeof ShoppingBasket;
  accent: "orange" | "sky" | "emerald";
  summary: string;
  sourceDocs: string[];
  surfaces: Array<{ area: string; routes: string }>;
  flows: Array<{ title: string; route: string; steps: string[] }>;
  checklist: string[];
  exactCases: Array<{
    objective: string;
    preconditions: string;
    route: string;
    visibleSteps: string[];
    expectedResult: string;
    expectedEvidence: string;
    restrictions: string;
  }>;
  edgeCases: string[];
  evidence: string[];
  limits: string[];
  future: string[];
};

const ACCENT_STYLES = {
  orange: {
    icon: "bg-orange-100 text-orange-700 ring-orange-200",
    line: "bg-orange-500",
    tab: "data-[state=active]:bg-orange-600 data-[state=active]:text-white",
    text: "text-orange-700",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700 ring-sky-200",
    line: "bg-sky-500",
    tab: "data-[state=active]:bg-sky-600 data-[state=active]:text-white",
    text: "text-sky-700",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    line: "bg-emerald-500",
    tab: "data-[state=active]:bg-emerald-600 data-[state=active]:text-white",
    text: "text-emerald-700",
  },
} as const;

const businessGuides: BusinessGuide[] = [
  {
    mode: "polleria",
    name: "Polleria / venta de pollo",
    shortName: "Polleria",
    status: "Implementado",
    icon: ShoppingBasket,
    accent: "orange",
    summary:
      "Flujo base de Avileo para vender pollo por peso, trabajar en ruta, manejar credito, registrar abonos y cerrar la jornada con kilos llevados, vendidos y devueltos.",
    sourceDocs: [
      "docs/business/polleria/README.md",
      "docs/business/polleria/flujos.md",
      "docs/business/polleria/qa.md",
      "docs/business/polleria/capacidades.md",
      "docs/business/polleria/pendientes.md",
    ],
    surfaces: [
      { area: "Ventas", routes: "/ventas, /ventas/:id, /ventas/:id/editar/calculadora" },
      { area: "Distribucion", routes: "/distribuciones, /distribuciones/nueva, /mi-distribucion" },
      { area: "Clientes y cobranza", routes: "/clientes, /clientes/nuevo, /clientes/:id, /cobros" },
      { area: "Productos", routes: "/productos, /productos/nuevo, /productos/:id" },
      { area: "Operacion diaria", routes: "/visitas" },
      { area: "Reportes", routes: "/dashboard, /reportes, /reportes/cuentas-por-cobrar" },
    ],
    flows: [
      {
        title: "Preparacion de jornada",
        route: "/distribuciones/nueva",
        steps: [
          "Configurar productos, variantes, precios y puntos de venta.",
          "Crear una distribucion diaria para vendedor y punto de venta.",
          "Asignar productos o variantes con cantidades en kilos.",
          "Confirmar la asignacion para que aparezca en Mi distribucion.",
        ],
      },
      {
        title: "Venta en ruta",
        route: "/ventas",
        steps: [
          "Abrir la distribucion del dia o una nueva venta.",
          "Seleccionar cliente cuando aplique.",
          "Registrar peso bruto, tara y variante/precio.",
          "Confirmar total por kilos netos y registrar contado o credito.",
        ],
      },
      {
        title: "Cobranza y cierre",
        route: "/cobros, /distribuciones/:id/editar",
        steps: [
          "Registrar abono sobre deuda de cliente.",
          "Verificar saldo antes y despues del pago.",
          "Cerrar jornada con llevado, vendido y devuelto.",
          "Revisar dashboard y reportes despues de sincronizar o registrar actividad.",
        ],
      },
    ],
    checklist: [
      "Crear o seleccionar negocio con businessMode polleria.",
      "Confirmar rutas de ventas, clientes, distribucion, visitas, cobros y reportes.",
      "Crear producto de pollo con variante por kilo.",
      "Crear cliente recurrente.",
      "Crear distribucion diaria para un vendedor.",
      "Ver distribucion en /mi-distribucion.",
      "Registrar venta al contado con tara y verificar kilos netos.",
      "Registrar venta a credito asociada a cliente.",
      "Registrar abono parcial y confirmar que baja el saldo.",
      "Cerrar distribucion con llevado, vendido y devuelto.",
      "Revisar que reportes y cuentas por cobrar reflejen la actividad.",
    ],
    exactCases: [
      {
        objective: "Validar venta por peso con tara y neto.",
        preconditions: "Negocio polleria, producto por kg y precio configurado.",
        route: "/ventas",
        visibleSteps: [
          "Abrir nueva venta.",
          "Ingresar peso bruto.",
          "Ingresar tara.",
          "Seleccionar variante y precio.",
          "Finalizar al contado.",
        ],
        expectedResult: "El total usa kilos netos y precio por kg.",
        expectedEvidence: "Venta visible con bruto, tara, neto y total calculado.",
        restrictions: "La tara no debe generar kilos netos negativos.",
      },
      {
        objective: "Validar credito y abono parcial.",
        preconditions: "Cliente recurrente creado y metodo de pago disponible.",
        route: "/ventas, /cobros",
        visibleSteps: [
          "Registrar venta a credito asociada al cliente.",
          "Abrir cobros o detalle de cliente.",
          "Registrar abono menor al saldo.",
          "Revisar saldo actualizado.",
        ],
        expectedResult: "La deuda baja sin saldarse por completo.",
        expectedEvidence: "Cliente con saldo antes y despues del abono.",
        restrictions: "Abono mayor a deuda debe rechazarse o normalizarse segun regla vigente.",
      },
      {
        objective: "Validar distribucion y cierre de jornada.",
        preconditions: "Vendedor, punto de venta y productos disponibles.",
        route: "/distribuciones/nueva, /mi-distribucion",
        visibleSteps: [
          "Crear distribucion diaria.",
          "Confirmar asignacion al vendedor.",
          "Abrir Mi distribucion.",
          "Cerrar con llevado, vendido y devuelto.",
        ],
        expectedResult: "La jornada queda reconciliada con cantidades consistentes.",
        expectedEvidence: "Distribucion cerrada y reportes con actividad.",
        restrictions: "El flujo debe conservar ventas offline hasta sincronizacion.",
      },
    ],
    edgeCases: [
      "Venta sin cliente debe ser posible.",
      "Cambiar a otro negocio no debe mostrar datos de polleria anterior.",
      "Ajustes de cobranza compartida no deben romper pagos aislados de cochera.",
    ],
    evidence: [
      "Captura o registro de venta con peso bruto, tara y neto.",
      "Cliente con saldo antes y despues de un abono.",
      "Distribucion cerrada con cantidades consistentes.",
      "Reporte o dashboard actualizado despues de la venta.",
    ],
    limits: [
      "El precio fluctua manualmente.",
      "El cierre depende del registro correcto de vendido y devuelto.",
      "Las ventas sin sincronizar dependen del dispositivo hasta subir.",
    ],
    future: [
      "Refinar validaciones de cierre.",
      "Mejorar ayudas visibles para tara y kilos netos.",
      "Evaluar alertas de deuda por antiguedad.",
    ],
  },
  {
    mode: "agua",
    name: "Distribucion de agua",
    shortName: "Agua",
    status: "Parcial / operativo basico",
    icon: Droplets,
    accent: "sky",
    summary:
      "Flujo para repartir bidones y recargas por unidad. Prioriza entrega y pago contra entrega, con clientes recurrentes y rutas donde aportan al reparto.",
    sourceDocs: [
      "docs/business/agua/README.md",
      "docs/business/agua/flujos.md",
      "docs/business/agua/qa.md",
      "docs/business/agua/capacidades.md",
      "docs/business/agua/pendientes.md",
    ],
    surfaces: [
      { area: "Ventas", routes: "/ventas, /ventas/:id, /ventas/:id/editar" },
      { area: "Entrega / ruta", routes: "/mi-distribucion, /visitas, /distribuciones" },
      { area: "Clientes", routes: "/clientes, /clientes/nuevo, /clientes/:id" },
      { area: "Productos", routes: "/productos, /productos/nuevo, /productos/:id" },
      { area: "Configuracion", routes: "/config, /config/water-routes, /config/payment-methods" },
      { area: "Reportes", routes: "/dashboard, /reportes" },
    ],
    flows: [
      {
        title: "Configuracion inicial",
        route: "/business/create, /productos, /config/water-routes",
        steps: [
          "Crear o seleccionar negocio de agua.",
          "Configurar bidones y recargas por unidad.",
          "Configurar metodos de pago.",
          "Configurar rutas de reparto si aplica.",
        ],
      },
      {
        title: "Cliente recurrente",
        route: "/clientes/nuevo",
        steps: [
          "Registrar cliente con datos de contacto y direccion.",
          "Definir cantidad sugerida de pedido cuando el campo este disponible.",
          "Guardar cliente para futuras entregas.",
        ],
      },
      {
        title: "Entrega / venta",
        route: "/ventas, /mi-distribucion, /visitas",
        steps: [
          "Seleccionar cliente o venta directa.",
          "Elegir Bidon o Recarga.",
          "Ingresar cantidad en unidades.",
          "Cobrar contra entrega con metodo permitido.",
        ],
      },
    ],
    checklist: [
      "Crear o seleccionar negocio con businessMode agua.",
      "Confirmar que no aparece calculadora con tara o kilos netos.",
      "Confirmar productos sugeridos de Bidon y Recarga.",
      "Crear cliente con cantidad sugerida de pedido cuando el campo este disponible.",
      "Registrar venta o entrega por unidad.",
      "Confirmar que el flujo principal favorece pago contra entrega.",
      "Verificar que no se ofrecen abonos parciales como comportamiento base.",
      "Revisar /mi-distribucion o /visitas para confirmar copia y campos de agua.",
      "Revisar dashboard/reportes compartidos despues de una entrega.",
    ],
    exactCases: [
      {
        objective: "Validar entrega por unidad sin peso.",
        preconditions: "Negocio agua y producto Bidon o Recarga configurado.",
        route: "/ventas",
        visibleSteps: [
          "Abrir nueva venta.",
          "Seleccionar Bidon 20L o Recarga 20L.",
          "Ingresar cantidad en unidades.",
          "Registrar pago contra entrega.",
        ],
        expectedResult: "La venta se registra por unidades, sin tara ni kilos netos.",
        expectedEvidence: "Venta de agua con producto, cantidad y total por unidad.",
        restrictions: "No debe aparecer lenguaje de polleria como kilos, tara o cortes.",
      },
      {
        objective: "Validar cliente recurrente con cantidad sugerida.",
        preconditions: "Campo defaultOrderQuantity disponible para agua.",
        route: "/clientes/nuevo",
        visibleSteps: [
          "Crear cliente.",
          "Registrar direccion y contacto.",
          "Guardar cantidad sugerida de pedido.",
          "Volver a usar el cliente en una entrega.",
        ],
        expectedResult: "El cliente queda disponible para reparto recurrente.",
        expectedEvidence: "Cliente con cantidad sugerida y venta asociada.",
        restrictions: "No debe exigir frecuencia automatica porque useFrequency esta desactivado.",
      },
      {
        objective: "Validar que no se ofrecen abonos parciales por defecto.",
        preconditions: "Negocio agua activo y metodos de pago configurados.",
        route: "/ventas, /cobros",
        visibleSteps: [
          "Intentar registrar una entrega.",
          "Revisar modalidades de pago visibles.",
          "Revisar que el flujo favorezca pago contra entrega.",
        ],
        expectedResult: "No se promueve liquidacion parcial como flujo base de agua.",
        expectedEvidence: "Pantalla sin opciones de abono parcial para el caso base.",
        restrictions: "supportsCreditSettlement y supportsPartialSettlement estan desactivados.",
      },
    ],
    edgeCases: [
      "No debe exigir envases ni depositos para vender agua.",
      "Cambiar desde polleria no debe conservar calculadora de peso.",
      "Cambiar desde cochera no debe conservar rutas o KPIs de cochera.",
    ],
    evidence: [
      "Venta de Bidon 20L o Recarga 20L por unidad.",
      "Cliente con cantidad sugerida.",
      "Pantalla de venta sin tara ni peso neto.",
      "Reporte o dashboard con actividad despues de la entrega.",
    ],
    limits: [
      "No se rastrea cada envase por numero de serie.",
      "No se administra un libro de depositos.",
      "No se auto-generan visitas por frecuencia.",
    ],
    future: [
      "Definir si envases retornables seran capacidad oficial.",
      "Definir depositos de garantia y devoluciones.",
      "Crear motor de recurrencia para visitas o rutas programadas.",
    ],
  },
  {
    mode: "cochera",
    name: "Cochera / estacionamiento",
    shortName: "Cochera",
    status: "Implementado online-only",
    icon: Car,
    accent: "emerald",
    summary:
      "Vertical dedicado para registrar entradas por placa, ver vehiculos activos, cobrar salidas con tarifa/gracia y revisar ingresos sin mezclar pagos con polleria.",
    sourceDocs: [
      "docs/business/cochera/README.md",
      "docs/business/cochera/flujos.md",
      "docs/business/cochera/qa.md",
      "docs/business/cochera/capacidades.md",
      "docs/business/cochera/pendientes.md",
    ],
    surfaces: [
      { area: "Operacion diaria", routes: "/cochera, /cochera/entrada, /cochera/cobrar/:id" },
      { area: "Configuracion", routes: "/config, /config/cochera" },
      { area: "Dashboard", routes: "/dashboard" },
      { area: "Reportes", routes: "/reportes" },
      { area: "Clientes / vehiculos", routes: "Superficies y hooks propios cuando aplica" },
    ],
    flows: [
      {
        title: "Configuracion de cochera",
        route: "/config/cochera",
        steps: [
          "Definir tarifa por hora, tarifa diaria, gracia y espacios.",
          "Activar metodos de pago permitidos.",
          "Activar tipos de vehiculo.",
          "Configurar tarifa propia por tipo si aplica.",
        ],
      },
      {
        title: "Entrada y activos",
        route: "/cochera/entrada, /cochera",
        steps: [
          "Ingresar placa, tipo de vehiculo y notas opcionales.",
          "Normalizar placa a mayusculas.",
          "Guardar snapshot de tarifa vigente.",
          "Ver vehiculo activo y buscar por placa.",
        ],
      },
      {
        title: "Cobro de salida",
        route: "/cochera/cobrar/:id",
        steps: [
          "Abrir cobro desde una sesion activa.",
          "Revisar ingreso, tiempo, tarifa y total.",
          "Aplicar descuento si corresponde.",
          "Seleccionar metodo permitido y finalizar cobro.",
        ],
      },
    ],
    checklist: [
      "Crear o seleccionar negocio con businessMode cochera.",
      "Confirmar que dashboard usa /dashboard, no /cochera/dashboard.",
      "Confirmar que reportes usa /reportes, no /cochera/reportes.",
      "Abrir /config/cochera y guardar tarifa, gracia, espacios y metodos de pago.",
      "Registrar entrada en /cochera/entrada.",
      "Ver vehiculo activo en /cochera.",
      "Buscar vehiculo por placa o fragmento.",
      "Intentar duplicar una placa activa y verificar error claro.",
      "Cobrar salida en /cochera/cobrar/:id.",
      "Confirmar que la sesion cobrada desaparece de activos.",
      "Revisar dashboard y reportes despues del cobro.",
      "Cambiar a negocio no cochera y confirmar que no operan rutas de cochera.",
    ],
    exactCases: [
      {
        objective: "Validar configuracion de tarifa y metodos.",
        preconditions: "Negocio cochera y usuario con permisos de configuracion.",
        route: "/config/cochera",
        visibleSteps: [
          "Abrir configuracion de cochera.",
          "Guardar tarifa, gracia, espacios y metodos.",
          "Recargar o volver a entrar.",
        ],
        expectedResult: "La configuracion persiste y se usa en nuevos cobros.",
        expectedEvidence: "Valores guardados visibles despues de recargar.",
        restrictions: "No crear rutas duplicadas de configuracion por fuera de /config/cochera.",
      },
      {
        objective: "Validar entrada y bloqueo de placa duplicada.",
        preconditions: "Configuracion de cochera guardada.",
        route: "/cochera/entrada, /cochera",
        visibleSteps: [
          "Registrar entrada con placa en minusculas o con espacios.",
          "Confirmar que aparece activa.",
          "Intentar registrar la misma placa otra vez.",
        ],
        expectedResult: "La placa se normaliza y el duplicado activo muestra error claro.",
        expectedEvidence: "Sesion activa con placa normalizada y mensaje de duplicado.",
        restrictions: "Debe filtrarse por businessId para no mezclar sesiones entre negocios.",
      },
      {
        objective: "Validar cobro de salida y aislamiento frente a polleria.",
        preconditions: "Sesion activa de cochera creada.",
        route: "/cochera/cobrar/:id, /dashboard, /reportes",
        visibleSteps: [
          "Abrir cobro desde vehiculo activo.",
          "Revisar total calculado.",
          "Finalizar cobro con metodo permitido.",
          "Revisar activos, dashboard y reportes.",
        ],
        expectedResult: "La sesion sale de activos y los ingresos aparecen en superficies de cochera.",
        expectedEvidence: "Vehiculo fuera de activos y reporte/dashboard actualizado.",
        restrictions: "No debe reutilizar /cobros de polleria sin frontera explicita.",
      },
    ],
    edgeCases: [
      "Placa vacia o demasiado corta no debe guardarse.",
      "Metodo de pago desactivado no debe estar disponible en checkout.",
      "Vehiculo ya cobrado no debe aparecer como activo.",
      "Datos de cochera no deben filtrarse a polleria o agua al cambiar de negocio.",
    ],
    evidence: [
      "Configuracion guardada y recargada.",
      "Sesion activa creada con placa normalizada.",
      "Error por placa duplicada activa.",
      "Cobro finalizado con monto calculado.",
      "Dashboard o reporte con ingreso actualizado.",
    ],
    limits: [
      "Cochera es online-only en la fase actual.",
      "No hay integracion con barreras, camaras o reconocimiento de placa.",
      "Las tarifas por evento, noche o fin de semana no forman parte del motor actual.",
    ],
    future: [
      "Evaluar clientes abonados o mensuales.",
      "Evaluar control de caja por turno.",
      "Fortalecer permisos entre admin y operador.",
    ],
  },
];

export default function GuiaNegociosPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-stone-600">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" />
              Volver a Avileo
            </Link>
          </Button>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit bg-white">
                Guia publica
              </Badge>
              <div className="space-y-2">
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-stone-950 sm:text-4xl">
                  Guia QA y manual por tipo de negocio
                </h1>
                <p className="max-w-2xl text-base leading-7 text-stone-600">
                  Checklist operativo para validar que polleria, agua y cochera funcionan segun
                  su flujo real. Esta pagina no requiere iniciar sesion.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-stone-200 bg-stone-100 p-2">
              {businessGuides.map((business) => {
                const Icon = business.icon;
                const accent = ACCENT_STYLES[business.accent];

                return (
                  <a
                    key={business.mode}
                    href={`#${business.mode}`}
                    className="flex min-h-24 flex-col justify-between rounded-md bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md ring-1",
                        accent.icon
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-stone-900">{business.shortName}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoPill
            icon={ShieldCheck}
            title="Fuente funcional"
            text="Basado en docs/business y defaults de businessMode."
          />
          <InfoPill
            icon={FileSearch}
            title="Casos exactos"
            text="Cada caso incluye ruta, pasos, resultado y evidencia."
          />
          <InfoPill
            icon={AlertTriangle}
            title="Pendientes separados"
            text="Lo futuro no se presenta como implementado."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <Tabs defaultValue="polleria" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-stone-200 p-1">
            {businessGuides.map((business) => {
              const accent = ACCENT_STYLES[business.accent];

              return (
                <TabsTrigger
                  key={business.mode}
                  value={business.mode}
                  className={cn("min-h-11 rounded-md text-xs sm:text-sm", accent.tab)}
                >
                  {business.shortName}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {businessGuides.map((business) => (
            <TabsContent key={business.mode} value={business.mode} id={business.mode}>
              <BusinessSection business={business} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </main>
  );
}

function BusinessSection({ business }: { business: BusinessGuide }) {
  const Icon = business.icon;
  const accent = ACCENT_STYLES[business.accent];
  const flags = BUSINESS_MODE_DEFAULTS[business.mode];

  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className={cn("h-1.5", accent.line)} />
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="space-y-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg ring-1",
                accent.icon
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-stone-950">{business.name}</h2>
                <Badge variant="outline">{business.mode}</Badge>
              </div>
              <p className="text-sm font-medium text-stone-500">{business.status}</p>
              <p className="leading-7 text-stone-700">{business.summary}</p>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
              <PackageCheck className="h-4 w-4" />
              Capacidades segun defaults
            </h3>
            <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
              <Fact label="Unidad" value={flags.defaultUnit} />
              <Fact label="Calculadora" value={flags.saleCalculatorTitle} />
              <Fact label="Credito" value={flags.supportsCreditSettlement ? "Si" : "No"} />
              <Fact label="Abono parcial" value={flags.supportsPartialSettlement ? "Si" : "No"} />
              <Fact label="Tara" value={flags.useTara ? "Si" : "No"} />
              <Fact label="Visitas" value={flags.showVisitStatus ? "Si" : "No"} />
            </div>
          </div>

          <PlainList icon={Map} title="Rutas principales" items={business.surfaces} />
          <Checklist title="Checklist QA / manual" items={business.checklist} />
        </div>

        <div className="space-y-5">
          <FlowList flows={business.flows} />
          <ExactCases cases={business.exactCases} accentClass={accent.text} />
          <TextBlock icon={ListChecks} title="Casos borde" items={business.edgeCases} />
          <TextBlock icon={BadgeCheck} title="Evidencia recomendada" items={business.evidence} />
          <TextBlock icon={AlertTriangle} title="Limites actuales" items={business.limits} />
          <TextBlock icon={BookOpenCheck} title="Pendientes / futuro" items={business.future} />

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-stone-900">Documentos fuente</h3>
            <ul className="space-y-2">
              {business.sourceDocs.map((doc) => (
                <li key={doc} className="font-mono text-xs text-stone-600">
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

function InfoPill({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-24 gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <span className="block text-xs font-medium uppercase text-stone-500">{label}</span>
      <span className="text-sm font-semibold text-stone-900">{value}</span>
    </div>
  );
}

function PlainList({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Map;
  title: string;
  items: Array<{ area: string; routes: string }>;
}) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.area} className="grid gap-1">
            <dt className="text-sm font-semibold text-stone-800">{item.area}</dt>
            <dd className="font-mono text-xs leading-5 text-stone-600">{item.routes}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
        <ClipboardCheck className="h-4 w-4" />
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-stone-700">
            <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-sm border border-stone-300 bg-white" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlowList({ flows }: { flows: BusinessGuide["flows"] }) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
        <RouteIcon className="h-4 w-4" />
        Flujo operativo
      </h3>
      <div className="space-y-4">
        {flows.map((flow, index) => (
          <div key={flow.title} className="grid gap-2 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-900 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <div>
                <h4 className="font-semibold text-stone-950">{flow.title}</h4>
                <p className="font-mono text-xs text-stone-500">{flow.route}</p>
              </div>
            </div>
            <ol className="ml-10 list-decimal space-y-1 text-sm leading-6 text-stone-700">
              {flow.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExactCases({
  cases,
  accentClass,
}: {
  cases: BusinessGuide["exactCases"];
  accentClass: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
        <FileSearch className="h-4 w-4" />
        Casos exactos a recopilar y probar
      </h3>
      <div className="space-y-4">
        {cases.map((item) => (
          <div key={item.objective} className="rounded-md bg-stone-50 p-4">
            <h4 className={cn("font-semibold", accentClass)}>{item.objective}</h4>
            <dl className="mt-3 grid gap-3 text-sm text-stone-700">
              <CaseFact label="Precondiciones" value={item.preconditions} />
              <CaseFact label="Ruta principal" value={item.route} mono />
              <div>
                <dt className="font-semibold text-stone-900">Pasos visibles</dt>
                <dd>
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {item.visibleSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </dd>
              </div>
              <CaseFact label="Resultado esperado" value={item.expectedResult} />
              <CaseFact label="Evidencia esperada" value={item.expectedEvidence} />
              <CaseFact label="Restricciones" value={item.restrictions} />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function CaseFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-semibold text-stone-900">{label}</dt>
      <dd className={cn("mt-1 leading-6", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function TextBlock({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof AlertTriangle;
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <ul className="space-y-2 text-sm leading-6 text-stone-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
