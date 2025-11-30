# Backend Mercado Libre + MongoDB

Backend minimal con Next.js (App Router) para:
- Recibir webhooks de órdenes de Mercado Libre Argentina.
- Obtener datos del comprador y del envío.
- Guardar/actualizar clientes y ventas en MongoDB usando Mongoose.

## Endpoints principales
- `GET /api/meli/oauth/callback`: callback OAuth, guarda token en Mongo.
- `POST /api/meli/webhook`: webhook de notificaciones (topic `orders`), persiste cliente y venta.
- `POST /api/meli/sync`: sincronización manual de órdenes recientes desde la API (útil para recuperar pedidos previos o perdidos).
- `GET /api/clientes`: lista de clientes (paginación `page`, `limit`).
- `GET /api/ventas`: lista de ventas (paginación `page`, `limit`).
- Frontend en `/` con botón de login OAuth, tabla de clientes guardados y botón de refresco manual.

## Variables de entorno (`.env.local`)
Ejemplo en `.env.local.example`:
```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/miBase
MELI_CLIENT_ID=tu_client_id
MELI_CLIENT_SECRET=tu_client_secret
MELI_REDIRECT_URI=https://tu-dominio.com/api/meli/oauth/callback
MELI_SELLER_ID=123456789
```

## Correr en local
```
npm install
npm run dev
```

## Flujo OAuth de Mercado Libre
1) Construí la URL de autorización y abrila en el navegador (sesión de la cuenta vendedora):
```
https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=TU_CLIENT_ID&redirect_uri=URL_ENCODED_REDIRECT_URI&state=opcional
```
2) Al aprobar, Mercado Libre redirige a `/api/meli/oauth/callback?code=...`.
3) El callback hace `POST https://api.mercadolibre.com/oauth/token`, guarda `access_token`, `refresh_token` y `expires_at` en Mongo (colección `melitokens`).

## Webhook de órdenes
- Configurá en la app de Mercado Libre `notification_url=https://tu-dominio.com/api/meli/webhook`.
- Cuando llegue un webhook `topic=orders`, el backend:
  - Usa `getValidAccessToken()` (refresca si vencido).
  - Llama a `GET /orders/{orderId}` y luego `GET /shipments/{shipmentId}`.
  - Upsert de Cliente por `buyer.id`.
  - Upsert de Venta por `order.id`, con items, total y fecha.
- El endpoint siempre responde `{ ok: true }`; errores se loguean en servidor.

## Modelos (Mongoose)
- Cliente (`clientes`):
  - `meliUserId` (único), `nombre`, `telefono`, `direccion{calle, numero, ciudad, provincia, cp, textoCompleto}`.
- Venta (`ventas`):
  - `meliOrderId` (único), `cliente` (ObjectId), `fecha`, `total`, `items[{itemId, titulo, sku, cantidad, precioUnitario}]`.
- Token (`melitokens`):
  - `sellerId` (único), `access_token`, `refresh_token`, `expires_at`.

## Notas
- Helpers en `lib/` manejan conexión a Mongo con caché y refresco OAuth.
- Si querés probar webhooks en local, usá un túnel (ngrok/Cloudflare) apuntando a `/api/meli/webhook`.
- La home (`/`) muestra un botón para el login OAuth, la lista de clientes almacenados y un botón para refrescar manualmente (por si se perdió un webhook).
- El botón “Sincronizar órdenes” en la home invoca `POST /api/meli/sync` y vuelve a cargar los clientes.
