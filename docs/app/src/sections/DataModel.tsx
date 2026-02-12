import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Key, Link2, Hash, Type, Calendar, DollarSign } from 'lucide-react';

interface Field {
  name: string;
  type: string;
  constraints: string[];
  description?: string;
}

interface Table {
  name: string;
  description: string;
  fields: Field[];
  relations: string[];
}

const tables: Table[] = [
  {
    name: 'roles',
    description: 'Roles del sistema con permisos',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'name', type: 'VARCHAR(50)', constraints: ['UNIQUE', 'NOT NULL'], description: 'Nombre del rol' },
      { name: 'permissions', type: 'JSONB', constraints: ['NOT NULL'], description: 'Lista de permisos' },
      { name: 'description', type: 'TEXT', constraints: [], description: 'Descripción del rol' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha creación' }
    ],
    relations: ['users (role_id)']
  },
  {
    name: 'users',
    description: 'Usuarios del sistema (admin, vendedores)',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'username', type: 'VARCHAR(50)', constraints: ['UNIQUE', 'NOT NULL'], description: 'Nombre de usuario' },
      { name: 'password_hash', type: 'VARCHAR(255)', constraints: ['NOT NULL'], description: 'Contraseña encriptada' },
      { name: 'role_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Rol del usuario' },
      { name: 'name', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Nombre completo' },
      { name: 'phone', type: 'VARCHAR(20)', constraints: [], description: 'Teléfono' },
      { name: 'email', type: 'VARCHAR(100)', constraints: [], description: 'Correo electrónico' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT true'], description: 'Usuario activo' },
      { name: 'last_login', type: 'TIMESTAMP', constraints: [], description: 'Último acceso' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha creación' },
      { name: 'created_by', type: 'UUID', constraints: ['FK'], description: 'Usuario que creó' }
    ],
    relations: ['roles (role_id)', 'sales (vendedor_id)', 'distribuciones (vendedor_id)', 'users (created_by)']
  },
  {
    name: 'distribuciones',
    description: 'Asignación diaria de inventario a vendedores',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'vendedor_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Vendedor asignado' },
      { name: 'punto_venta', type: 'VARCHAR(100)', constraints: [], description: 'Carro A, Casa, Local, etc.' },
      { name: 'kilos_asignados', type: 'DECIMAL(8,3)', constraints: ['DEFAULT 0'], description: 'Kilos asignados hoy' },
      { name: 'kilos_vendidos', type: 'DECIMAL(8,3)', constraints: ['DEFAULT 0'], description: 'Kilos vendidos hoy' },
      { name: 'monto_recaudado', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Dinero recaudado' },
      { name: 'fecha', type: 'DATE', constraints: ['NOT NULL'], description: 'Fecha de la distribución' },
      { name: 'estado', type: 'ENUM', constraints: ['DEFAULT activo'], description: 'activo, cerrado, en_ruta' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha creación' }
    ],
    relations: ['users (vendedor_id)', 'sales (distribucion_id)']
  },
  {
    name: 'clients',
    description: 'Clientes del negocio',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'dni', type: 'VARCHAR(20)', constraints: ['UNIQUE'], description: 'DNI del cliente' },
      { name: 'name', type: 'VARCHAR(150)', constraints: ['NOT NULL'], description: 'Nombre completo' },
      { name: 'phone', type: 'VARCHAR(20)', constraints: [], description: 'Teléfono' },
      { name: 'address', type: 'TEXT', constraints: [], description: 'Dirección' },
      { name: 'credit_limit', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Límite de crédito' },
      { name: 'current_balance', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Saldo actual' },
      { name: 'total_purchases', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Total comprado' },
      { name: 'total_paid', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Total pagado' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT true'], description: 'Cliente activo' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha registro' }
    ],
    relations: ['sales (cliente_id)', 'payments (cliente_id)', 'orders (cliente_id)']
  },
  {
    name: 'products',
    description: 'Productos disponibles',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'name', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Nombre del producto' },
      { name: 'description', type: 'TEXT', constraints: [], description: 'Descripción' },
      { name: 'category', type: 'ENUM', constraints: ['NOT NULL'], description: 'pollo, huevos, otros' },
      { name: 'base_price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'], description: 'Precio base' },
      { name: 'unit', type: 'VARCHAR(20)', constraints: ['NOT NULL'], description: 'kg, unidad, caja' },
      { name: 'has_variants', type: 'BOOLEAN', constraints: ['DEFAULT false'], description: 'Tiene variantes' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT true'], description: 'Producto activo' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha creación' }
    ],
    relations: ['product_variants (producto_id)', 'sale_items (producto_id)', 'inventory (producto_id)']
  },
  {
    name: 'product_variants',
    description: 'Variantes de productos (vivo, pelado, etc.)',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'product_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Producto padre' },
      { name: 'name', type: 'VARCHAR(50)', constraints: ['NOT NULL'], description: 'Nombre variante' },
      { name: 'price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'], description: 'Precio específico' },
      { name: 'unit', type: 'VARCHAR(20)', constraints: [], description: 'Unidad específica' },
      { name: 'is_active', type: 'BOOLEAN', constraints: ['DEFAULT true'], description: 'Variante activa' }
    ],
    relations: ['products (product_id)', 'sale_items (variant_id)']
  },
  {
    name: 'sales',
    description: 'Ventas realizadas',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'client_id', type: 'UUID', constraints: ['FK'], description: 'Cliente (null = genérico)' },
      { name: 'seller_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Vendedor' },
      { name: 'distribucion_id', type: 'UUID', constraints: ['FK'], description: 'Distribución del día (vendedor + punto)' },
      { name: 'sale_type', type: 'ENUM', constraints: ['NOT NULL'], description: 'contado, credito' },
      { name: 'total_amount', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'], description: 'Monto total' },
      { name: 'amount_paid', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Monto pagado' },
      { name: 'balance_due', type: 'DECIMAL(10,2)', constraints: ['DEFAULT 0'], description: 'Saldo pendiente' },
      { name: 'tara', type: 'DECIMAL(8,3)', constraints: ['DEFAULT 0'], description: 'Tara en kg' },
      { name: 'net_weight', type: 'DECIMAL(8,3)', constraints: [], description: 'Peso neto' },
      { name: 'price_per_kg', type: 'DECIMAL(8,2)', constraints: [], description: 'Precio por kg' },
      { name: 'notes', type: 'TEXT', constraints: [], description: 'Notas' },
      { name: 'sale_date', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha venta' }
    ],
    relations: ['clients (client_id)', 'users (seller_id)', 'distribuciones (distribucion_id)', 'sale_items (sale_id)', 'payments (sale_id)']
  },
  {
    name: 'sale_items',
    description: 'Items de cada venta',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'sale_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Venta' },
      { name: 'product_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Producto' },
      { name: 'variant_id', type: 'UUID', constraints: ['FK'], description: 'Variante (opcional)' },
      { name: 'quantity', type: 'DECIMAL(8,3)', constraints: ['NOT NULL'], description: 'Cantidad' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'], description: 'Precio unitario' },
      { name: 'total_price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'], description: 'Precio total' }
    ],
    relations: ['sales (sale_id)', 'products (product_id)', 'product_variants (variant_id)']
  },
  {
    name: 'payments',
    description: 'Pagos y abonos de clientes',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'client_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Cliente' },
      { name: 'sale_id', type: 'UUID', constraints: ['FK'], description: 'Venta específica (opcional)' },
      { name: 'amount', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'], description: 'Monto pagado' },
      { name: 'payment_type', type: 'ENUM', constraints: ['NOT NULL'], description: 'efectivo, yape, etc' },
      { name: 'notes', type: 'TEXT', constraints: [], description: 'Notas' },
      { name: 'payment_date', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha pago' }
    ],
    relations: ['clients (client_id)', 'sales (sale_id)']
  },
  {
    name: 'inventory',
    description: 'Stock de productos',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'product_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Producto' },
      { name: 'quantity', type: 'DECIMAL(10,3)', constraints: ['NOT NULL'], description: 'Cantidad actual' },
      { name: 'min_stock', type: 'DECIMAL(10,3)', constraints: ['DEFAULT 0'], description: 'Stock mínimo' },
      { name: 'last_updated', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Última actualización' }
    ],
    relations: ['products (product_id)', 'inventory_movements (inventory_id)']
  },
  {
    name: 'inventory_movements',
    description: 'Movimientos de inventario',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'inventory_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Inventario' },
      { name: 'movement_type', type: 'ENUM', constraints: ['NOT NULL'], description: 'entrada, salida' },
      { name: 'quantity', type: 'DECIMAL(10,3)', constraints: ['NOT NULL'], description: 'Cantidad' },
      { name: 'reason', type: 'VARCHAR(100)', constraints: [], description: 'Motivo' },
      { name: 'reference_id', type: 'UUID', constraints: [], description: 'ID referencia (venta, compra)' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha movimiento' }
    ],
    relations: ['inventory (inventory_id)']
  },
  {
    name: 'orders',
    description: 'Pedidos de clientes',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'client_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Cliente' },
      { name: 'status', type: 'ENUM', constraints: ['NOT NULL'], description: 'pendiente, procesando, listo, entregado' },
      { name: 'total_amount', type: 'DECIMAL(10,2)', constraints: [], description: 'Monto total' },
      { name: 'notes', type: 'TEXT', constraints: [], description: 'Notas del cliente' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT NOW()'], description: 'Fecha pedido' },
      { name: 'delivered_at', type: 'TIMESTAMP', constraints: [], description: 'Fecha entrega' }
    ],
    relations: ['clients (client_id)', 'order_items (order_id)']
  },
  {
    name: 'order_items',
    description: 'Items de cada pedido',
    fields: [
      { name: 'id', type: 'UUID', constraints: ['PK'], description: 'Identificador único' },
      { name: 'order_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Pedido' },
      { name: 'product_id', type: 'UUID', constraints: ['FK', 'NOT NULL'], description: 'Producto' },
      { name: 'variant_id', type: 'UUID', constraints: ['FK'], description: 'Variante' },
      { name: 'quantity', type: 'DECIMAL(8,3)', constraints: ['NOT NULL'], description: 'Cantidad' }
    ],
    relations: ['orders (order_id)', 'products (product_id)']
  }
];

