# Fase 1: Autenticación

> Sistema de login/logout con JWT

---

## 🎯 Objetivo

Construir el sistema de autenticación que permita:
- Vendedores y admins iniciar sesión
- Mantener sesión con token JWT
- Proteger rutas privadas

---

## 📋 Requisitos Previos

- Entorno configurado (ver `../tech.md`)
- PostgreSQL corriendo
- Proyecto inicializado

---

## 🏗️ Especificación Técnica

### 1. Database Schema (Prisma)

```prisma
// packages/database/prisma/schema.prisma

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  name          String
  dni           String    @unique
  phone         String?
  role          Role      @default(VENDEDOR)
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

enum Role {
  ADMIN
  VENDEDOR
}
```

### 2. API Endpoints

```typescript
// POST /api/auth/login
// Body: { email: string, password: string }
// Response: { token: string, user: { id, name, email, role } }

// POST /api/auth/logout
// Headers: Authorization: Bearer <token>
// Response: { message: "Logout exitoso" }

// GET /api/auth/me
// Headers: Authorization: Bearer <token>
// Response: { user: { id, name, email, role } }
```

### 3. Frontend - Páginas

```
apps/web/src/
├── pages/
│   └── login/
│       └── page.tsx          # Página de login
├── hooks/
│   └── useAuth.ts            # Hook de autenticación
├── contexts/
│   └── AuthContext.tsx       # Contexto global de auth
└── services/
    └── auth.service.ts       # Llamadas a API
```

---

## 💻 Implementación Paso a Paso

### Paso 1: Configurar Prisma

```bash
cd packages/database

# Crear schema
npx prisma init

# Aplicar migración
npx prisma migrate dev --name init_users

# Generar cliente
npx prisma generate
```

### Paso 2: API - Login Endpoint

```typescript
// apps/api/src/routes/auth.routes.ts
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    
    // Verificar password
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    
    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(400).json({ error: 'Datos inválidos' })
  }
})

export default router
```

### Paso 3: Frontend - Auth Context

```typescript
// apps/web/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'VENDEDOR'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar token al cargar
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      throw new Error('Login failed')
    }
    
    const { token, user } = await response.json()
    localStorage.setItem('token', token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Paso 4: Frontend - Login Page

```typescript
// apps/web/src/pages/login/page.tsx
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          PollosPro
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              placeholder="vendedor@pollospro.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
```

---

## ✅ Tests

### Test Manual

1. Crear usuario de prueba:
```bash
# En API
POST /api/users (con password hasheado)
```

2. Probar login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pollospro.com","password":"123456"}'
```

3. Verificar:
- [ ] Login con credenciales correctas devuelve token
- [ ] Login con credenciales incorrectas devuelve 401
- [ ] Token se guarda en localStorage
- [ ] Usuario se redirige a dashboard después de login

---

## 📦 Entregable

Al finalizar esta fase debes tener:

- [ ] Tabla `users` en PostgreSQL
- [ ] Endpoint `/api/auth/login` funcionando
- [ ] Página de login en React
- [ ] AuthContext que maneja sesión
- [ ] Token guardado en localStorage

---

## 🔄 Siguiente Paso

→ Ve a `../02-usuarios/README.md`
