# Avileo Mobile UI Guidelines

Guia practica para que una pantalla mobile protegida de Avileo se vea consistente, limpia y lista para uso operativo.

## Anatomia base

- Usa siempre el shell protegido compartido: header del `AppLayout`, contenido dentro de `MobilePage.Root`, bottom nav del shell y un solo FAB cuando haya accion principal.
- No montes `MobileShell.Root`, `MobileShell.Header`, `MobileShell.Content` o `MobileShell.Footer` dentro de una ruta `_protected.*`; el layout ya los provee.
- Declara titulo, boton de volver y acciones de header con `MobileSlot`.
- El contenido debe iniciar con busqueda, resumen o lista segun la tarea; evita hero cards decorativas en pantallas operativas.
- Usa drawers para crear, editar, subir imagenes o elegir opciones cuando la accion sea temporal y no merezca una ruta completa.

## Superficies y cards

La regla visual principal: las pantallas operativas deben sentirse limpias y tactiles. Las cards no deben depender de bordes visibles para separar contenido.

Correcto:

```tsx
<MobilePage.Card
  variant="soft"
  className="!border-0 bg-card/85 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:bg-card/75"
>
  ...
</MobilePage.Card>
```

Incorrecto:

```tsx
<MobilePage.Card variant="soft" className="border shadow-lg">
  ...
</MobilePage.Card>
```

Reglas:

- Usa `!border-0` en cards de pantalla, filas de lista y empty states cuando el borde sea visualmente duro.
- Mantén sombras cortas y suaves; evita `shadow-lg`, `shadow-xl` o efectos de marketing.
- Usa bordes solo en campos, inputs, divisores internos o zonas que realmente necesitan contencion.
- Prefiere `bg-card`, `bg-card/85`, `bg-muted/70`, `text-foreground` y `text-muted-foreground`.

## Listas y filas

Correcto:

```tsx
<MobilePage.Card className="!border-0 bg-card/85 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
  <CardContent className="flex items-center gap-3 p-4">
    <div className="h-10 w-10 rounded-xl bg-orange-500" />
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold text-foreground">Nombre</p>
      <p className="text-sm text-muted-foreground">Detalle secundario</p>
    </div>
  </CardContent>
</MobilePage.Card>
```

Reglas:

- El titulo de la fila domina, pero no crece a escala hero.
- La metadata secundaria usa `text-muted-foreground`.
- Las acciones secundarias son icon buttons discretos con hover suave.
- El FAB queda reservado para crear o iniciar la accion principal.

## Empty states y drawers

- Empty state: icono neutro, texto corto y CTA solo si ayuda a empezar.
- Drawer: sin separadores duros por defecto; si necesita header, usa `border-b-0` o un separador muy suave.
- En mobile, acciones como subir imagen, tomar foto, galeria, crear etiqueta o editar item deben vivir en drawer si no requieren una pantalla completa.

Correcto:

```tsx
<AppDrawer contentClassName="border-0 bg-background">
  <AppDrawer.Header className="border-b-0 pb-2" title="Nueva Etiqueta" />
  <AppDrawer.Body className="pt-2">...</AppDrawer.Body>
</AppDrawer>
```

## Light y dark mode

- No uses negros, blancos o grises fijos para superficies principales.
- Usa tokens semanticos y opacidades: `bg-card/85`, `bg-muted/70`, `text-foreground`, `text-muted-foreground`.
- Si necesitas una variante especifica, agrega `dark:` al mismo elemento; no dejes estilos oscuros hardcodeados en light mode.
- Verifica siempre el contraste de titulo, metadata, iconos y botones en ambos modos.

## Referencias recientes

- `/config/tags`: filas y cards sin borde visible, drawer suave y FAB para crear.
- `/activos`: subida de imagen en drawer, sin panel inline arriba de la lista.
- `/cobros/nuevo`: tarjetas de formulario limpias, metodos de pago sin borde duro y comprobante en drawer.
- `/config`: menu con tarjetas claras en light mode y oscuras solo con `dark:`.

## Checklist antes de cerrar una pantalla

- No hay shell movil duplicado.
- No hay cards con bordes duros innecesarios.
- No hay colores oscuros hardcodeados que rompan light mode.
- Dark mode conserva contraste y jerarquia.
- El CTA principal esta claro y accesible.
- El flujo de crear/editar/subir usa drawer o ruta completa de forma intencional.
