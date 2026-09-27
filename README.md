# Tienda Nexos — Guía para administrarla

## Panel de administración (recomendado)

1. En el archivo `.env` completá `ADMIN_USER` y `ADMIN_PASSWORD` (una contraseña larga).
2. Abrí la tienda con `INICIAR-TIENDA.bat` y entrá a **http://localhost:8080/admin**.
3. Desde ahí cargás y editás productos (con fotos), cambiás precios de a muchos, manejás
   categorías, cambiás el banner y ves los pedidos.
4. Botón **Respaldo** (arriba a la derecha): descarga todo en un archivo. Hacelo seguido.

Los datos que cargás en el panel se guardan en la carpeta `.data` (no la borres).
Lo que sigue en esta guía es para quien quiera editar archivos a mano.

## Publicar en un servidor con disco

- Construir: `npm run build:servidor` · Iniciar: `npm start`
- Variables: las del `.env`, más `DATA_DIR` apuntando al disco persistente
  (ej. `/data`) y `PUBLIC_SITE_URL=https://nexoscba.com`.

## Abrirla en tu PC

Doble clic en `INICIAR-TIENDA.bat` y abrí http://localhost:8080. No cierres la ventana negra.
Cada vez que cambies algo, guardá el archivo y refrescá el navegador.

Para editar archivos usá un editor de texto de código, por ejemplo **Visual Studio Code** (gratis).
No uses Word ni el Bloc de notas con formato.

---

## 1. Productos — `src/data/products.json`

Cada producto es un bloque entre llaves `{ }`. Ejemplo:

```json
{
  "slug": "kit-2-en-1-total-taladro-96-nm-y-llave-de-impacto-de-850-nm-eoxqq",
  "name": "Kit 2 en 1 Total - Taladro 96 nm y Llave de impacto de 850 nm",
  "brand": "Total",
  "category": "kits-herramientas-a-bateria",
  "priceCard": 630855,
  "stock": 2,
  "available": true,
  "images": [
    { "src": "/img/productos/kit-2-en-1-total-...-1.webp", "w": 900, "h": 900 }
  ],
  "variants": [],
  "short": "Frase corta que aparece en Google."
}
```

| Campo | Qué es |
|---|---|
| `slug` | La dirección web del producto. Minúsculas, sin tildes ni espacios (usar guiones). No cambiarlo en productos que ya existen. |
| `name` | Nombre que se ve en la tienda. |
| `brand` | Marca (o `null` si no tiene). |
| `category` | El `slug` de la categoría (ver punto 3). |
| `priceCard` | **Precio de lista / tarjeta**, sin puntos. El precio con transferencia (28% OFF) y el valor de las 6 cuotas se calculan solos. `null` = "Precio a consultar". |
| `stock` | Unidades disponibles. |
| `available` | `true` se puede comprar, `false` muestra "Sin stock". |
| `images` | Fotos (ver punto 5). La primera es la principal. |
| `variants` | Modelos/colores. Vacío `[]` si no tiene. |

**Cambiar un precio:** buscá el producto (Ctrl+F) y cambiá el número de `priceCard`.

**Agregar un producto:** copiá un bloque existente, pegalo después (separado por una coma), cambiá los datos y subí las fotos a `public/img/productos/`.

**Descripción larga:** en `src/data/descriptions.json`, con el mismo `slug`: `"el-slug": ["línea 1", "- viñeta", "- viñeta"]`.

## 2. Descuento, cuotas y garantía — `src/lib/products.ts` (arriba de todo)

`TRANSFER_DISCOUNT = 0.28` (28%), `INSTALLMENTS = 6`, `WARRANTY_MONTHS = 6`, WhatsApp y redes.

## 3. Categorías — `src/lib/products.ts` (lista `categories`)

Copiá una categoría existente y cambiá: `slug`, `name`, `parent` (`"herramientas"` o `"electronica"`; sin `parent` es categoría principal), `seoTitle` (hasta 60 caracteres), `seoDescription` (hasta 155) e `intro`. Después usá ese `slug` en el campo `category` de los productos. No dejes categorías vacías.

## 4. Banner principal — `src/assets/hero-tools.webp` y `hero-tools-800.webp`

Reemplazá esas dos imágenes por otras con el **mismo nombre**. El texto del banner está en `src/routes/index.tsx`.

## 5. Tamaños recomendados de fotos

| Lugar | Tamaño | Formato y peso | Consejos |
|---|---|---|---|
| Fotos de producto | **1200 × 1200 px** (cuadradas, mínimo 800) | WebP o JPG, menos de 200 KB | Fondo blanco, producto centrado ocupando ~80%. |
| Banner principal (computadora) | **1600 × 1008 px** | WebP, menos de 250 KB | Dejá el tercio izquierdo oscuro/limpio para el texto; lo importante a la derecha. |
| Banner principal (celular) | **800 × 504 px** (la misma imagen, más chica) | WebP, menos de 80 KB | En celular se ve la parte derecha de la foto. |
| Vista previa al compartir | **1200 × 630 px** | JPG, menos de 300 KB | `public/og-herramientas.jpg`, `public/og-electronica.jpg`, `public/og-image.jpg`. Logo centrado con margen. |
| Logos | PNG/WebP con fondo transparente, **alto mínimo 200 px** | Menos de 50 KB | `src/assets/logo-nexos.png`, `src/assets/logo-nexgo.webp`. |
| Favicon (ícono de pestaña) | **64 × 64 px** (o 512 × 512) | PNG | `public/favicon.png`. |

Para convertir y achicar fotos gratis: https://squoosh.app

## 6. Mapa del sitio para Google

Se actualiza solo cada vez que abrís `INICIAR-TIENDA.bat`.

## 7. Configurar pagos (archivo `.env`)

Completá las claves de Mercado Pago y los datos de transferencia en `.env` y reiniciá la tienda.
No compartas ese archivo.

## Si algo se rompe

Casi siempre es una coma o comilla de más/menos en el JSON. La ventana negra muestra el archivo y la línea del error: pasale una captura a Claude.
