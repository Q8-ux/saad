"use strict";

const storageKey = "saad.mypack-ar.projects.v1";
const runtimeVersion = "1.0.10";
const platforms = {
  windows: { name: "Windows", defaultArch: "amd64", format: "portable" },
  darwin: { name: "macOS", defaultArch: "arm64", format: "app" },
  linux: { name: "Linux", defaultArch: "amd64", format: "portable" },
};
const architectures = { amd64: "x64", arm64: "ARM64" };
const sizes = { wide: { width: 1200, height: 780 }, short: { width: 900, height: 600 } };
const colors = {
  jade: ["#197f66", "#0b4c3d"],
  blue: ["#4e65d9", "#273f9f"],
  clay: ["#b95a35", "#75391f"],
};

const byId = (id) => document.getElementById(id);
const form = byId("project-form");
const siteUrl = byId("site-url");
const localPath = byId("local-path");
const localKind = byId("local-kind");
const appName = byId("app-name");
const architecture = byId("architecture");
const windowSize = byId("window-size");
const iconFile = byId("icon-file");
const formStatus = byId("form-status");
const projectsStatus = byId("projects-status");
const exportDialog = byId("export-dialog");
const deleteDialog = byId("delete-dialog");

let projectId = newId();
let customIcon = "";
let iconRequest = 0;
let pendingDelete = null;

function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function radio(name) {
  return form.elements.namedItem(name);
}

