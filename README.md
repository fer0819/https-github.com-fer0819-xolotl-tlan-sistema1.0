# XOLOTL TLAN

Sistema web de pedidos y operación para tacos de guisado.

## Base de datos independiente
Este proyecto usa un proyecto Supabase propio. **No conectes las credenciales ni la base de datos de CASA ODI.**

1. Crea un proyecto nuevo en https://supabase.com con el nombre `xolotl-tlan`.
2. Entra en **SQL Editor** y ejecuta completo `supabase/migrations/001_initial_schema.sql`.
3. En **Project Settings → API** copia Project URL y la clave pública anon/publishable.
4. Crea `.env.local` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

Nunca uses la clave `service_role` en el navegador ni la subas a GitHub.

## Instalación
```bash
npm install
npm run dev
npm run build
```

## Funcionalidad preparada
- Categorías, menú, disponibilidad y precios en COP.
- Pedidos persistentes con detalle de productos.
- El servidor calcula los importes desde los precios oficiales del menú.
- Historial de estados.
- Roles preparados: administrador, cocina, despacho y consulta.
- Políticas RLS para lectura pública del menú y operaciones internas.
- Función `submit_public_order` para recepción segura de pedidos QR.
- Realtime para que la pantalla de cocina se actualice al entrar un pedido.

La interfaz se conecta automáticamente cuando existen las variables Supabase. Mientras no se configuren, permanece en modo demostración. Para activar pedidos entre dispositivos, primero hay que crear el proyecto Supabase, ejecutar la migración y colocar las dos variables en `.env.local`.

## Siguiente etapa
Autenticación del personal, menú QR público, impresión térmica y despliegue web instalable.
