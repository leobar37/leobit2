# Fase 2: Gestión de Usuarios

> CRUD de usuarios - Solo el admin puede crear vendedores

---

## 🎯 Objetivo

Permitir al administrador:
- Crear nuevos usuarios (vendedores y admins)
- Listar todos los usuarios
- Editar usuarios
- Activar/Desactivar usuarios

---

## 📋 Requisitos Previos

- Fase 1 completada (Autenticación)
- Middleware de autenticación implementado
- Solo usuarios con rol ADMIN pueden acceder

---

## 🏗️ Especificación Técnica

### 1. API Endpoints (Protegidos)

```typescript
// GET /api/users
// Headers: Authorization: Bearer <token>
// Response: { users: User[] }
// Access: ADMIN only

// POST /api/users
// Headers: Authorization: Bearer <token>
// Body: { name, dni, email, phone, role, puntoVenta?, comision? }
// Response: { user: User, tempPassword: string }
// Access: ADMIN only

// PUT /api/users/:id
// Headers: Authorization: Bearer <token>
// Body: { name?, phone?, isActive?, puntoVenta?, comision? }
// Response: { user: User }
// Access: ADMIN only

// DELETE /api/users/:id (soft delete - desactivar)
// Headers: Authorization: Bearer <token>
// Response: { message: "Usuario desactivado" }
// Access: ADMIN only
```

### 2. Database Schema (Actualizar)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  name          String
  dni           String    @unique
  phone         String?
  role          Role      @default(VENDEDOR)
  isActive      Boolean   @default(true) @map("is_active")
  
  // Campos adicionales para vendedores
  puntoVenta    String?   @map("punto_venta")
  comision      Decimal?  @default(5.00) @db.Decimal(5,2)
  
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("users")
}
```

### 3. Frontend - Páginas

```
apps/web/src/
├── pages/
│   └── admin/
│       └── usuarios/
│           ├── page.tsx          # Lista de usuarios
│           └── nuevo/
│               └── page.tsx      # Formulario crear usuario
```

---

## 💻 Implementación

### Paso 1: Middleware de Autorización

```typescript
// apps/api/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    role: string
  }
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  next()
}
```

### Paso 2: API - Crear Usuario

```typescript
// apps/api/src/routes/users.routes.ts
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

// Todas las rutas requieren auth y admin
router.use(requireAuth, requireAdmin)

// GET /api/users
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      dni: true,
      phone: true,
      role: true,
      isActive: true,
      puntoVenta: true,
      comision: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ users })
})

// POST /api/users
const createUserSchema = z.object({
  name: z.string().min(3),
  dni: z.string().length(8),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'VENDEDOR']),
  puntoVenta: z.string().optional(),
  comision: z.number().min(0).max(100).optional()
})

router.post('/', async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body)
    
    // Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    
    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash
      }
    })
    
    // TODO: Enviar email con credenciales
    
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tempPassword // Solo para desarrollo, en prod enviar por email
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email o DNI ya existe' })
    }
    res.status(400).json({ error: 'Datos inválidos' })
  }
})

export default router
```

### Paso 3: Frontend - Lista de Usuarios

```typescript
// apps/web/src/pages/admin/usuarios/page.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2 } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  dni: string
  role: 'ADMIN' | 'VENDEDOR'
  isActive: boolean
  puntoVenta?: string
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    setUsers(data.users)
    setLoading(false)
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
        <button
          onClick={() => navigate('/admin/usuarios/nuevo')}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left text-gray-400 text-xs p-3">Usuario</th>
              <th className="text-left text-gray-400 text-xs p-3">Rol</th>
              <th className="text-left text-gray-400 text-xs p-3">Estado</th>
              <th className="text-left text-gray-400 text-xs p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-700">
                <td className="p-3">
                  <div>
                    <p className="text-white text-sm">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.role === 'ADMIN' 
                      ? 'bg-orange-500/20 text-orange-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.isActive 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-600 text-gray-400'
                  }`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="p-2 bg-blue-500/20 text-blue-400 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-red-500/20 text-red-400 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Paso 4: Frontend - Crear Usuario

```typescript
// apps/web/src/pages/admin/usuarios/nuevo/page.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function NuevoUsuarioPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    role: 'VENDEDOR',
    puntoVenta: '',
    comision: 5
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const token = localStorage.getItem('token')
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear usuario')
      }

      const data = await response.json()
      alert(`Usuario creado! Contraseña temporal: ${data.tempPassword}`)
      navigate('/admin/usuarios')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Crear Nuevo Usuario</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Nombre completo *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">DNI *</label>
            <input
              type="text"
              required
              maxLength={8}
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Teléfono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Rol *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {formData.role === 'VENDEDOR' && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">Punto de venta</label>
              <input
                type="text"
                value={formData.puntoVenta}
                onChange={(e) => setFormData({ ...formData, puntoVenta: e.target.value })}
                placeholder="Ej: Carro A"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/usuarios')}
            className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

---

## ✅ Tests

### Test Manual

1. Login como admin
2. Ir a `/admin/usuarios`
3. Clic en "Nuevo Usuario"
4. Completar formulario
5. Verificar:
   - [ ] Usuario aparece en la lista
   - [ ] Se generó contraseña temporal
   - [ ] No se puede crear con email duplicado
   - [ ] No se puede crear con DNI duplicado

---

## 📦 Entregable

- [ ] Middleware de auth y admin
- [ ] Endpoints CRUD de usuarios
- [ ] Página lista de usuarios
- [ ] Página crear usuario
- [ ] Validaciones de duplicados

---

## 🔄 Siguiente Paso

→ Ve a `../03-core-offline/README.md`
