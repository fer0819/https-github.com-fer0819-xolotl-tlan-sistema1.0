# XOLOTL TLAN

Sistema web de pedidos y operación para venta de tacos de guisado.

## Estado actual

Primera base funcional de interfaz:
- Panel de pedidos y resumen de ventas de la sesión.
- Menú inicial de guisos y bebidas.
- Creación de pedidos y envío a la pantalla de cocina.
- Flujo de estados: Nuevo → En preparación → Listo.
- Diseño adaptable a teléfonos, tabletas y computadoras.

## Requisitos

- Node.js 20 o superior
- npm

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## Generar versión de producción

```bash
npm run build
npm run preview
```

## Importante

Esta primera versión es una demostración de interfaz: los pedidos viven en memoria del navegador y se pierden al recargar. Todavía no está conectada a una base de datos, códigos QR públicos, impresora térmica ni sincronización entre dispositivos. Esas integraciones se implementarán en las siguientes etapas antes de usarla en operación real.

## Próximas etapas

1. Persistencia y backend seguro.
2. Menú público y pedidos por QR.
3. Panel de cocina multi-dispositivo.
4. Integración de impresión térmica.
5. Administración, usuarios y reportes.
