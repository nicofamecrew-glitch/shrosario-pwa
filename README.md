# SH Rosario PWA

SPA B2B para catalogo, carrito y pedidos via WhatsApp para SH Rosario.

## Requisitos
- Node.js 18+

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Configuracion

Crear un archivo `.env.local` en la raiz:

```bash
NEXT_PUBLIC_WA_PHONE=+5493410000000
NEXT_PUBLIC_WHOLESALE_CODE=MAYORISTA2024
NEXT_PUBLIC_VIP_CODES=VIPROSARIO,VIPB2B,VIPSH
SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

- `NEXT_PUBLIC_WA_PHONE`: numero que recibira el pedido por WhatsApp.
- `NEXT_PUBLIC_WHOLESALE_CODE`: codigo secreto para activar mayorista.
- `NEXT_PUBLIC_VIP_CODES`: codigos adicionales sin limite.
- `SHEETS_WEBHOOK_URL`: webhook de Google Apps Script para guardar leads/pedidos (opcional).

## Webhook Google Sheets (opcional)
1. Crear una hoja de calculo en Google Sheets.
2. En Apps Script, crear un endpoint `doPost` que guarde los campos recibidos.
3. Publicar como Web App y copiar la URL en `SHEETS_WEBHOOK_URL`.

El payload enviado incluye:
- `lead` (nombre, telefono, ciudad, rubro, observaciones)
- `items` (productos, variantes y cantidades)
- `isWholesale`
- `createdAt`

Si no hay webhook, los leads se guardan en `localStorage`.

## Deploy
- Vercel: conectar repo y desplegar.
- Netlify: usar build command `npm run build` y output `.next` (via Next.js adapter).

## Datos
Productos de ejemplo en `data/products.json`. Puede reemplazarse por export desde Sheets o JSON propio.

## Siguientes pasos sugeridos
- Ruta `/admin` con CRUD simple y carga de JSON.
- Integrar `next-pwa` para instalacion offline.
