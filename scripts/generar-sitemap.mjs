// Regenera public/sitemap.xml a partir de los productos y categorías.
// Se ejecuta solo al abrir INICIAR-TIENDA.bat (o con: npm run sitemap).
import fs from "node:fs";

const SITE = "https://nexoscba.com";
// Datos cargados desde el panel (.data) o, si todavía no existen, los de fábrica.
const dataDir = process.env.DATA_DIR || ".data";
const live = fs.existsSync(`${dataDir}/catalogo.json`)
  ? JSON.parse(fs.readFileSync(`${dataDir}/catalogo.json`, "utf8"))
  : null;
const products = live?.products ?? JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
const cats = (live?.categories ?? JSON.parse(fs.readFileSync("src/data/categories.json", "utf8"))).map((c) => c.slug);
const today = new Date().toISOString().slice(0, 10);

const pages = [
  ["/", "1.0"],
  ["/catalogo", "0.8"],
  ["/contacto", "0.4"],
  ["/politica-de-devolucion", "0.3"],
  ...cats.map((c) => [`/categoria/${c}`, "0.8"]),
];

const esc = (s) => s.replace(/&/g, "&amp;");
let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
for (const [path, pr] of pages) {
  xml += `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${pr}</priority>\n  </url>\n`;
}
for (const p of products) {
  xml += `  <url>\n    <loc>${SITE}/productos/${p.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p.available ? "0.7" : "0.5"}</priority>\n`;
  for (const im of (p.images || []).slice(0, 3)) {
    xml += `    <image:image><image:loc>${esc(SITE + im.src)}</image:loc></image:image>\n`;
  }
  xml += `  </url>\n`;
}
xml += `</urlset>\n`;
fs.writeFileSync("public/sitemap.xml", xml);
console.log(`Sitemap actualizado: ${pages.length + products.length} páginas.`);
