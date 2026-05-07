# Guía de QA manual — Avileo Cocheras

Esta guía ayuda a revisar manualmente el módulo de cocheras de **Avileo** antes o junto con la ejecución de pruebas E2E. No reemplaza los E2E: sirve para que una persona entienda los casos de negocio que deben validarse en la aplicación.

## Objetivo de negocio

El módulo de cocheras de Avileo está orientado a cocheras pequeñas. El dueño o encargado debe poder:

- Registrar el ingreso de vehículos.
- Ver qué vehículos siguen dentro de la cochera.
- Cobrar la salida aplicando reglas de tarifa, gracia, redondeo por hora y descuentos.
- Revisar ingresos, actividad reciente y reportes.

El vertical usa `businessMode: "cochera"` y reutiliza superficies principales de Avileo:

| Área | Ruta esperada |
| --- | --- |
| Dashboard | `/dashboard` |
| Configuración general | `/config` |
| Configuración de Cochera | `/config/cochera` |
| Reportes | `/reportes` |
| Operación diaria | `/cochera`, `/cochera/entrada`, `/cochera/cobrar/:id` |

## Alcance de esta revisión

Validar manualmente los flujos principales de cocheras en Avileo para los roles existentes:

- `ADMIN_NEGOCIO`
- `VENDEDOR`

No se deben validar roles nuevos ni pantallas de planes, pagos o upgrades porque el comportamiento de suscripción es interno.

## Precondiciones y preparación

1. Tener la base de datos y variables de entorno del proyecto configuradas.
2. Si se necesita data demo de cocheras en Avileo, ejecutar:

   ```bash
   bun --cwd packages/backend run db:seed:cochera
   ```

3. Para levantar la aplicación completa en desarrollo, el repositorio expone:

   ```bash
   bun run dev
   ```

   También existen scripts por paquete si se requiere levantar servicios por separado:

   ```bash
   bun --cwd packages/backend run dev
   bun --cwd packages/app run dev
   ```

4. Usuarios demo identificados en el seed de cocheras en Avileo:

| Rol | Correo | Contraseña | Notas |
| --- | --- | --- | --- |
| Admin | `cochera@avileo.com` | `cochera123456` | Asociado a negocio Profesional y negocio Gratis demo |
| Vendedor/operador | `cochera.operador@avileo.com` | `cochera123456` | Asociado al negocio Profesional como `VENDEDOR` |

5. Data inicial esperada del seed:
   - Negocio Profesional: `Avileo Cochera Demo`.
   - Negocio Gratis: `Avileo Cochera Gratis Demo`.
   - Configuración base: tarifa por hora, tarifa diaria, minutos de gracia, espacios totales y métodos de pago.
   - Sesiones demo: vehículos activos y vehículos ya cobrados.

## Casos de prueba manual

### 1. Onboarding y creación de negocio de cochera en Avileo

| Campo | Detalle |
| --- | --- |
| Objetivo | Confirmar que se puede crear o seleccionar un negocio con modo cochera y que la navegación queda adaptada al modo cochera. |
| Rol / usuario | `ADMIN_NEGOCIO` |

**Pasos**

1. Iniciar sesión como admin.
2. Crear un negocio nuevo si el flujo de onboarding está disponible, seleccionando el modo `cochera`; o seleccionar un negocio demo ya existente con `businessMode: "cochera"`.
3. Verificar que el usuario llega a superficies compartidas como `/dashboard` y no a rutas específicas antiguas del vertical.
4. Revisar la navegación disponible para operación, configuración y reportes.

**Resultados esperados**

- El negocio queda identificado como cochera en Avileo.
- La navegación muestra accesos coherentes con cochera.
- El dashboard usa `/dashboard`.
- Reportes usa `/reportes`.
- Configuración específica usa `/config/cochera`.

**Casos borde importantes**

- Cambiar entre negocios de distinto modo no debe mezclar navegación ni datos.
- Un negocio no cochera no debe mostrar accesos operativos de `/cochera`.

### 2. Acceso por roles: admin vs vendedor

| Campo | Detalle |
| --- | --- |
| Objetivo | Validar permisos con roles existentes, sin introducir roles nuevos. |
| Rol / usuario | Admin `cochera@avileo.com`; vendedor `cochera.operador@avileo.com` |

**Pasos**

1. Entrar como admin y revisar acceso a dashboard, operación, reportes y configuración.
2. Entrar como vendedor y revisar acceso a operación diaria.
3. Intentar acceder a configuración sensible desde el vendedor.
4. Confirmar que ambos roles usan solamente `ADMIN_NEGOCIO` o `VENDEDOR`.

