# Mobile List Pattern

> Patron visual y de interaccion para pantallas mobile de listado en Avileo.

---

## Objetivo

Estandarizar pantallas como `clientes`, `ventas`, `cobros`, `compras` y otros listados operativos para que se sientan parte del mismo producto.

Este patron prioriza:

- rapidez de lectura
- densidad comoda en mobile
- CTA principal siempre accesible
- consistencia entre busqueda, cards y navegacion

---

## Cuando usarlo

Usa este patron cuando la pantalla:

- muestra una lista principal de entidades
- necesita busqueda o filtros ligeros
- permite crear un nuevo registro desde la misma vista
- vive dentro del shell mobile con bottom navigation

Ejemplos actuales:

- `ventas`
- `clientes`

---

## Estructura base de la pantalla

Orden recomendado:

1. resumen opcional superior si el modulo lo necesita
2. buscador principal
3. lista de cards
4. estado vacio o loading
5. FAB fijo para crear

```tsx
<>
  <div className="space-y-4">
    {summary}

    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="h-12 rounded-[20px] pl-11" />
    </div>

    <div className="space-y-3">{items}</div>
  </div>

  <Button
    size="icon"
    className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white"
  >
    <Plus className="h-6 w-6" />
  </Button>
</>
```

---

## Buscador

Reglas:

- altura compacta: `h-12`
- radio suave pero no exagerado: `rounded-[20px]`
- icono a la izquierda con `pl-11`
- fondo claro, casi plano
- sombra minima o casi nula

Referencia de clases:

```tsx
className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
```

Evitar:

- inputs demasiado altos
- glassmorphism pesado
- sombras amplias o blur notorio

---

## Cards de lista

Las cards deben sentirse sobrias, compactas y rapidas de escanear.

Reglas:

- usar radios medianos/grandes, pero no hero cards
- fondo blanco o blanco tibio
- borde suave visible
- sombra muy controlada
- padding interno compacto: normalmente `p-4`
- tipografia clara, con el titulo dominante pero no sobredimensionado

Referencia base:

```tsx
className="rounded-[24px] border border-stone-200/80 bg-white/80 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
```

Jerarquia sugerida:

- titulo: `text-[1.05rem] font-semibold`
- metadata secundaria: `text-sm text-muted-foreground`
- acciones secundarias discretas
- `ChevronRight` opcional al final para indicar drill-down

Evitar:

- exceso de padding vertical
- iconos o montos gigantes
- sombras grandes tipo marketing
- efectos hover muy notorios en mobile

---

## Fondo, bordes y superficies

Este criterio no aplica solo a listas. Tambien debe mantenerse en detalles, formularios y bloques internos.

Reglas globales:

- usar el fondo del shell (`app-shell`) como base de las pantallas mobile protegidas
- evitar `bg-gray-50` plano como fondo dominante en modulos operativos
- evitar cards con `border-0` + `shadow-lg` por defecto
- preferir borde suave visible y sombra corta
- si un bloque es secundario dentro de una card, usar una superficie muteda en vez de otro blanco puro

Utilidades recomendadas:

- `shell-surface` para headers y barras pegadas
- `shell-card-flat` para cards principales sobrias
- `shell-card-soft` para items internos o filas secundarias
- `shell-block-muted` para metricas internas o bloques de apoyo
- `shell-field` para inputs y campos de formulario

Referencia visual:

```tsx
<div className="min-h-screen app-shell">
  <header className="border-b shell-surface" />

  <Card className="shell-card-flat rounded-[28px]" />

  <div className="shell-card-soft rounded-[20px] p-3" />

  <div className="shell-block-muted rounded-[20px] p-3" />
</div>
```

Evitar:

- `bg-gray-50` en toda la pagina si ya estas dentro del shell
- `shadow-xl`, `shadow-lg` y blur pesados para cards operativas
- `border-0` en formularios y detalles, salvo casos muy justificados
- mezclar demasiados tonos de gris frios con el shell calido actual

---

## FAB (Floating Action Button)

Si la accion principal de la pantalla es "crear nuevo", usar FAB fijo en mobile en vez de depender solo de un boton inline en el header del contenido.

Motivos:

- mantiene el CTA visible al hacer scroll
- unifica modulos operativos
- libera espacio en la parte superior para busqueda y resumen

Referencia:

```tsx
<Button
  size="icon"
  className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
>
  <Plus className="h-6 w-6" />
</Button>
```

Reglas:

- usar `bottom-28` para no chocar con la bottom nav
- mantener un solo FAB primario por pantalla
- icono simple, normalmente `Plus`
- si existe estado pending, reemplazar el icono por spinner

---

## Resumen superior

Solo usarlo cuando aporta contexto real, como en `ventas`.

Reglas:

- compacto
- maximo una accion visual secundaria
- misma familia de radios/bordes que las cards
- nada de sombras pesadas ni bloques tipo hero

Si la pantalla no necesita resumen, empezar directamente con busqueda.

---

## Estados vacios y loading

Mantenerlos centrados y simples.

Patron:

- icono neutro del dominio
- texto corto
- CTA primario solo en estado vacio si ayuda a iniciar el flujo

---

## Archivos de referencia

- `packages/app/app/routes/_protected.ventas._index.tsx`
- `packages/app/app/routes/_protected.clientes._index.tsx`

---

## Regla para agentes

Cuando implementes una nueva pantalla de listado mobile:

- no inventes un layout nuevo si `ventas` o `clientes` ya resuelven el caso
- reutiliza el patron de buscador + lista + FAB
- favorece compacidad visual sobre decoracion
- si dudas entre mas sombra o menos sombra, usa menos
