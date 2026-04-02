# Avileo - Stack Tecnológico

> Herramientas y tecnologías para el desarrollo del sistema

---

## 🎯 Principios de Selección

1. **100% Open Source** - Sin dependencias de pago
2. **Offline-first** - Funciona sin internet
3. **Moderno y mantenible** - Tecnologías actuales
4. **TypeScript** - Tipado estático para robustez

---

## 📦 Stack Completo

### Frontend (Mobile/Desktop)

| Capa | Tecnología | Versión | Propósito |
|------|------------|---------|-----------|
| **Framework** | React | 18.x | UI components |
| **Lenguaje** | TypeScript | 5.x | Tipado estático |
| **Build Tool** | Vite | 5.x | Compilación rápida |
| **Estilos** | Tailwind CSS | 3.x | CSS utility-first |
| **UI Components** | shadcn/ui | latest | Componentes base |
| **Estado Reactivo** | TanStack DB | latest | Colecciones reactivas |
| **Cache HTTP** | TanStack Query | 5.x | Peticiones al servidor |
| **Persistencia** | IndexedDB + idb-keyval | latest | Almacenamiento local |
| **Routing** | React Router | 6.x | Navegación |
| **Animaciones** | Framer Motion | 11.x | Transiciones UI |
| **Iconos** | Lucide React | latest | Iconos SVG |

### Backend

| Capa | Tecnología | Versión | Propósito |
|------|------------|---------|-----------|
| **Runtime** | Node.js | 20.x LTS | Servidor |
| **Framework** | Express.js | 4.x | API REST |
| **Lenguaje** | TypeScript | 5.x | Tipado estático |
| **Database** | PostgreSQL | 16.x | Datos persistentes |
| **ORM** | Prisma | 5.x | Modelado de datos |
| **Auth** | jsonwebtoken | 9.x | JWT tokens |
| **Hashing** | bcrypt | 5.x | Contraseñas seguras |
| **Validación** | Zod | 3.x | Validación de schemas |
| **CORS** | cors | latest | Cross-origin requests |
| **Env Vars** | dotenv | latest | Variables de entorno |

### Herramientas de Desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **ESLint** | Linting de código |
| **Prettier** | Formateo de código |
| **tsx** | Ejecutar TypeScript directamente |
| **nodemon** | Recarga automática en desarrollo |
| **Vitest** | Testing unitario |
| **Playwright** | Testing E2E |

---

## 🛠️ Instalación del Entorno

### 1. Requisitos Previos

```bash
# Node.js 20.x LTS
node --version  # Debe mostrar v20.x.x

# PostgreSQL 16
psql --version  # Debe mostrar 16.x

# Git
git --version
```

### 2. Estructura de Carpetas del Proyecto

```
pollospro/
├── apps/
│   ├── web/                 # Frontend (React + Vite)
│   └── api/                 # Backend (Express + TS)
│
├── packages/
│   ├── shared/              # Tipos y utilidades compartidas
│   └── database/            # Schema Prisma y migraciones
│
├── docker-compose.yml       # PostgreSQL local
└── package.json             # Workspace root
```

### 3. Comandos de Inicialización

```bash
# Crear proyecto con Vite
npm create vite@latest apps/web -- --template react-ts

# Instalar dependencias del frontend
cd apps/web
npm install

# Instalar dependencias principales
npm install @tanstack/react-db @tanstack/react-query idb-keyval
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# UI Components
npm install framer-motion lucide-react
npx shadcn-ui@latest init

# Backend
cd ../api
npm init -y
npm install express cors dotenv bcrypt jsonwebtoken zod
npm install -D typescript @types/express @types/cors @types/bcrypt @types/jsonwebtoken tsx nodemon

# Prisma
npm install prisma @prisma/client
npx prisma init
```

---

## 📋 Configuración de Archivos

### Frontend: `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Frontend: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Backend: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Backend: `.env`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pollospro"

# JWT
JWT_SECRET="tu-secreto-super-seguro-minimo-32-caracteres"
JWT_EXPIRES_IN="24h"

