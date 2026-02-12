import { useState, useEffect } from 'react';
import { Calculator, RotateCcw, DollarSign, Weight, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface CalculatorState {
  totalAmount: string;
  pricePerKg: string;
  kilos: string;
  tara: string;
}

export function ChickenCalculator() {
  const [values, setValues] = useState<CalculatorState>({
    totalAmount: '',
    pricePerKg: '',
    kilos: '',
    tara: '0'
  });

  const [activeField, setActiveField] = useState<string | null>(null);

  // Calcular automáticamente cuando hay 2 valores
  useEffect(() => {
    const { totalAmount, pricePerKg, kilos, tara } = values;
    const taraNum = parseFloat(tara) || 0;
    
    const filledFields = [
      totalAmount && 'totalAmount',
      pricePerKg && 'pricePerKg',
      kilos && 'kilos'
    ].filter(Boolean);

    if (filledFields.length === 2) {
      const total = parseFloat(totalAmount) || 0;
      const price = parseFloat(pricePerKg) || 0;
      const kg = parseFloat(kilos) || 0;
      const kgNeto = Math.max(0, kg - taraNum);

      if (!totalAmount && price > 0 && kgNeto > 0) {
        setValues(prev => ({ ...prev, totalAmount: (price * kgNeto).toFixed(2) }));
      } else if (!pricePerKg && total > 0 && kgNeto > 0) {
        setValues(prev => ({ ...prev, pricePerKg: (total / kgNeto).toFixed(2) }));
      } else if (!kilos && total > 0 && price > 0) {
        const kgBruto = (total / price) + taraNum;
        setValues(prev => ({ ...prev, kilos: kgBruto.toFixed(2) }));
      }
    }
  }, [values.totalAmount, values.pricePerKg, values.kilos, values.tara]);

  const handleReset = () => {
    setValues({
      totalAmount: '',
      pricePerKg: '',
      kilos: '',
      tara: '0'
    });
  };

  const handleChange = (field: keyof CalculatorState, value: string) => {
    // Solo permitir números y punto decimal
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    setValues(prev => ({ ...prev, [field]: value }));
    setActiveField(field);
  };

  const kgNeto = Math.max(0, (parseFloat(values.kilos) || 0) - (parseFloat(values.tara) || 0));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-orange-100"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Calculadora de Pollo</h3>
          <p className="text-sm text-gray-500">Ingresa 2 valores y calcula el tercero</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Monto Total */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            Monto Total (S/)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={values.totalAmount}
            onChange={(e) => handleChange('totalAmount', e.target.value)}
            placeholder="0.00"
            className={`w-full input-calculator ${activeField === 'totalAmount' ? 'ring-4 ring-orange-200 border-orange-500' : ''}`}
          />
          {values.totalAmount && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-[38px] text-green-500"
            >
              ✓
            </motion.span>
          )}
        </div>

        {/* Precio por Kg */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            Precio por Kg (S/)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={values.pricePerKg}
            onChange={(e) => handleChange('pricePerKg', e.target.value)}
            placeholder="0.00"
            className={`w-full input-calculator ${activeField === 'pricePerKg' ? 'ring-4 ring-orange-200 border-orange-500' : ''}`}
          />
          {values.pricePerKg && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-[38px] text-green-500"
            >
              ✓
            </motion.span>
          )}
        </div>

        {/* Kilos Brutos */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Weight className="w-4 h-4 text-orange-500" />
            Kilos Brutos
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={values.kilos}
            onChange={(e) => handleChange('kilos', e.target.value)}
            placeholder="0.00"
            className={`w-full input-calculator ${activeField === 'kilos' ? 'ring-4 ring-orange-200 border-orange-500' : ''}`}
          />
          {values.kilos && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-3 top-[38px] text-green-500"
            >
              ✓
            </motion.span>
          )}
        </div>

        {/* Tara */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-500" />
            Tara (Kg)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={values.tara}
            onChange={(e) => handleChange('tara', e.target.value)}
            placeholder="0"
            className={`w-full input-calculator ${activeField === 'tara' ? 'ring-4 ring-orange-200 border-orange-500' : ''}`}
          />
        </div>
      </div>

      {/* Resumen de cálculo */}
      <motion.div 
        initial={false}
        animate={{ 
          height: values.totalAmount || values.pricePerKg || values.kilos ? 'auto' : 0,
          opacity: values.totalAmount || values.pricePerKg || values.kilos ? 1 : 0
        }}
        className="overflow-hidden"
      >
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 mb-4 border border-orange-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Kilos Netos</p>
              <p className="text-2xl font-bold text-orange-600">{kgNeto.toFixed(2)} kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Venta</p>
              <p className="text-2xl font-bold text-green-600">S/ {values.totalAmount || '0.00'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Botón reset */}
      <button
        onClick={handleReset}
        className="w-full btn-secondary flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Limpiar Calculadora
      </button>

      {/* Indicador de campos completados */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <span className="text-gray-500">Campos ingresados:</span>
        <div className="flex gap-1">
          {[values.totalAmount, values.pricePerKg, values.kilos].filter(Boolean).length >= 2 ? (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Listo para calcular
            </span>
          ) : (
            <span className="text-amber-600 font-medium">
              {3 - [values.totalAmount, values.pricePerKg, values.kilos].filter(Boolean).length} más necesarios
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
