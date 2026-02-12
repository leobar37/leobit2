import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  DollarSign, 
  TrendingDown, 
  TrendingUp,
  History,
  CreditCard,
  Wallet
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Client {
  id: string;
  name: string;
  dni: string;
  phone: string;
  address: string;
  totalDebt: number;
  totalPaid: number;
  lastPurchase: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  date: string;
  type: 'purchase' | 'payment';
  amount: number;
  description: string;
}

const mockClients: Client[] = [
  {
    id: '1',
    name: 'María González',
    dni: '45678912',
    phone: '987654321',
    address: 'Av. Los Pollos 123',
    totalDebt: 450.00,
    totalPaid: 1200.00,
    lastPurchase: '2024-01-15',
    transactions: [
      { id: 't1', date: '2024-01-15', type: 'purchase', amount: 150.00, description: '5 kg pollo' },
      { id: 't2', date: '2024-01-14', type: 'payment', amount: 100.00, description: 'Abono' },
      { id: 't3', date: '2024-01-10', type: 'purchase', amount: 200.00, description: '8 kg pollo' },
    ]
  },
  {
    id: '2',
    name: 'Juan Pérez',
    dni: '12345678',
    phone: '912345678',
    address: 'Jr. Las Gallinas 456',
    totalDebt: 0,
    totalPaid: 800.00,
    lastPurchase: '2024-01-14',
    transactions: [
      { id: 't4', date: '2024-01-14', type: 'purchase', amount: 120.00, description: '4 kg pollo' },
      { id: 't5', date: '2024-01-14', type: 'payment', amount: 120.00, description: 'Pago total' },
    ]
  },
  {
    id: '3',
    name: 'Carmen Rodríguez',
    dni: '87654321',
    phone: '956789012',
    address: 'Calle El Corral 789',
    totalDebt: 890.50,
    totalPaid: 500.00,
    lastPurchase: '2024-01-13',
    transactions: [
      { id: 't6', date: '2024-01-13', type: 'purchase', amount: 300.50, description: '10 kg pollo + huevos' },
      { id: 't7', date: '2024-01-12', type: 'purchase', amount: 250.00, description: '8 kg pollo' },
      { id: 't8', date: '2024-01-11', type: 'payment', amount: 200.00, description: 'Abono parcial' },
    ]
  },
  {
    id: '4',
    name: 'Roberto Sánchez',
    dni: '56789123',
    phone: '934567890',
    address: 'Av. Principal 321',
    totalDebt: 150.00,
    totalPaid: 2000.00,
    lastPurchase: '2024-01-16',
    transactions: [
      { id: 't9', date: '2024-01-16', type: 'purchase', amount: 150.00, description: '5 kg pollo' },
      { id: 't10', date: '2024-01-15', type: 'payment', amount: 500.00, description: 'Abono' },
    ]
  }
];

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);

  const filteredClients = mockClients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.dni.includes(searchTerm)
  );

  const totalDebt = mockClients.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalPaid = mockClients.reduce((sum, c) => sum + c.totalPaid, 0);

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Clientes</p>
              <p className="text-3xl font-bold">{mockClients.length}</p>
            </div>
            <Users className="w-10 h-10 text-blue-200" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Cobrado</p>
              <p className="text-3xl font-bold">S/ {totalPaid.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-200" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Por Cobrar</p>
              <p className="text-3xl font-bold">S/ {totalDebt.toFixed(2)}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-200" />
          </div>
        </motion.div>
      </div>

      {/* Búsqueda y acciones */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
        <Button 
          onClick={() => setShowAddClient(true)}
          className="btn-primary h-12 px-6"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedClient(client)}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{client.name}</h4>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    DNI: {client.dni}
                  </p>
                </div>
              </div>
              <Badge 
                variant={client.totalDebt > 0 ? "destructive" : "default"}
                className={client.totalDebt > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}
              >
                {client.totalDebt > 0 ? 'Debe' : 'Al día'}
              </Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Phone className="w-4 h-4" />
                    {client.phone}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {client.address.slice(0, 15)}...
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1 text-green-600">
                  <Wallet className="w-4 h-4" />
                  <span className="font-medium">Pagado: S/ {client.totalPaid.toFixed(2)}</span>
                </div>
                {client.totalDebt > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">Debe: S/ {client.totalDebt.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de detalle del cliente */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold">
                {selectedClient?.name.charAt(0)}
              </div>
              <div>
                <p className="text-xl">{selectedClient?.name}</p>
                <p className="text-sm font-normal text-gray-500">DNI: {selectedClient?.dni}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-6">
              {/* Info del cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> Teléfono
                  </p>
                  <p className="font-medium">{selectedClient.phone}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Dirección
                  </p>
                  <p className="font-medium">{selectedClient.address}</p>
                </div>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-600">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-700">S/ {selectedClient.totalPaid.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${selectedClient.totalDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-sm ${selectedClient.totalDebt > 0 ? 'text-red-600' : 'text-gray-500'}`}>Saldo Pendiente</p>
                  <p className={`text-2xl font-bold ${selectedClient.totalDebt > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                    S/ {selectedClient.totalDebt.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Historial de transacciones */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  Historial de Transacciones
                </h4>
                <div className="space-y-2">
                  {selectedClient.transactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          transaction.type === 'purchase' 
                            ? 'bg-orange-100 text-orange-600' 
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {transaction.type === 'purchase' ? <DollarSign className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-gray-500">{transaction.date}</p>
                        </div>
                      </div>
                      <span className={`font-semibold ${
                        transaction.type === 'purchase' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.type === 'purchase' ? '-' : '+'} S/ {transaction.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <Button className="flex-1 btn-primary">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Registrar Abono
                </Button>
                <Button className="flex-1 btn-secondary">
                  <History className="w-4 h-4 mr-2" />
                  Ver Historial Completo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal agregar cliente */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              Nuevo Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre completo</label>
              <Input placeholder="Ej: Juan Pérez" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">DNI</label>
              <Input placeholder="12345678" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Teléfono</label>
              <Input placeholder="987654321" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Dirección</label>
              <Input placeholder="Av. Principal 123" className="mt-1" />
            </div>
            <Button className="w-full btn-primary" onClick={() => setShowAddClient(false)}>
              Guardar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
