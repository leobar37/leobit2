# Trabajar sin internet

Una de las características más importantes de Avileo es que **funciona completamente offline**. Esto significa que puedes seguir vendiendo, registrando clientes y gestionando tu negocio incluso cuando no tienes conexión a internet.

## ¿Qué puedes hacer offline?

✅ **Todo lo esencial del negocio**:

| Función | Offline | Sincroniza después |
|---------|---------|-------------------|
| Registrar ventas | ✅ | ✅ |
| Crear clientes | ✅ | ✅ |
| Registrar abonos | ✅ | ✅ |
| Crear pedidos | ✅ | ✅ |
| Ver productos | ✅ | ✅ |
| Consultar clientes | ✅ | ✅ |
| Ver historial | ✅ | ✅ (hasta última sync) |
| Cierre del día | ✅ | ✅ |

## Cómo funciona el modo offline

### Almacenamiento local

Avileo guarda una copia de tus datos en el dispositivo:

- **Clientes**: Toda tu base de datos
- **Productos**: Catálogo completo con precios
- **Ventas**: Historial reciente
- **Configuración**: Ajustes del negocio

### Indicador de conexión

En la parte superior de la pantalla verás:

| Icono | Estado | Significado |
|-------|--------|-------------|
| 🟢 Verde | Online | Conectado y sincronizado |
| 🟡 Amarillo | Sincronizando | Procesando datos |
| 🔴 Rojo | Offline | Sin conexión, modo local |

## Trabajar sin conexión

### Cuando pierdes internet

1. El sistema detecta automáticamente la desconexión
2. Cambia al modo offline (icono rojo)
3. Puedes seguir trabajando normalmente
4. Los datos se guardan localmente

### Registrar una venta offline

El proceso es exactamente igual:

1. Toca **"Nueva venta"**
2. Selecciona cliente (de los que tienes guardados)
3. Agrega productos
4. Confirma la venta

> 💡 **Tip**: La venta se guarda localmente con fecha y hora exacta.

### Crear cliente offline

1. Ve a **Clientes > Nuevo**
2. Completa los datos
3. Guarda

El cliente queda disponible inmediatamente para hacerle ventas, aunque estés offline.

## Sincronización

### Cuándo sincroniza

El sistema intenta sincronizar:

- Cada 30 segundos (si hay internet)
- Al recuperar la conexión
- Manualmente (cuando tú lo solicitas)
- Al cerrar sesión

### Qué sincroniza

#### Subir (del dispositivo a la nube):
- Ventas nuevas
- Clientes nuevos
- Abonos registrados
- Pedidos creados
- Cierres de día

#### Descargar (de la nube al dispositivo):
- Actualizaciones de productos/precios
- Nuevos clientes (de otros vendedores)
- Cambios en configuración
- Reportes actualizados

### Sincronización manual

Si necesitas sincronizar ya:

1. Toca el **icono de sincronización** (flechas circulares)
2. O ve a **Configuración > Sincronizar ahora**
3. Espera a que complete

## Resolver conflictos

### ¿Qué es un conflicto?

Ocurre cuando:
- Editaste un cliente offline
- Otro usuario editó el mismo cliente online
- Al sincronizar, hay versiones diferentes

### Cómo los resuelve Avileo

El sistema usa **"último cambio gana"** basado en timestamp:

1. Compara fecha/hora de modificación
2. Mantiene el cambio más reciente
3. Guarda registro del conflicto

### Revisar conflictos

Si hubo conflictos:

1. Ve a **Configuración > Sincronización**
2. Toca **"Ver log de sincronización"**
3. Revisa conflictos resueltos
4. Corrige manualmente si es necesario

## Límites del modo offline

### Qué NO puedes hacer offline

❌ Invitar nuevos usuarios  
❌ Cambiar configuración del negocio  
❌ Ver reportes en tiempo real  
❌ Exportar datos a la nube  
❌ Recibir actualizaciones de la app  

### Límites de almacenamiento

El espacio local es limitado:

- Aproximadamente **50-100 MB** por navegador/dispositivo
- Equivale a miles de ventas y clientes
- Si te acercas al límite, el sistema te avisa

## Mejores prácticas

### Antes de salir a vender

1. **Sincroniza**: Asegúrate de tener datos actualizados
2. **Descarga**: Verifica que tengas todos los productos
3. **Prueba**: Cierra internet un momento y verifica que funcione

### Durante el día

1. **No te preocupes**: Trabaja normal, el sistema guarda todo
2. **Revisa el icono**: Mantente atento al estado de conexión
3. **Sincroniza cuando puedas**: Si tienes momentos con WiFi, aprovecha

### Al final del día

1. **Conecta a internet**: WiFi o datos móviles
2. **Espera sincronización**: Deja que termine (icono verde)
3. **Verifica**: Revisa que todas tus ventas aparezcan online
4. **Confirma**: Si eres admin, revisa que todo cuadre

## Solución de problemas

### "No sincroniza"

1. Verifica que tengas internet
2. Toca sincronización manual
3. Espera unos minutos
4. Si persiste, reinicia la app

### "Faltan ventas después de sync"

1. Ve a **Configuración > Sincronización**
2. Toca **"Reintentar pendientes"**
3. Verifica cola de operaciones

### "Datos desactualizados"

1. Forza sincronización manual
2. Si persiste, cierra sesión y vuelve a entrar
3. Esto recarga todos los datos desde cero

### "Sin espacio local"

1. Ve a **Configuración > Almacenamiento**
2. Limpia caché de imágenes antiguas
3. Archiva ventas muy antiguas
4. Considera usar dispositivo con más espacio

## Ventajas del modo offline

### Para vendedores ambulantes

- ✅ Vende en cualquier lugar, sin depender de señal
- ✅ Más rápido (no espera respuestas del servidor)
- ✅ Funciona en zonas rurales o con mala señal
- ✅ No consume datos móviles constantemente

### Para el negocio

- ✅ Sin interrupciones por problemas de internet
- ✅ Menor consumo de ancho de banda
- ✅ Respaldo automático en múltiples dispositivos
- ✅ Continuidad operativa garantizada

---

**Anterior**: [Ajustes del negocio ←](../09-configuracion/01-ajustes.md)

---

## ¡Felicitaciones!

Has completado todos los tutoriales de Avileo. Ahora conoces todas las funcionalidades del sistema para gestionar tu negocio de venta de pollos de manera eficiente.

### ¿Necesitas más ayuda?

- Revisa los tutoriales específicos de cada módulo
- Usa el botón de ayuda (?) para ver tutoriales relevantes
- Contacta al soporte si tienes problemas técnicos

### Recuerda

- 🌐 Avileo funciona offline
- 💰 Controla tus ventas y créditos
- 📊 Revisa tus reportes regularmente
- 🔄 Sincroniza tus datos frecuentemente

**¡Éxito en tu negocio!**