# Server
PORT=3000
NODE_ENV=development
```

---

## 🗄️ Configuración de PostgreSQL (Docker)

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: pollospro-db
    environment:
      POSTGRES_USER: pollospro
      POSTGRES_PASSWORD: pollospro123
      POSTGRES_DB: pollospro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Comandos Docker

```bash
# Iniciar PostgreSQL
docker-compose up -d

# Verificar que está corriendo
docker-compose ps

# Ver logs
docker-compose logs -f postgres

# Detener
docker-compose down

# Reset (borrar datos)
docker-compose down -v
```

---

## 📱 PWA Configuration

### `manifest.json`

```json
{
  "name": "Avileo",
  "short_name": "Avileo",
  "description": "Sistema de ventas de pollo - Offline first",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#f97316",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (Básico)

```typescript
// sw.ts
const CACHE_NAME = 'pollospro-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/index.css',
        '/assets/index.js'
      ])
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})
```

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Instalar
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Configurar vite.config.ts
export default defineConfig({
  // ... otras configs
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

### E2E Tests (Playwright)

```bash
# Instalar
npm install -D @playwright/test
npx playwright install

# Ejecutar tests
npx playwright test
```

---

## 🚀 Scripts de Desarrollo

### Root `package.json`

```json
{
  "name": "pollospro",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:web": "cd apps/web && npm run dev",
    "dev:api": "cd apps/api && npm run dev",
    "build": "npm run build:shared && npm run build:api && npm run build:web",
    "test": "npm run test --workspaces",
    "db:up": "docker-compose up -d",
    "db:down": "docker-compose down",
    "db:migrate": "cd packages/database && npx prisma migrate dev",
    "db:studio": "cd packages/database && npx prisma studio"
  },
  "devDependencies": {
    "concurrently": "^8.x"
  }
}
```

### Web `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

### API `package.json`

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  }
}
```

---

## 📚 Documentación de Referencia

| Tecnología | Documentación |
|------------|---------------|
| React | https://react.dev |
| TypeScript | https://typescriptlang.org/docs |
| Vite | https://vitejs.dev/guide |
| Tailwind CSS | https://tailwindcss.com/docs |
| TanStack Query | https://tanstack.com/query/latest |
| TanStack DB | https://tanstack.com/db/latest |
| Prisma | https://prisma.io/docs |
| Express | https://expressjs.com/en/guide |
| shadcn/ui | https://ui.shadcn.com |

---

## 💡 Tips y Mejores Prácticas

### 1. TypeScript Estricto

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. Imports Ordenados

```typescript
// 1. React/External libraries
import { useState } from 'react'
import { motion } from 'framer-motion'

// 2. Internal absolute imports
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

// 3. Relative imports
import { LoginForm } from './LoginForm'
```

### 3. Manejo de Errores

```typescript
// Siempre tipar errores
try {
  await syncData()
} catch (error) {
  if (error instanceof Error) {
    console.error('Sync failed:', error.message)
  }
}
```

### 4. Offline-First

```typescript
// Patrón: Optimistic UI + Background Sync
const addSale = async (sale: Sale) => {
  // 1. Guardar local inmediatamente
  await localDB.sales.add(sale)
  
  // 2. Actualizar UI
  queryClient.invalidateQueries(['sales'])
  
  // 3. Intentar sync en background
  if (navigator.onLine) {
    syncQueue.add(sale)
  }
}
```

---

## 🔒 Seguridad Checklist

- [ ] Variables de entorno nunca en código
- [ ] JWT con expiración corta (24h)
- [ ] Contraseñas hasheadas con bcrypt
- [ ] Validación de inputs con Zod
- [ ] CORS configurado correctamente
- [ ] SQL Injection protegido (Prisma)
- [ ] XSS protegido (React escapa automáticamente)

---

## 🆘 Troubleshooting

### Error: "Cannot find module '@/...'"

```bash
# Verificar vite.config.ts tenga el alias configurado
```

### Error: "Prisma Client not found"

```bash
# Generar cliente
cd packages/database
npx prisma generate
```

### Error: "Database connection failed"

```bash
# Verificar PostgreSQL está corriendo
docker-compose ps

# Verificar DATABASE_URL en .env
```

---

**Listo para empezar** → Ve a `01-autenticacion/README.md`
