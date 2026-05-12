# Flujos de Cochera

## 1. Onboarding / seleccion de negocio

1. El usuario crea o selecciona negocio con `businessMode: "cochera"`.
2. Avileo muestra navegacion coherente con cochera.
3. Las superficies compartidas se adaptan: `/dashboard`, `/reportes`, `/config`.

Ruta principal: `/business/create`.

## 2. Configuracion de cochera

1. Admin abre `/config/cochera`.
2. Define nombre/datos operativos si aplica.
3. Configura tarifa por hora, tarifa diaria, minutos de gracia y espacios.
4. Activa metodos de pago permitidos.
5. Activa tipos de vehiculo y, si necesita precios distintos, configura tarifa propia por tipo.
6. Guarda y usa esos valores en futuras entradas/cobros.

Ruta principal: `/config/cochera`.

## 3. Entrada de vehiculo

1. Operador abre `/cochera/entrada`.
2. Ingresa placa, tipo de vehiculo y notas opcionales.
3. El sistema normaliza la placa a mayusculas.
4. Valida que no exista una sesion activa con la misma placa.
5. Resuelve la tarifa efectiva del tipo de vehiculo: tarifa propia si existe, tarifa global si no.
6. Guarda una captura de tarifa (`pricingSnapshot`) en la sesion para que cambios posteriores de configuracion no alteren el cobro.
7. Crea sesion activa y vuelve a la lista.

Rutas principales: `/cochera/entrada`, `/cochera`.

## 4. Lista de vehiculos activos

1. Operador abre `/cochera`.
2. Revisa ocupacion actual.
3. Busca por placa.
4. Selecciona vehiculo para cobrar salida.

Ruta principal: `/cochera`.

## 5. Cobro de salida

1. Operador abre `/cochera/cobrar/:id` desde una sesion activa.
2. Revisa hora de ingreso, tiempo, tarifa y total.
3. El sistema aplica gracia, redondeo y tarifa del snapshot guardado al ingresar.
4. Operador aplica descuento si corresponde.
5. Selecciona metodo de pago permitido.
6. Finaliza cobro y la sesion deja de estar activa.

Ruta principal: `/cochera/cobrar/:id`.

## 6. Dashboard y reportes

1. Admin abre `/dashboard` para ver KPIs de cochera.
2. Admin abre `/reportes` para revisar ingresos/sesiones.
3. Al cambiar de negocio, los datos deben cambiar con el `businessId` activo.

Rutas principales: `/dashboard`, `/reportes`.
