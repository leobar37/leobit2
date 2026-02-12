import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'Calculadora', href: '#calculadora' },
  { label: 'Flujo', href: '#flujo' },
  { label: 'Clientes', href: '#clientes' },
  { label: 'Catálogo', href: '#catalogo' },
  { label: 'Beneficios', href: '#beneficios' }
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: isScrolled ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm"
      >
        <div className="container-max mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
                P
              </div>
              <span className="font-bold text-gray-800">PollosPro</span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button 
                onClick={() => scrollToSection('#calculadora')}
                className="btn-primary text-sm px-5 py-2"
              >
                Probar Demo
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-20 px-4 md:hidden"
          >
            <nav className="space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="w-full text-left px-4 py-3 text-lg text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4">
                <Button 
                  onClick={() => scrollToSection('#calculadora')}
                  className="w-full btn-primary py-4"
                >
                  Probar Demo
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