**Resultados esperados**

- Admin puede administrar configuración y revisar reportes.
- Vendedor puede ejecutar el flujo operativo permitido: listar vehículos, registrar entradas y cobrar salidas si está habilitado para su rol.
- Vendedor no debe modificar configuración administrativa si el producto restringe esa acción.
- No aparecen roles como `OPERARIO`, `CAJERO` u `OWNER`.

**Casos borde importantes**

- Acceso directo por URL debe respetar permisos, no solo ocultar botones.
- Mensajes de acceso denegado deben ser claros y en español.

### 3. Configuración de Cochera en `/config/cochera`

| Campo | Detalle |
| --- | --- |
| Objetivo | Verificar que la configuración de tarifas y operación se guarda y afecta los cálculos posteriores. |
| Rol / usuario | `ADMIN_NEGOCIO` |

**Pasos**

1. Ir a `/config/cochera`.
2. Revisar campos de tarifa por hora, tarifa diaria, minutos de gracia, espacios totales y métodos de pago aceptados.
3. Cambiar valores razonables, por ejemplo tarifa por hora, minutos de gracia y métodos activos.
4. Guardar y recargar la pantalla.
5. Registrar o cobrar una sesión para confirmar que el cálculo usa la configuración vigente.

**Resultados esperados**

- Los valores se muestran con formato entendible.
- No se aceptan tarifas negativas, espacios negativos ni métodos vacíos si son requeridos para cobrar.
- Los cambios persisten después de recargar.
- El checkout respeta tarifa, gracia y métodos configurados.

**Casos borde importantes**

- `totalSpaces` bajo no debe romper la lista; debe reflejar ocupación correctamente.
- Si se desactiva un método de pago, no debe poder usarse al cobrar.

### 4. Lista de vehículos activos en `/cochera`

| Campo | Detalle |
| --- | --- |
| Objetivo | Confirmar que el operador ve ocupación actual, búsqueda y accesos de operación. |
| Rol / usuario | `ADMIN_NEGOCIO` o `VENDEDOR` |

**Pasos**

1. Ir a `/cochera`.
2. Revisar tarjetas, tabla o lista de vehículos actualmente dentro.
3. Buscar por placa existente, por fragmento y por placa inexistente.
4. Abrir una sesión activa para iniciar cobro.
5. Validar estados vacíos si no hay resultados.

**Resultados esperados**

- Solo aparecen vehículos con estado activo/dentro.
- La búsqueda filtra por placa de forma clara.
- La lista muestra datos útiles: placa, tipo de vehículo, hora de ingreso, tiempo transcurrido y acción de cobro.
- Una búsqueda sin resultados muestra un estado vacío, no un error.

**Casos borde importantes**

- La búsqueda debe funcionar aunque la placa se escriba en minúsculas.
- No deben aparecer sesiones ya cobradas como activas.

### 5. Registro de entrada en `/cochera/entrada`

| Campo | Detalle |
| --- | --- |
| Objetivo | Validar ingreso de vehículos, normalización de placa y prevención de duplicados activos. |
| Rol / usuario | `ADMIN_NEGOCIO` o `VENDEDOR` |

**Pasos**

1. Ir a `/cochera/entrada`.
2. Registrar un vehículo con placa en minúsculas o con espacios, por ejemplo ` abc-123x `.
3. Confirmar que la placa se guarda y muestra normalizada en mayúsculas.
4. Intentar registrar nuevamente la misma placa mientras sigue activa.
5. Registrar otro vehículo válido con otro tipo de vehículo si el formulario lo permite.

**Resultados esperados**

- El registro exitoso vuelve o dirige a la lista activa.
- La placa se normaliza a mayúsculas.
- No se permite duplicar una placa con sesión activa.
- El error de duplicado es claro para el usuario.

**Casos borde importantes**

- Placas vacías o demasiado cortas no deben guardarse.
- Notas opcionales no deben bloquear el registro.

### 6. Cobro de salida en `/cochera/cobrar/:id`

| Campo | Detalle |
| --- | --- |
| Objetivo | Confirmar cálculo de monto, aplicación de gracia, redondeo por hora, descuento y método de pago. |
| Rol / usuario | `ADMIN_NEGOCIO` o `VENDEDOR` |

**Pasos**

1. Desde `/cochera`, seleccionar un vehículo activo para cobrar.
2. Revisar hora de ingreso, tiempo transcurrido, tarifa usada y total preliminar.
3. Probar una sesión dentro del periodo de gracia.
4. Probar una sesión que requiera redondeo al techo de hora.
5. Aplicar descuento válido y confirmar nuevo total.
6. Seleccionar un método de pago permitido y finalizar cobro.

