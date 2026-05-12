# Pendientes de Cochera

## Mejoras funcionales

- Mejorar cobertura de reportes si se necesitan filtros mas finos por turno, operador o metodo de pago.
- Definir si se agregaran clientes abonados o mensuales.
- Evaluar control de caja por turno.
- Evaluar exportacion avanzada si CSV/reportes actuales quedan cortos.
- Fortalecer permisos diferenciados entre admin y vendedor/operador si el negocio lo requiere.
- Evaluar tarifas por horario, noche, evento o fin de semana en una fase posterior.

## Riesgos a vigilar

- Reusar `/cobros` de polleria para deuda de cochera sin una frontera clara.
- Crear rutas duplicadas para dashboard/reportes/configuracion cuando las superficies compartidas ya son el contrato.
- Introducir offline-first en cochera sin plan especifico; la fase actual es online-only.
- Mezclar KPIs de polleria o agua dentro de dashboard de cochera.

## Fuera de alcance actual

- Reconocimiento automatico de placa.
- Integracion con barreras o hardware.
- Tickets impresos.
- Facturacion electronica.
- Valet parking.
- Cobro por minuto si la regla vigente sigue siendo por hora/gracia.
