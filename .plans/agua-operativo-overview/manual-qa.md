# Agua Operativo Manual QA

## Objetivo

Validar funcionalmente que un negocio de agua puede operar en Avileo de punta a punta para Perú: registro, inicio de sesión, creación del negocio, productos, clientes, rutas, entrega, venta al contado, inventario y reportes.

## Preparación

- Usar viewport móvil recomendado: `390x844`.
- Tener backend y frontend corriendo.
- Usar datos limpios o una cuenta nueva.
- Si se usa seed demo, confirmar que exista un admin y un repartidor de agua.

## Datos sugeridos

### Cuenta admin

- Nombre: `Admin Agua QA`
- Email: `admin.agua.qa@example.com`
- Password: `Password123!`

### Negocio

- Nombre: `Agua QA Perú`
- Tipo/modo: `Agua`

### Repartidor

- Nombre: `Repartidor Agua QA`
- Email: `repartidor.agua.qa@example.com`
- Rol: vendedor/repartidor

### Productos

- `Bidón 20L`
- `Bidón 10L`
- `Recarga 20L`
- Unidad: `unidad`
- Stock inicial sugerido: `50`

### Cliente

- Nombre: `Cliente Agua QA`
- Teléfono: `999888777`
- Dirección: `Av. Perú 123`
- Frecuencia: semanal
- Día: el día actual de prueba
- Bidones habituales: `2`
- Ruta: `Ruta Centro`
- Instrucciones: `Llamar antes de llegar`

## Checklist funcional

### 1. Registro de cuenta

1. Ir a registro.
2. Crear cuenta con datos del admin.
3. Confirmar que el registro finaliza sin errores.
4. Confirmar que el usuario queda autenticado o puede iniciar sesión.

Resultado esperado:

- La cuenta se crea correctamente.
- No aparecen errores técnicos.

### 2. Inicio de sesión

1. Cerrar sesión.
2. Iniciar sesión con el admin creado.

Resultado esperado:

- El login funciona.
- El usuario entra al dashboard o onboarding.

### 3. Creación de negocio de agua

1. Crear negocio nuevo.
2. Seleccionar modo `Agua`.
3. Completar datos básicos.

Resultado esperado:

- El negocio queda en modo agua.
- La UI usa lenguaje de agua: bidones, rutas, repartidor.
- No debe aparecer lenguaje principal de pollería como kilos/tara en el flujo de agua.

### 4. Productos e inventario

1. Entrar a productos.
2. Confirmar que los productos semilla de agua existen o crear productos manualmente.
3. Editar nombre/precio de un producto.
4. Ajustar inventario de una variante.

Resultado esperado:

- Los productos semilla son editables.
- La unidad es `unidad`.
- El stock se guarda correctamente.

### 5. Crear repartidor

1. Ir a equipo/usuarios.
2. Invitar o crear un repartidor.
3. Confirmar que aparece como opción al crear ruta.

Resultado esperado:

- El repartidor puede ser asignado a una ruta de agua.

### 6. Crear cliente de agua

1. Ir a clientes.
2. Crear cliente nuevo.
3. Completar datos básicos.
4. En sección de agua, configurar frecuencia, día, cantidad habitual, ruta e instrucciones.
5. Guardar.

Resultado esperado:

- El cliente se crea correctamente.
- La ficha/lista muestra resumen útil para reparto.
- No aparecen campos de depósito, envases prestados, dañados, perdidos o devolución.
- No se solicita deuda ni pago parcial.

### 7. Crear ruta de agua

1. Ir a distribución/rutas.
2. Crear nueva ruta.
3. Seleccionar repartidor.
4. Seleccionar o crear `Ruta Centro`.
5. Previsualizar clientes programados.
6. Crear ruta.

Resultado esperado:

- La previsualización muestra al cliente si su día coincide con la fecha.
- La ruta se crea con visitas/paradas.
- No se permite crear duplicado para el mismo repartidor y fecha.

### 8. Login como repartidor

1. Cerrar sesión admin.
2. Iniciar sesión como repartidor.
3. Ir a `Mi distribución`.

Resultado esperado:

- El repartidor ve la ruta asignada.
- Ve paradas de agua con cliente, dirección, cantidad esperada e instrucciones.

### 9. Completar entrega con venta

1. En una parada, seleccionar producto/variante, por ejemplo `Bidón 20L`.
2. Confirmar cantidad entregada, por ejemplo `2`.
3. Seleccionar método de pago: efectivo, Yape, Plin o transferencia.
4. Marcar como `Entregado`.

Resultado esperado:

- La parada queda completada.
- Se crea una venta al contado.
- El pago queda como pago total.
- La deuda queda en `0`.
- El inventario del producto baja por la cantidad entregada.
- La visita queda asociada a la venta.

### 10. Validar bloqueo de deuda parcial en agua

1. Intentar registrar una venta de agua con `A cuenta` o `Debe todo`, si la UI permite llegar al editor.
2. Intentar guardar pago incompleto.

Resultado esperado:

- La UI no muestra `A cuenta` ni `Debe todo` para agua.
- Si se fuerza un pago incompleto, el backend lo rechaza.

### 11. No atendido / reprogramado

1. Crear o usar otra parada.
2. Marcar `No atendió` o `Reprogramar`.

Resultado esperado:

- La parada cambia de estado.
- No se crea venta.
- No baja inventario.
- No se registra deuda.

### 12. Dashboard agua

1. Volver al dashboard admin.
2. Revisar cards principales.

Resultado esperado:

- Se muestran métricas de agua: recaudación, bidones, paradas completadas/pendientes.
- No se priorizan kilos/tara/deudores como flujo principal.

### 13. Reportes agua

1. Ir a reportes.
2. Revisar reporte operacional de agua.

Resultado esperado:

- Se ve recaudación por método de pago.
- Se ven bidones vendidos/entregados.
- Se ve breakdown por ruta/repartidor.

### 14. Cierre de ruta / mi distribución

1. Desde repartidor, revisar resumen de mi distribución.
2. Confirmar recaudación por método.
3. Confirmar bidones/paradas.

Resultado esperado:

- El cierre refleja ventas reales de entregas.
- Los métodos de pago suman correctamente.

### 15. Offline / conectividad

1. Simular sin conexión.
2. Intentar completar entrega.

Resultado esperado:

- La acción online-only se bloquea o muestra mensaje claro.
- No queda una entrega parcialmente registrada.
- Las lecturas previamente cargadas se mantienen cuando aplique.

## Regresiones rápidas

### Pollería

- Crear venta con crédito/parcial si el flujo lo permite.
- Confirmar que kilos/tara siguen disponibles donde corresponde.
- Confirmar que distribución de pollería no fue afectada.

### Cochera

- Confirmar que pantallas de cochera no muestran campos de agua.
- Confirmar que flujo de deuda/cochera no fue alterado.

## Criterios de aceptación

- Un admin puede configurar negocio de agua, productos, clientes y rutas.
- Un repartidor puede completar entregas.
- Cada entrega completada genera venta pagada completa.
- El inventario baja correctamente.
- No existe deuda parcial en agua.
- No se muestran depósitos ni envases prestados en el flujo base.
- Dashboard y reportes reflejan operación real.
- Los flujos de pollería/cochera no presentan regresiones evidentes.

## Incidencias a reportar

Para cada problema encontrado, registrar:

- Pantalla o ruta.
- Usuario usado.
- Pasos exactos.
- Resultado actual.
- Resultado esperado.
- Captura o video si aplica.
- Consola/network si es error técnico.