**Resultados esperados**

- Dentro de la gracia, el total debe ser `S/ 0`.
- Fuera de gracia, el cálculo usa techo por hora y tarifa configurada.
- El descuento reduce el total y, si supera el subtotal, el monto final queda en `S/ 0` sin volverse negativo.
- El método de pago es obligatorio y debe estar dentro de los métodos aceptados.
- Al cobrar, la sesión deja de aparecer como activa y queda disponible en reportes.

**Casos borde importantes**

- Descuento mayor al total debe bloquearse o ajustarse según regla del producto.
- Si el método de pago fue desactivado en configuración, no debe aparecer como opción válida.
- Reintentar cobrar una sesión ya cerrada no debe duplicar ingresos.

### 7. Dashboard de cochera en `/dashboard`

| Campo | Detalle |
| --- | --- |
| Objetivo | Validar que el dashboard compartido muestre KPIs y actividad del modo cochera. |
| Rol / usuario | `ADMIN_NEGOCIO` |

**Pasos**

1. Entrar a un negocio cochera y abrir `/dashboard`.
2. Revisar métricas principales: vehículos ingresados hoy, vehículos dentro ahora, ingresos de hoy e ingresos del mes.
3. Revisar el gráfico de ingresos de los últimos 7 días.
4. Revisar actividad reciente.
5. Registrar una entrada y luego cobrar una salida.
6. Volver al dashboard y confirmar que los KPIs se actualizan.

**Resultados esperados**

- El dashboard muestra contenido de cochera, no de pollería ni agua.
- Las métricas reflejan el negocio seleccionado.
- El gráfico de 7 días muestra días sin ingresos como `S/ 0`, no como datos faltantes o errores.
- La actividad reciente incluye eventos relevantes de entradas y salidas/cobros.
- No existe navegación a `/cochera/dashboard`.

**Casos borde importantes**

- Al cambiar a otro negocio cochera, los datos deben cambiar.
- Al cambiar a un negocio no cochera, no deben quedar KPIs de cochera.

### 8. Reportes y exportación en `/reportes`

| Campo | Detalle |
| --- | --- |
| Objetivo | Validar filtros, resumen, tabla y reglas internas de exportación. |
| Rol / usuario | `ADMIN_NEGOCIO` |

**Pasos**

1. Abrir `/reportes` en un negocio cochera.
2. Cambiar filtros de periodo: hoy, semana y mes.
3. Revisar resumen de ingresos y cantidad de registros.
4. Revisar la tabla de sesiones cobradas.
5. Probar exportación en negocio Profesional.
6. Probar comportamiento de exportación o límites en negocio Gratis.

**Resultados esperados**

- Los filtros actualizan resumen y tabla.
- La tabla muestra registros cobrados con placa, tipo, hora de entrada, hora de salida, duración, método de pago, descuento y total cuando aplique.
- En Profesional, la exportación está disponible según las reglas del producto.
- En Gratis, los límites internos se respetan sin mostrar UI de upgrade, WhatsApp, billing o comparación de planes.
- No existe navegación a `/cochera/reportes`.

**Casos borde importantes**

- Periodos sin datos muestran estado vacío.
- La exportación no debe incluir datos de otro negocio.

### 9. Comportamiento interno de suscripción

| Campo | Detalle |
| --- | --- |
| Objetivo | Confirmar límites de Gratis vs Profesional sin UI comercial nueva. |
| Rol / usuario | `ADMIN_NEGOCIO` |

**Pasos**

1. Seleccionar el negocio `Avileo Cochera Gratis Demo`.
2. Revisar operación y reportes cuando el límite mensual ya está alcanzado o cerca de alcanzarse.
3. Seleccionar el negocio `Avileo Cochera Demo` Profesional.
4. Comparar disponibilidad de registros/exportación.

**Resultados esperados**

- El plan Gratis respeta límites internos de registros/exportación.
- El plan Profesional permite el comportamiento ampliado esperado.
- No se muestra pantalla de upgrade, WhatsApp, billing, pago o comparación de planes.

**Casos borde importantes**

- Los límites no deben bloquear la navegación completa si solo corresponde bloquear una acción específica.
- Los mensajes deben ser informativos y no comerciales si aparece una restricción.

### 10. Restricciones para negocios no cochera

| Campo | Detalle |
| --- | --- |
| Objetivo | Asegurar que el módulo de cocheras no aparece ni opera en modos distintos. |
| Rol / usuario | `ADMIN_NEGOCIO` o usuario demo de otro modo |

**Pasos**

