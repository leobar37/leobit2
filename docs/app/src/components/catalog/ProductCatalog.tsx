import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  ShoppingCart,
  Check,
  Send,
  User,
  Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: 'chicken' | 'eggs' | 'others';
  image: string;
  variants?: { name: string; price: number; unit: string }[];
}

interface CartItem extends Product {
  quantity: number;
  selectedVariant?: { name: string; price: number; unit: string };
}

const products: Product[] = [
  {
    id: '1',
    name: 'Pollo Entero',
    description: 'Pollo fresco de granja, peso aproximado 2.5kg',
    price: 12.00,
    unit: 'kg',
    category: 'chicken',
    image: '🐔',
    variants: [
      { name: 'Vivo', price: 10.50, unit: 'kg' },
      { name: 'Pelado', price: 12.00, unit: 'kg' }
    ]
  },
  {
    id: '2',
    name: 'Pechuga',
    description: 'Pechuga de pollo fresca, sin hueso',
    price: 18.00,
    unit: 'kg',
    category: 'chicken',
    image: '🍗'
  },
  {
    id: '3',
    name: 'Pierna con Encuentro',
    description: 'Pierna de pollo con encuentro, fresca',
    price: 14.00,
    unit: 'kg',
    category: 'chicken',
    image: '🍗'
  },
  {
    id: '4',
    name: 'Alitas',
    description: 'Alitas de pollo frescas',
    price: 15.00,
    unit: 'kg',
    category: 'chicken',
    image: '🍗'
  },
  {
    id: '5',
    name: 'Huevos',
    description: 'Huevos frescos de granja',
    price: 15.00,
    unit: 'caja',
    category: 'eggs',
    image: '🥚',
    variants: [
      { name: 'Caja completa (30 unid)', price: 15.00, unit: 'caja' },
      { name: 'Media caja (15 unid)', price: 8.00, unit: 'media' },
      { name: 'Por unidad', price: 0.60, unit: 'unidad' }
    ]
  },
  {
    id: '6',
    name: 'Aceitunas',
    description: 'Aceitunas verdes o negras',
    price: 8.00,
    unit: 'kg',
    category: 'others',
    image: '🫒'
  },
  {
    id: '7',
    name: 'Mondongo',
    description: 'Mondongo de pollo fresco',
    price: 10.00,
    unit: 'kg',
    category: 'others',
    image: '🍲'
  },
  {
    id: '8',
    name: 'Menudencias',
    description: 'Corazón, hígado, mollejas',
    price: 8.00,
    unit: 'kg',
    category: 'others',
    image: '🍖'
  }
];

export function ProductCatalog() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showOrderSent, setShowOrderSent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientDni, setClientDni] = useState('');

  const addToCart = (product: Product, variant?: { name: string; price: number; unit: string }) => {
    setCart(prev => {
      const existingItem = prev.find(item => 
        item.id === product.id && 
        item.selectedVariant?.name === variant?.name
      );

      if (existingItem) {
        return prev.map(item => 
          item.id === product.id && item.selectedVariant?.name === variant?.name
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { ...product, quantity: 1, selectedVariant: variant }];
    });
    setSelectedProduct(null);
  };

  const removeFromCart = (productId: string, variantName?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.id === productId && item.selectedVariant?.name === variantName)
    ));
  };

  const updateQuantity = (productId: string, delta: number, variantName?: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId && item.selectedVariant?.name === variantName) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.selectedVariant?.price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSendOrder = () => {
    setShowCart(false);
    setShowOrderSent(true);
    setCart([]);
    setTimeout(() => setShowOrderSent(false), 3000);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chickenProducts = filteredProducts.filter(p => p.category === 'chicken');
  const eggProducts = filteredProducts.filter(p => p.category === 'eggs');
  const otherProducts = filteredProducts.filter(p => p.category === 'others');

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y carrito */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>
        <Button 
          onClick={() => setShowCart(true)}
          className="btn-primary h-12 px-6 relative"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Carrito
          {cartItemsCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartItemsCount}
            </span>
          )}
        </Button>
      </div>

      {/* Catálogo por categorías */}
      <Tabs defaultValue="chicken" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 rounded-xl bg-gray-100 p-1">
          <TabsTrigger value="chicken" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <span className="mr-2">🐔</span> Pollo
          </TabsTrigger>
          <TabsTrigger value="eggs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <span className="mr-2">🥚</span> Huevos
          </TabsTrigger>
          <TabsTrigger value="others" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <span className="mr-2">🫒</span> Otros
          </TabsTrigger>
        </TabsList>

        {['chicken', 'eggs', 'others'].map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(category === 'chicken' ? chickenProducts : category === 'eggs' ? eggProducts : otherProducts).map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{product.image}</div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      S/ {product.price.toFixed(2)}/{product.unit}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-gray-800 mt-3">{product.name}</h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                  
                  {product.variants && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {product.variants.map(v => (
                        <span key={v.name} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                          {v.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button className="w-full mt-4 btn-secondary text-sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Modal de selección de producto */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-4xl">{selectedProduct?.image}</span>
              <div>
                <p className="text-xl">{selectedProduct?.name}</p>
                <p className="text-sm font-normal text-gray-500">{selectedProduct?.description}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.variants ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selecciona una opción:</p>
                  {selectedProduct.variants.map((variant) => (
                    <button
                      key={variant.name}
                      onClick={() => addToCart(selectedProduct, variant)}
                      className="w-full p-4 bg-gray-50 hover:bg-orange-50 rounded-xl border border-gray-200 hover:border-orange-300 transition-all flex items-center justify-between"
                    >
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-orange-600 font-bold">S/ {variant.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-orange-50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Precio:</span>
                    <span className="text-2xl font-bold text-orange-600">S/ {selectedProduct.price.toFixed(2)}/{selectedProduct.unit}</span>
                  </div>
                  <Button 
                    onClick={() => addToCart(selectedProduct)}
                    className="w-full btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar al Carrito
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal del carrito */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              Tu Pedido
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tu carrito está vacío</p>
              <Button onClick={() => setShowCart(false)} className="mt-4 btn-secondary">
                Seguir comprando
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Identificación del cliente */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  DNI del Cliente (opcional)
                </label>
                <Input
                  placeholder="Ingresa DNI para identificar"
                  value={clientDni}
                  onChange={(e) => setClientDni(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Items del carrito */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.selectedVariant?.name}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-2xl">{item.image}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.selectedVariant && (
                        <p className="text-xs text-gray-500">{item.selectedVariant.name}</p>
                      )}
                      <p className="text-orange-600 font-semibold text-sm">
                        S/ {(item.selectedVariant?.price || item.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.id, -1, item.selectedVariant?.name)}
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1, item.selectedVariant?.name)}
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id, item.selectedVariant?.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Total del pedido:</span>
                  <span className="text-2xl font-bold text-orange-600">S/ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button onClick={() => setShowCart(false)} className="flex-1 btn-secondary">
                  Seguir comprando
                </Button>
                <Button onClick={handleSendOrder} className="flex-1 btn-primary">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Pedido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notificación de pedido enviado */}
      <AnimatePresence>
        {showOrderSent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          >
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido Enviado!</h3>
              <p className="text-gray-600">El administrador recibirá tu pedido</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
