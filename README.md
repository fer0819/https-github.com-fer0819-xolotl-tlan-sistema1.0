# XOLOTL TLAN — Sistema 1.0

Aplicación independiente para pedidos digitales de tacos de guisado y bebidas.

## Objetivo
El cliente escanea un código QR, consulta el menú, arma su pedido y lo confirma. El sistema completo conectará esos pedidos con la pantalla de cocina/despacho y una impresora de comandas.

## Primera etapa
Esta rama contiene la base visual responsive del menú y el carrito de pedidos, preparada con React, TypeScript y Vite.

## Estado actual
- Menú inicial: chícharo en salsa verde y roja, huevo, picadillo, papas con chorizo.
- Bebidas: horchata y jamaica.
- Precios iniciales: taco $7.000 COP; bebida $5.000 COP.
- Carrito, cantidades, total y confirmación visual de demostración.
- Adaptación para pantallas móviles y escritorio.

**Importante:** todavía es una demostración de interfaz. Aún no guarda pedidos en un servidor, no genera códigos QR únicos, no muestra pedidos en cocina y no imprime comandas. Esas funciones requieren backend, base de datos y configuración de impresora.

## Desarrollo local
Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Para comprobar la compilación:

```bash
npm run build
```

## Próximas etapas
1. Base de datos y registro real de pedidos.
2. Panel de cocina y pantalla de despacho en tiempo real.
3. Impresión de comandas y pruebas con el modelo de impresora.
4. Administración de menú, precios, horarios y disponibilidad.
5. Publicación web, QR del establecimiento y preparación para Android/iPhone.