const getIcon = (type: string) => {
  if (type.includes('UUID')) return <Hash className="w-3 h-3 text-purple-400" />;
  if (type.includes('VARCHAR') || type.includes('TEXT')) return <Type className="w-3 h-3 text-blue-400" />;
  if (type.includes('DECIMAL') || type.includes('INT')) return <DollarSign className="w-3 h-3 text-green-400" />;
  if (type.includes('TIMESTAMP') || type.includes('DATE')) return <Calendar className="w-3 h-3 text-orange-400" />;
  if (type.includes('BOOLEAN')) return <Hash className="w-3 h-3 text-pink-400" />;
  return <Hash className="w-3 h-3 text-gray-400" />;
};

export function DataModel() {
  const [selectedTable, setSelectedTable] = useState<string | null>('sales');

  const currentTable = tables.find(t => t.name === selectedTable);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="section-title">
          <Database className="w-6 h-6 text-orange-500" />
          Modelo de Datos
        </h2>
        <p className="text-gray-400">
          Estructura de la base de datos PostgreSQL. Tablas, campos y relaciones.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Table List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Tablas</h3>
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                selectedTable === table.name
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <span className="font-mono">{table.name}</span>
            </button>
          ))}
        </div>

        {/* Table Detail */}
        <div className="lg:col-span-3">
          {currentTable && (
            <motion.div
              key={currentTable.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white font-mono">{currentTable.name}</h3>
                  <p className="text-gray-500 text-sm">{currentTable.description}</p>
                </div>
                <span className="badge badge-orange">
                  {currentTable.fields.length} campos
                </span>
              </div>

              {/* Fields */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                      <th className="pb-2">Campo</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Constraints</th>
                      <th className="pb-2">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {currentTable.fields.map((field, idx) => (
                      <tr key={idx} className="border-b border-gray-800/50 last:border-0">
                        <td className="py-3 font-mono text-gray-300">
                          <div className="flex items-center gap-2">
                            {field.constraints.includes('PK') && (
                              <Key className="w-3 h-3 text-yellow-500" />
                            )}
                            {field.constraints.includes('FK') && (
                              <Link2 className="w-3 h-3 text-blue-500" />
                            )}
                            {field.name}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 text-gray-400">
                            {getIcon(field.type)}
                            <span className="font-mono text-xs">{field.type}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {field.constraints.map((c, i) => (
                              <span 
                                key={i}
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  c === 'PK' ? 'bg-yellow-500/20 text-yellow-400' :
                                  c === 'FK' ? 'bg-blue-500/20 text-blue-400' :
                                  c === 'NOT NULL' ? 'bg-red-500/20 text-red-400' :
                                  c === 'UNIQUE' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-gray-700 text-gray-400'
                                }`}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-gray-500 text-xs">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Relations */}
              {currentTable.relations.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Relaciones</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentTable.relations.map((rel, idx) => (
                      <span key={idx} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg font-mono">
                        → {rel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Schema Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Diagrama de Relaciones</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-2">
            <h4 className="font-medium text-orange-400">Usuarios</h4>
            <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-400">
              users → sales<br/>
              users → distribuciones
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-400">Clientes</h4>
            <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-400">
              clients → sales<br/>
              clients → payments<br/>
              clients → orders
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-green-400">Productos</h4>
            <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-400">
              products → variants<br/>
              products → inventory<br/>
              products → sale_items
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-purple-400">Ventas</h4>
            <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-400">
              sales → sale_items<br/>
              sales → payments
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