1. Cambiar a un negocio de pollería o agua.
2. Revisar menú, dashboard, configuración y reportes.
3. Intentar acceder directamente a `/cochera`, `/cochera/entrada`, `/config/cochera` y una URL de cobro.

**Resultados esperados**

- Las rutas de cochera no deben operar para negocios no cochera.
- Dashboard y reportes muestran contenido del modo correspondiente.
- No se mezclan textos, KPIs ni acciones de cochera.

**Casos borde importantes**

- El bloqueo por URL directa debe ser consistente.
- No debe quedar data cacheada de cochera después de cambiar de negocio.

### 11. Aislamiento por tenant y multi-negocio

| Campo | Detalle |
| --- | --- |
| Objetivo | Validar manualmente que los datos pertenecen al negocio seleccionado. |
| Rol / usuario | Admin con más de un negocio |

**Pasos**

1. Iniciar sesión como admin de un negocio de cochera.
2. Seleccionar el negocio Profesional y anotar placas activas, configuración y reportes.
3. Cambiar al negocio Gratis.
4. Revisar nuevamente placas activas, configuración y reportes.
5. Crear una entrada en un negocio y confirmar que no aparece en el otro.

**Resultados esperados**

- Cada negocio mantiene su propia configuración.
- Las sesiones activas y reportes no se mezclan.
- La exportación, si aplica, contiene solo datos del negocio actual.

**Casos borde importantes**

- Recargar la página después de cambiar de negocio no debe revertir al negocio anterior de forma incorrecta.
- Las búsquedas no deben encontrar placas de otro negocio.

### 12. Sanidad móvil y responsive

| Campo | Detalle |
| --- | --- |
| Objetivo | Confirmar que los flujos principales son usables en móvil. |
| Rol / usuario | `ADMIN_NEGOCIO` o `VENDEDOR` |

**Pasos**

1. Revisar `/cochera`, `/cochera/entrada`, `/cochera/cobrar/:id`, `/dashboard`, `/config/cochera` y `/reportes` en ancho móvil aproximado de 390 px.
2. Confirmar que botones primarios, formularios, tablas/listas y filtros son visibles y accionables.
3. Probar teclado móvil en campos de placa, montos y búsqueda.

**Resultados esperados**

- No hay desbordes horizontales graves.
- Las acciones principales están visibles sin depender de hover.
- Formularios y modales/sheets se pueden completar en pantalla pequeña.
- El contenido mantiene textos en español y formato local esperado.

**Casos borde importantes**

- Tablas de reportes deben adaptarse o ser navegables sin romper el layout.
- Botones de cobrar/guardar/exportar no deben quedar tapados por la navegación inferior.

## No debe ocurrir

Durante la revisión, marcar como regresión si aparece cualquiera de estos puntos:

- Ruta o enlace a `/cochera/dashboard`.
- Ruta o enlace a `/cochera/reportes`.
- Ruta o enlace a `/cochera/config`.
- UI de WhatsApp, upgrade, billing, pagos de plan o comparación de planes.
- Roles nuevos como `OPERARIO`, `CAJERO` u `OWNER`.
- Contenido de pollería o agua dentro del dashboard de un negocio cochera.
- Datos de otro negocio en listas, dashboard, reportes o exportaciones.
- Vehículos ya cobrados apareciendo como activos.
- Cobros duplicados para la misma sesión.
- Métodos de pago no configurados disponibles en checkout.

## Checklist rápido de smoke test pre-merge

Usar esta lista para una validación breve antes de correr E2E:

- [ ] Seed de cocheras en Avileo ejecutado o data manual preparada.
- [ ] Admin puede ingresar a `Avileo Cochera Demo`.
- [ ] Vendedor puede acceder al flujo operativo permitido.
- [ ] `/dashboard` muestra KPIs de cochera, no pollería/agua.
- [ ] `/config/cochera` guarda tarifa, gracia, espacios y métodos de pago.
- [ ] `/cochera` lista vehículos activos y permite buscar por placa.
- [ ] `/cochera/entrada` normaliza placa en mayúsculas y bloquea duplicados activos.
- [ ] `/cochera/cobrar/:id` calcula con gracia, techo horario, descuento y método válido.
- [ ] Una sesión cobrada desaparece de activos y aparece en reportes.
- [ ] `/reportes` filtra hoy/semana/mes y respeta reglas de exportación.
- [ ] Negocio Gratis no muestra UI comercial de upgrade o billing.
- [ ] Negocios no cochera no pueden usar rutas operativas de cochera.
- [ ] Cambio entre negocios no mezcla datos.
- [ ] Pantallas principales son usables en móvil.
