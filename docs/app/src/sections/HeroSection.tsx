import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Calculator, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  CheckCircle2,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-warm">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-300/30 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-200/20 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container-max mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6"
            >
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Software para Pollerías
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6"
            >
              Gestión Inteligente para tu{' '}
              <span className="text-gradient">Negocio de Pollo</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Simplifica la venta de pollo vivo y pelado, gestiona cuentas por cobrar, 
              controla inventario y envía catálogos a tus clientes. Todo en una sola app.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10"
            >
              <Button 
                onClick={() => scrollToSection('calculadora')}
                className="btn-primary text-lg px-8 py-4"
              >
                Probar Calculadora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                onClick={() => scrollToSection('flujo')}
                variant="outline"
                className="btn-secondary text-lg px-8 py-4"
              >
                <Play className="w-5 h-5 mr-2" />
                Ver Demo
              </Button>
            </motion.div>

            {/* Features list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              {[
                'Calculadora inteligente',
                'Cuentas por cobrar',
                'Catálogo de productos',
                'Pedidos por WhatsApp'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right content - Stats cards */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 hover-lift"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">3</h3>
                <p className="text-gray-600 text-sm">Valores para calcular</p>
                <p className="text-xs text-orange-600 mt-2">Ingresa 2, calcula el 3ro</p>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 hover-lift mt-8"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">100%</h3>
                <p className="text-gray-600 text-sm">Control de clientes</p>
                <p className="text-xs text-blue-600 mt-2">Cuentas por cobrar</p>
              </motion.div>

              {/* Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 hover-lift"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/25">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">Catálogo</h3>
                <p className="text-gray-600 text-sm">Digital de productos</p>
                <p className="text-xs text-green-600 mt-2">Pedidos en línea</p>
              </motion.div>

              {/* Card 4 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 hover-lift mt-8"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-1">+30%</h3>
                <p className="text-gray-600 text-sm">Más eficiencia</p>
                <p className="text-xs text-purple-600 mt-2">En tus ventas diarias</p>
              </motion.div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-4 -left-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-2xl shadow-xl animate-float"
            >
              <p className="font-bold text-lg">¡Gratis!</p>
              <p className="text-sm opacity-90">Prueba la demo</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
