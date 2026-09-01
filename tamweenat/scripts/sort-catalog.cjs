const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "../..");

const categoryOrder = [
  "proteins",
  "bakery",
  "dairy",
  "fries-appetizers",
  "sauces",
  "fresh-vegetables",
  "soft-drinks",
  "water",
  "packaging-hygiene",
];

const categoryAliases = new Map([
  ["اللحوم والدجاج", "proteins"],
  ["المخبوزات", "bakery"],
  ["الأجبان ومنتجات الألبان", "dairy"],
  ["البطاطا والمقبلات", "fries-appetizers"],
  ["الصلصات والتتبيلات", "sauces"],
  ["الخضروات الطازجة", "fresh-vegetables"],
  ["المشروبات الغازية", "soft-drinks"],
  ["المياه", "water"],
  ["التغليف والنظافة", "packaging-hygiene"],
]);

const featuredSkus = [
  "BRG-0032", "BRG-0031", "BRG-0030", "BRG-0029", "BRG-0028", "BRG-0036",
  "BRG-0021", "BRG-0024", "BRG-0019", "BRG-0022", "BRG-0018", "BRG-0025",
  "BRG-0046", "BRG-0045", "BRG-0047", "BRG-0048", "BRG-0044", "BRG-0040",
  "BRG-0091", "BRG-0090", "BRG-0089", "BRG-0088", "BRG-0087", "BRG-0086",
  "BRG-0066", "BRG-0065", "BRG-0068", "BRG-0067", "BRG-0069", "BRG-0070",
  "BRG-0059", "BRG-0060", "BRG-0061", "BRG-0079",
  "BRG-0005", "BRG-0006", "BRG-0008", "BRG-0009", "BRG-0001", "BRG-0002",
  "BRG-0156", "BRG-0157", "BRG-0150", "BRG-0151", "BRG-0148", "BRG-0149",
  "BRG-0152", "BRG-0154", "BRG-0155", "BRG-0158", "BRG-0153", "BRG-0159",
  "BRG-0160", "BRG-0161", "BRG-0162",
];

const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]));
const featuredRank = new Map(featuredSkus.map((sku, index) => [sku, index]));

function normalizedCategory(product) {
  return categoryAliases.get(product.category) || product.category;
}

function skuOf(product) {
  return String(product.sku || product.id || "").toUpperCase();
}

function numericSku(product) {
  return Number(skuOf(product).match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
}

function sortProducts(products) {
  return products
    .map((product, index) => ({ product, index }))
    .sort((left, right) => {
      const leftCategory = categoryRank.get(normalizedCategory(left.product)) ?? Number.MAX_SAFE_INTEGER;
      const rightCategory = categoryRank.get(normalizedCategory(right.product)) ?? Number.MAX_SAFE_INTEGER;
      if (leftCategory !== rightCategory) return leftCategory - rightCategory;

      const leftFeatured = featuredRank.get(skuOf(left.product)) ?? Number.MAX_SAFE_INTEGER;
      const rightFeatured = featuredRank.get(skuOf(right.product)) ?? Number.MAX_SAFE_INTEGER;
      if (leftFeatured !== rightFeatured) return leftFeatured - rightFeatured;

      return numericSku(left.product) - numericSku(right.product) || left.index - right.index;
    })
    .map(({ product }) => product);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

const publicCatalogPath = "tamweenat/assets/products/catalog.json";
const publicCatalog = readJson(publicCatalogPath);
publicCatalog.products = sortProducts(publicCatalog.products);
writeJson(publicCatalogPath, publicCatalog);

const apiCatalogPath = "tamweenat-api/catalog.json";
const apiCatalog = sortProducts(readJson(apiCatalogPath));
writeJson(apiCatalogPath, apiCatalog);

const productIndex = publicCatalog.products.map(({ id, sku, nameAr, nameEn, category, available }) => ({
  id,
  sku,
  nameAr,
  nameEn,
  category,
  available,
}));
fs.writeFileSync(
  path.join(root, "tamweenat/assets/products/products-index.js"),
  `window.TamweenatProductCatalog = Object.freeze(${JSON.stringify(productIndex)});\n`,
);

function updateBundle(relativePath) {
  const bundlePath = path.join(root, relativePath);
  let source = zlib.gunzipSync(fs.readFileSync(bundlePath)).toString("utf8");

  const categoriesStart = source.indexOf("var vy=") + "var vy=".length;
  const productsMarker = source.indexOf(",yy=", categoriesStart);
  const productsStart = productsMarker + ",yy=".length;
  const productsEnd = source.indexOf(",by=", productsStart);
  if (categoriesStart < "var vy=".length || productsMarker < 0 || productsEnd < 0) {
    throw new Error(`Unable to locate catalogue data in ${relativePath}`);
  }

  const categories = JSON.parse(source.slice(categoriesStart, productsMarker));
  const allCategory = categories.find((category) => category.id === "all");
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const sortedCategories = [allCategory, ...categoryOrder.map((id) => categoryById.get(id))].filter(Boolean);

  source = `${source.slice(0, categoriesStart)}${JSON.stringify(sortedCategories)},yy=${JSON.stringify(publicCatalog.products)}${source.slice(productsEnd)}`;
  fs.writeFileSync(bundlePath, zlib.gzipSync(source, { level: 9, mtime: 0 }));
}

updateBundle("tamweenat/assets/app-9e47eff7f33a.js.gz");
updateBundle("tamweenat-admin/assets/app-9e47eff7f33a.js.gz");

if (publicCatalog.products.length !== 162 || apiCatalog.length !== 162) {
  throw new Error("Catalogue product count changed unexpectedly");
}

console.log("Catalogue order updated: essentials first, packaging and hygiene last.");
