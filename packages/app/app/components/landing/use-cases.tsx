import { motion } from "framer-motion";
import { Droplets, Drum, Building2, Truck, Users, Calculator, Car, Clock, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const verticals = [
  {
    id: "agua",
    label: "Reparto de Agua",
    shortLabel: "Agua",
    icon: Droplets,
    benefits: [
      { icon: Truck, text: "Registra tus rutas de reparto desde el celular" },
      { icon: Drum, text: "Controla pedidos de bidones y entregas del día" },
      { icon: DollarSign, text: "Cobra al instante y lleva la cuenta de cada cliente" },
    ],
    summary: "Olvida el cuaderno de rutas. Tus repartos, entregas y cobros en una sola app.",
  },
  {
    id: "avicola",
    label: "Avícolas / Polleros",
    shortLabel: "Avícola",
    icon: Building2,
    benefits: [
      { icon: Calculator, text: "Calcula peso por precio al instante, sin tara manual" },
      { icon: Users, text: "Asigna inventario y controla lo que vende cada colaborador" },
      { icon: DollarSign, text: "Sabes quién debe, cuánto y qué se cobró hoy" },
    ],
    summary: "Del mercado a tu dashboard. Ventas, inventario y cobranza en tiempo real.",
  },
  {
    id: "cochera",
    label: "Cocheras",
    shortLabel: "Cochera",
    icon: Car,
    benefits: [
      { icon: Clock, text: "Registra entrada y salida de vehículos al instante" },
      { icon: Car, text: "Lleva el control de tu cochera y los espacios ocupados" },
      { icon: DollarSign, text: "Cobra por tiempo o tarifa fija y revisa tus ingresos del día" },
    ],
    summary: "Controla tu cochera desde el celular. Entradas, salidas e ingresos claros.",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Hecho para negocios que hoy viven en cuaderno
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Avileo se adapta a tu rubro. Elige tu negocio y descubre cómo dejar el papel.
          </p>
        </motion.div>

        <Tabs defaultValue="agua" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 gap-1.5 bg-muted p-1.5 rounded-xl sm:inline-flex sm:w-auto">
              {verticals.map((v) => (
                <TabsTrigger
                  key={v.id}
                  value={v.id}
                  aria-label={v.label}
                  title={v.label}
                  className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <v.icon className="w-4 h-4" aria-hidden="true" />
                  <span className="max-w-full truncate">{v.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {verticals.map((v) => (
            <TabsContent key={v.id} value={v.id} className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="bg-background rounded-2xl p-6 sm:p-8 shadow-sm max-w-3xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <v.icon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{v.label}</h3>
                      <p className="text-sm text-muted-foreground">{v.summary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {v.benefits.map((b, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-muted/30 rounded-xl p-4"
                      >
                        <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <b.icon className="w-4 h-4 text-orange-600" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
