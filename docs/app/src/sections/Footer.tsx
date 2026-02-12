import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Mail, 
  Phone, 
  MapPin,
  Heart
} from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-max mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                P
              </div>
              <span className="text-xl font-bold text-white">PollosPro</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Software inteligente para la gestión de pollerías. 
              Simplificamos tu día a día para que puedas enfocarte en lo que más importa: 
              vender más pollo.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              {[
                { label: 'Calculadora', href: '#calculadora' },
                { label: 'Flujo de Trabajo', href: '#flujo' },
                { label: 'Gestión de Clientes', href: '#clientes' },
                { label: 'Catálogo', href: '#catalogo' },
                { label: 'Beneficios', href: '#beneficios' }
              ].map((link, idx) => (
                <li key={idx}>
                  <a 
                    href={link.href} 
                    className="text-gray-400 hover:text-orange-400 transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-white font-semibold mb-4">Funcionalidades</h4>
            <ul className="space-y-3">
              {[
                'Calculadora Inteligente',
                'Cuentas por Cobrar',
                'Catálogo Digital',
                'Pedidos en Línea',
                'Reportes de Ventas',
                'Sincronización en la Nube'
              ].map((feature, idx) => (
                <li key={idx} className="text-gray-400 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contacto</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  Av. Los Pollos 123, Lima, Perú
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <a href="tel:+51987654321" className="text-gray-400 text-sm hover:text-orange-400 transition-colors">
                  +51 987 654 321
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <a href="mailto:contacto@pollospro.com" className="text-gray-400 text-sm hover:text-orange-400 transition-colors">
                  contacto@pollospro.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} PollosPro. Todos los derechos reservados.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            Hecho con <Heart className="w-4 h-4 text-red-500 fill-red-500" /> para los polleros
          </p>
        </div>
      </div>
    </footer>
  );
}
