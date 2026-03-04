# Tests E2E - Avileo

Este documento es la guía principal para los tests end-to-end (E2E) del sistema Avileo.

## Ejecución Rápida

```bash
# Ejecutar todos los tests E2E
bun run test:e2e

# Modo visual (ver el navegador)
cd packages/app && bun run test:e2e --headed

# Ver reporte HTML
cd packages/app && bun run test:e2e:report
```

## Índice de Casos de Test

| ID | Caso | Actor | Descripción | Archivo |
|----|------|-------|-------------|---------|
| TC-ADMIN-001 | [Flujo de Admin](./cases/flujo-admin.md) | Administrador | Crear producto, variante, compra e inventario | `flujo-admin.spec.ts` |
| TC-VENDEDOR-001 | [Flujo de Vendedor](./cases/flujo-vendedor.md) | Vendedor | Ventas crédito/contado, cobros y abonos | `flujo-vendedor.spec.ts` |

## Arquitectura de Tests

### Estructura de Archivos

```
packages/app/e2e/
├── tests/                    # Tests E2E
│   ├── flujo-admin.spec.ts   # Caso admin
│   ├── flujo-vendedor.spec.ts # Caso vendedor
│   └── ...                   # Nuevos casos
├── page-objects/             # Page Objects
│   ├── LoginPage.ts
│   ├── NewSalePage.ts
│   ├── NewProductPage.ts
│   └── ...
├── fixtures/                 # Datos de prueba
└── playwright-report/        # Reportes HTML
```

### Page Objects Disponibles

| Clase | Descripción | Métodos Principales |
|-------|-------------|---------------------|
| `LoginPage` | Autenticación | `login()`, `goto()` |
| `NewSalePage` | Crear ventas | `selectCustomer()`, `selectProductAndVariant()`, `enterTotalAmount()` |
| `NewProductPage` | Crear productos | `fillForm()`, `save()` |
| `ProductDetailPage` | Detalle producto | `addVariant()` |
| `NewPurchasePage` | Registrar compras | `selectSupplier()`, `selectProductAndVariant()` |
| `CobrosPage` | Módulo cobros | `registerAbono()` |

## Datos de Seed (E2E)

Los tests usan datos pre-creados por el seed en `packages/backend/src/seed/data.ts`:

### Credenciales
| Campo | Valor |
|-------|-------|
| Email | `e2e@avileo.com` |
| Password | `e2e123456` |

### Productos Pre-creados
- **Huevos** (unidad): Unidad, Maple (30un), Cubeta (180un)
- **Menudencias** (kg): Mollejas, Patitas, Alas

### Clientes Pre-creados
- Maria Garcia (DNI: 87654321)
- Juan Perez (DNI: 12345678)

### Proveedores Pre-creados
- Proveedor Varios
- Avícola El Buen Sabor

## Agregar Nuevo Caso de Test

1. **Copiar template:**
   ```bash
   cp docs/tests/cases/TEMPLATE.md docs/tests/cases/mi-caso.md
   ```

2. **Completar el caso:** Seguir la estructura del template

3. **Crear test:** Crear archivo en `packages/app/e2e/tests/`

4. **Actualizar índice:** Agregar entrada a la tabla de casos arriba

5. **Ejecutar:** Verificar que pasa con `bun run test:e2e`

## Solución de Problemas

### Overlay `data-react-grab`
Se deshabilita automáticamente con `VITE_E2E_MODE=true` en el script de tests.

### Selectores
Todos los componentes UI deben tener `data-testid` para facilitar selección:

```typescript
// Ejemplo
data-testid="product-name-input"
data-testid="save-product-button"
```

### Reportes
Los resultados se guardan en:
- HTML: `packages/app/e2e/playwright-report/index.html`
- Screenshots: `packages/app/e2e/test-results/`

---

## Documentación de Casos

Para detalles específicos de cada caso, ver:

- [Flujo de Admin](./cases/flujo-admin.md) - TC-ADMIN-001
- [Flujo de Vendedor](./cases/flujo-vendedor.md) - TC-VENDEDOR-001
- [Template para nuevos casos](./cases/TEMPLATE.md)
