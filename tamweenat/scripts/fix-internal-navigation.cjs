const fs = require("node:fs");
const zlib = require("node:zlib");

const bundles = [
  "tamweenat/assets/app-892215184719.js.gz",
  "tamweenat/assets/app-9e47eff7f33a.js.gz",
  "tamweenat-admin/assets/app-892215184719.js.gz",
  "tamweenat-admin/assets/app-9e47eff7f33a.js.gz",
];

const bottomNavigationSource =
  "Oy.filter(e=>e.roles.includes(n)).slice(0,n===`restaurant`?3:4).map(e=>";
const bottomNavigationTarget =
  "Oy.filter(e=>(n===`restaurant`?[`overview`,`catalog`,`orders`]:n===`operations`?[`overview`,`orders`,`inventory`,`suppliers`]:[`overview`,`orders`,`inventory`,`finance`]).includes(e.id)).map(e=>";

const bottomButtonSource =
  "type:`button`,className:r===e.id?`active`:``,onClick:()=>Ke(e.id),children:";
const bottomButtonTarget =
  "type:`button`,className:r===e.id?`active`:``,\"data-nav-id\":e.id,\"aria-label\":R[e.id],\"aria-current\":r===e.id?`page`:void 0,onClick:()=>{Ke(e.id),window.scrollTo({top:0,behavior:`smooth`})},children:";

const cartButtonSource =
  "type:`button`,className:`mobile-cart-nav`,onClick:()=>T(!0),children:";
const cartButtonTarget =
  "type:`button`,className:`mobile-cart-nav`,\"data-nav-id\":`cart`,\"aria-label\":R.cart,onClick:()=>T(!0),children:";

const supportLinkSource =
  "(`a`,{className:`support-card`,href:`https://wa.me/96550168888`,target:`_blank`,rel:`noreferrer`,children:";
const supportButtonTarget =
  "(`button`,{type:`button`,className:`support-card`,\"data-nav-id\":`orders`,onClick:()=>{Ke(`orders`),window.scrollTo({top:0,behavior:`smooth`})},children:";

function replaceExactlyOnce(source, before, after, label, file) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${file}: expected one ${label} target, found ${count}`);
  }
  return source.replace(before, after);
}

function replaceOnceOrConfirm(source, before, after, label, file) {
  if (source.includes(after)) {
    if (source.includes(before)) {
      throw new Error(`${file}: contains both old and new ${label} targets`);
    }
    return source;
  }
  return replaceExactlyOnce(source, before, after, label, file);
}

for (const file of bundles) {
  let source = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");

  source = replaceOnceOrConfirm(
    source,
    bottomNavigationSource,
    bottomNavigationTarget,
    "bottom navigation",
    file,
  );
  source = replaceOnceOrConfirm(
    source,
    bottomButtonSource,
    bottomButtonTarget,
    "bottom navigation button",
    file,
  );
  source = replaceOnceOrConfirm(
    source,
    cartButtonSource,
    cartButtonTarget,
    "cart navigation button",
    file,
  );
  source = replaceOnceOrConfirm(
    source,
    supportLinkSource,
    supportButtonTarget,
    "external support link",
    file,
  );
  source = replaceOnceOrConfirm(
    source,
    "الطلب عبر واتساب",
    "مركز الطلبات",
    "Arabic support label",
    file,
  );
  source = replaceOnceOrConfirm(
    source,
    "Order by WhatsApp",
    "Orders center",
    "English support label",
    file,
  );
  source = replaceOnceOrConfirm(
    source,
    "واٹس ایپ پر آرڈر",
    "آرڈرز مرکز",
    "Urdu support label",
    file,
  );

  const phoneCaption = /\(0,([A-Za-z_$][\w$]*)\.jsx\)\(`small`,\{children:`50168888`\}\)/g;
  const phoneMatches = [...source.matchAll(phoneCaption)];
  if (phoneMatches.length > 1) {
    throw new Error(`${file}: expected at most one support phone caption, found ${phoneMatches.length}`);
  }
  if (phoneMatches.length === 0 && !source.includes("children:$(e,`داخل النظام فقط`,`Inside the system`,`صرف نظام کے اندر`)")) {
    throw new Error(`${file}: internal support caption is missing`);
  }
  if (phoneMatches.length === 1) {
    source = source.replace(
      phoneCaption,
      "(0,$1.jsx)(`small`,{children:$(e,`داخل النظام فقط`,`Inside the system`,`صرف نظام کے اندر`)})",
    );
  }

  if (/wa\.me|whatsapp|واتساب/i.test(source)) {
    throw new Error(`${file}: an external WhatsApp reference remains`);
  }

  fs.writeFileSync(file, zlib.gzipSync(source, { level: 9 }));
}

console.log("Internal ordering and bottom navigation fixed in all application bundles.");
