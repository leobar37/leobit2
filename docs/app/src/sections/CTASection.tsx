import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  MessageCircle, 
  Mail, 
  Phone,
  Sparkles
} from 'lucide-react';

export function CTASection() {
  return (
    <section className="section-padding bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container-max mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              ¡Comienza hoy mismo!
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              ¿Listo para modernizar tu negocio de pollo?
            </h2>

            <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Únete a los polleros que ya están ahorrando tiempo y aumentando sus ventas 
              con nuestra aplicación. La demo es completamente gratuita.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                onClick={() => window.open('https://wa.me/', '_blank')}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Escríbenos por WhatsApp
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-bold text-lg px-8 py-6 rounded-2xl"
                onClick={() => window.location.href = 'mailto:contacto@pollospro.com'}
              >
                <Mail className="w-5 h-5 mr-2" />
                Enviar correo
              </Button>
            </div>

            {/* Contact info */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-white/80">
              <a href="tel:+51987654321" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
                <span>+51 987 654 321</span>
              </a>
              <span className="hidden sm:block">|</span>
              <a href="mailto:contacto@pollospro.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
                <span>contacto@pollospro.com</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