function normalizedUrl(raw) {
  const text = raw.trim();
  if (!text || /[\s\\]/u.test(text) || text.startsWith("//")) return "";
  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(text);
  if (hasProtocol && !/^https?:\/\//i.test(text)) return "";
  try {
    const url = new URL(hasProtocol ? text : `https://${text}`);
    return url.hostname && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

function leafName(path) {
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).at(-1) || "";
}

function sourceLabel(source) {
  if (source.type === "url") {
    const url = normalizedUrl(source.value);
    return url ? new URL(url).host : "example.com";
  }
  return leafName(source.value) || "مشروع HTML";
}

function initialFor(name) {
  return [...name].find((letter) => /[\p{L}\p{N}]/u.test(letter))?.toUpperCase() || "س";
}

function sourceFromForm() {
  return radio("source-kind").value === "url"
    ? { type: "url", value: siteUrl.value.trim() }
    : { type: localKind.value, value: localPath.value.trim() };
}

function showFieldError(input, message) {
  const errorId = { "site-url": "url-error", "local-path": "local-error", "app-name": "name-error", "icon-file": "icon-error" }[input.id];
  const error = byId(errorId);
  error.textContent = message;
  error.hidden = !message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function status(element, message = "", error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
}

function syncSourceFields() {
  const local = radio("source-kind").value === "local";
  byId("url-field").hidden = local;
  byId("local-field").hidden = !local;
  siteUrl.disabled = local;
  localPath.disabled = !local;
  localKind.disabled = !local;
  const windows = radio("platform").value === "windows";
  const folder = windows ? "C:\\Projects\\website" : "/home/saad/website";
  const separator = windows ? "\\" : "/";
  localPath.placeholder = localKind.value === "file" ? `${folder}${separator}index.html` : folder;
}

function renderPreview() {
  const name = appName.value.trim() || "اسم تطبيقك";
  const os = radio("platform").value;
  const tone = radio("tone").value;
  const size = sizes[windowSize.value];
  const mock = byId("mock-window");
  const image = byId("preview-image");
  mock.dataset.platform = os;
  mock.dataset.size = windowSize.value;
  byId("mock-title").textContent = name;
  byId("preview-name").textContent = name;
  byId("preview-source").textContent = sourceLabel(sourceFromForm());
  byId("preview-platform").textContent = `${platforms[os].name} · ${architectures[architecture.value]}`;
  byId("platform-hint").hidden = os !== "darwin";
  byId("preview-size").textContent = `${size.width} × ${size.height}`;
  byId("preview-icon").className = `app-icon tone ${tone}`;
  byId("preview-initial").textContent = initialFor(appName.value.trim());
  byId("preview-initial").hidden = Boolean(customIcon);
  byId("remove-icon").hidden = !customIcon;
  image.hidden = !customIcon;
  if (customIcon && image.getAttribute("src") !== customIcon) image.src = customIcon;
  if (!customIcon) image.removeAttribute("src");
}

function projectFromForm() {
  const name = appName.value.trim();
  const source = sourceFromForm();
  const sourceInput = source.type === "url" ? siteUrl : localPath;
  let nameError = "";
  let sourceError = "";
  if (!name) nameError = "اكتب اسمًا للتطبيق.";
  else if (/[\\/:*?"<>|\u0000-\u001f]/u.test(name) || name === "." || name === "..") nameError = "استخدم اسمًا يصلح لملف على الكمبيوتر.";
  else if (new TextEncoder().encode(name).length > 64) nameError = "اختصر الاسم حتى يقبله MyPack. الحدّ ٣٢ حرفًا عربيًا تقريبًا.";

  if (source.type === "url") {
    source.value = normalizedUrl(source.value);
    if (!source.value) sourceError = "أدخل رابط HTTP أو HTTPS صالحًا، مثل example.com.";
  } else if (!/^(?:\/[^/]|[a-z]:[\\/][^\\/]|\\\\[^\\]+\\[^\\]+)/i.test(source.value) || /[\u0000-\u001f]/u.test(source.value)) {
    sourceError = "أدخل مسارًا كاملًا إلى الملف أو المجلد على الكمبيوتر.";
  } else if (source.type === "file" && !/\.html?$/i.test(source.value)) {
    sourceError = "أدخل مسار ملف ينتهي بـ .html أو .htm.";
  }
  showFieldError(sourceInput, sourceError);
  showFieldError(appName, nameError);
  if (sourceError || nameError) {
    (sourceError ? sourceInput : appName).focus();
    return null;
  }

  return {
    id: projectId,
    name,
    source,
    os: radio("platform").value,
    arch: architecture.value,
    size: windowSize.value,
    tone: radio("tone").value,
    icon: customIcon,
    updatedAt: new Date().toISOString(),
  };
}

function makeDefaultIcon(project) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, colors[project.tone][0]);
  gradient.addColorStop(1, colors[project.tone][1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#fff";
  ctx.font = "800 126px Cairo, Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initialFor(project.name), 128, 130, 190);
  return canvas.toDataURL("image/png");
}

function packProject(project) {
  const identifier = `app.saad.a${project.id}`;
  const source = { ...project.source };
  if (source.type === "dir") source.entry = "index.html";
  return {
    format: "mypack.library",
    version: 1,
    exportedAt: new Date().toISOString(),
    apps: [{
      config: {
        schemaVersion: 1,
        app: {
          name: project.name,
          title: project.name,
          identifier,
          profileId: identifier,
          version: "1.0.0",
          source,
          icon: { source: "default" },
        },
        runtime: { version: runtimeVersion },
        window: sizes[project.size],
        webview: {},
        build: { targets: [{ os: project.os, arch: project.arch, format: platforms[project.os].format }] },
      },
      icon: (project.icon || makeDefaultIcon(project)).split(",", 2)[1],
      updatedAt: project.updatedAt,
    }],
  };
}

function downloadProject(project) {
  const name = `${project.name}-${project.id.slice(0, 5)}.mypack`;
  const blob = new Blob([JSON.stringify(packProject(project), null, 2), "\n"], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  byId("export-filename").textContent = name;
  exportDialog.showModal();
}

function isSavedProject(project) {
  return project && /^[a-f0-9]{20}$/.test(project.id) && typeof project.name === "string"
    && ["url", "dir", "file"].includes(project.source?.type) && typeof project.source.value === "string"
    && Object.hasOwn(platforms, project.os) && Object.hasOwn(architectures, project.arch)
    && Object.hasOwn(sizes, project.size) && Object.hasOwn(colors, project.tone)
    && typeof project.icon === "string" && (!project.icon || project.icon.startsWith("data:image/png;base64,"))
    && typeof project.updatedAt === "string";
}

function readProjects() {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  return Array.isArray(stored) ? stored.filter(isSavedProject) : [];
}

function saveProject(project) {
  try {
    const others = readProjects().filter((entry) => entry.id !== project.id);
    localStorage.setItem(storageKey, JSON.stringify([project, ...others]));
    status(formStatus, `حُفظ «${project.name}» في مشاريعي.`);
    status(projectsStatus);
    byId("reset-project").hidden = false;
    renderProjects();
  } catch {
    status(formStatus, "تعذّر الحفظ في المتصفح. نزّل ملف المشروع للاحتفاظ به.", true);
  }
}

function scrollToEditor() {
  byId("builder").scrollIntoView({ block: "start" });
  appName.focus({ preventScroll: true });
}

function resetIcon() {
  iconRequest += 1;
  customIcon = "";
  iconFile.value = "";
  byId("icon-progress").hidden = true;
  showFieldError(iconFile, "");
}

function editProject(project) {
  form.reset();
  resetIcon();
  projectId = project.id;
  appName.value = project.name;
  if (project.source.type === "url") siteUrl.value = project.source.value;
  else {
    radio("source-kind").value = "local";
    localKind.value = project.source.type;
    localPath.value = project.source.value;
  }
  radio("platform").value = project.os;
  architecture.value = project.arch;
  windowSize.value = project.size;
  radio("tone").value = project.tone;
  customIcon = project.icon;
  for (const input of [siteUrl, localPath, appName]) showFieldError(input, "");
  status(formStatus);
  byId("reset-project").hidden = false;
  syncSourceFields();
  renderPreview();
  scrollToEditor();
}

function askToDelete(project) {
  pendingDelete = project;
  byId("delete-description").textContent = `سيُحذف «${project.name}» من مشاريع هذا المتصفح.`;
  deleteDialog.returnValue = "";
  deleteDialog.showModal();
}

function makeButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function projectCard(project) {
  const item = document.createElement("li");
  item.className = "project-item";
  const icon = document.createElement("span");
  icon.className = `app-icon tone ${project.tone}`;
  icon.setAttribute("aria-hidden", "true");
  if (project.icon) {
    const image = document.createElement("img");
    image.src = project.icon;
    image.alt = "";
    icon.append(image);
  } else icon.textContent = initialFor(project.name);
  const identity = document.createElement("div");
  identity.className = "project-identity";
  const name = document.createElement("h3");
  name.dir = "auto";
  name.textContent = project.name;
  const details = document.createElement("p");
  const label = document.createElement("bdi");
  label.textContent = `${platforms[project.os].name} · ${sourceLabel(project.source)}`;
  details.append(label);
  identity.append(name, details);
  const actions = document.createElement("div");
  actions.className = "project-controls";
  const action = (labelText, className, handler) => {
    const button = makeButton(labelText, className, handler);
    button.setAttribute("aria-label", `${labelText} ${project.name}`);
    return button;
  };
  actions.append(
    action("تعديل", "button secondary", () => editProject(project)),
    action("تنزيل", "button secondary", () => downloadProject(project)),
    action("حذف", "text-button", () => askToDelete(project)),
  );
  item.append(icon, identity, actions);
  return item;
}

function renderProjects() {
  const list = byId("project-list");
  const empty = byId("empty-projects");
  try {
    const projects = readProjects();
    list.replaceChildren(...projects.map(projectCard));
    empty.hidden = projects.length > 0;
    byId("project-count").textContent = projects.length ? new Intl.NumberFormat("ar-KW", { numberingSystem: "arab" }).format(projects.length) : "";
  } catch {
    empty.textContent = "لا يمكن قراءة المشاريع المحفوظة في هذا المتصفح.";
    empty.hidden = false;
  }
}

async function resizedPng(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const size = 256;
    const edge = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    context.drawImage(image, (image.naturalWidth - edge) / 2, (image.naturalHeight - edge) / 2, edge, edge, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

iconFile.addEventListener("change", async () => {
  const file = iconFile.files[0];
  if (!file) return;
  const request = ++iconRequest;
  showFieldError(iconFile, "");
  byId("icon-progress").hidden = true;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 6 * 1024 * 1024) {
    showFieldError(iconFile, "اختر صورة PNG أو JPEG أو WebP بحجم لا يتجاوز ٦ ميغابايت.");
    iconFile.value = "";
    return;
  }
  byId("icon-progress").hidden = false;
  try {
    const png = await resizedPng(file);
    if (request === iconRequest) {
      customIcon = png;
      renderPreview();
    }
  } catch {
    if (request === iconRequest) showFieldError(iconFile, "تعذّر فتح الصورة. اختر صورة أخرى.");
  } finally {
    if (request === iconRequest) {
      byId("icon-progress").hidden = true;
      iconFile.value = "";
      status(formStatus);
    }
  }
});

byId("remove-icon").addEventListener("click", () => {
  resetIcon();
  renderPreview();
  iconFile.focus();
});

form.addEventListener("input", (event) => {
  if ([siteUrl, localPath, appName].includes(event.target)) showFieldError(event.target, "");
  status(formStatus);
  renderPreview();
});

form.addEventListener("change", (event) => {
  if (event.target.name === "platform") architecture.value = platforms[event.target.value].defaultArch;
  if (event.target.name === "tone") resetIcon();
  if (event.target === localKind) showFieldError(localPath, "");
  syncSourceFields();
  renderPreview();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  status(formStatus);
  if (!byId("icon-progress").hidden) {
    status(formStatus, "انتظر لحظة حتى تجهز الصورة.", true);
    return;
  }
  const project = projectFromForm();
  if (!project) return;
  if (event.submitter?.value === "save") saveProject(project);
  else {
    try {
      downloadProject(project);
      byId("reset-project").hidden = false;
    } catch {
      status(formStatus, "تعذّر تجهيز الملف. حاول التنزيل مرة أخرى.", true);
    }
  }
});

byId("reset-project").addEventListener("click", () => {
  form.reset();
  projectId = newId();
  resetIcon();
  byId("reset-project").hidden = true;
  for (const input of [siteUrl, localPath, appName]) showFieldError(input, "");
  status(formStatus);
  syncSourceFields();
  renderPreview();
  siteUrl.focus();
});

deleteDialog.addEventListener("close", () => {
  const project = pendingDelete;
  pendingDelete = null;
  if (deleteDialog.returnValue !== "delete" || !project) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(readProjects().filter((entry) => entry.id !== project.id)));
    renderProjects();
    status(projectsStatus, `حُذف «${project.name}» من مشاريعي.`);
  } catch {
    status(projectsStatus, "تعذّر حذف المشروع من هذا المتصفح.", true);
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === storageKey || event.key === null) renderProjects();
});

syncSourceFields();
renderPreview();
renderProjects();
