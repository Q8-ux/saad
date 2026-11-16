"use client";

import {a as reactFactory, b as jsxFactory} from "./chunk-PPA6V4PI.mjs";
import {c as interop} from "./chunk-2V77MTNA.mjs";

const React = interop(reactFactory(), 1);
const {jsx, jsxs} = interop(jsxFactory(), 1);

const dockItems = [
  {id: "menu", label: "القائمة", icon: "menu"},
  {id: "project", label: "المشروع", icon: "project"},
  {id: "cards", label: "البطاقات", icon: "cards"},
  {id: "comments", label: "التعليقات", icon: "comments"},
  {id: "tools", label: "الأدوات", icon: "tools"},
  {id: "analysis", label: "التحليل", icon: "analysis"},
  {id: "help", label: "المساعدة", icon: "help"},
  {id: "account", label: "الحساب", icon: "account"},
];

const dockTitles = Object.fromEntries(dockItems.map(item => [item.id, item.label]));

const iconPaths = {
  menu: "M4 6h16M4 12h16M4 18h16",
  project: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  cards: "M7 5h12v14H7zM4 8v12h12",
  comments: "M4 5h16v12H9l-5 4zM8 9h8M8 13h5",
  tools: "M14.5 6.5l3-3 3 3-3 3M16.5 8.5l-9 9M4 20l3.5-1 11-11-2.5-2.5-11 11z",
  analysis: "M5 20V10M12 20V4M19 20v-7",
  help: "M9.5 9a3 3 0 1 1 4.7 2.5c-1.4 1-2.2 1.6-2.2 3M12 18h.01M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  close: "M6 6l12 12M18 6L6 18",
  scene: "M5 5h14v14H5zM5 9h14M9 5v4M15 5v4",
  action: "M6 18L18 6M10 6h8v8",
  character: "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 20a6 6 0 0 1 12 0",
  dialogue: "M4 5h16v12H9l-5 4z",
  transition: "M5 8h11M13 5l3 3-3 3M19 16H8M11 13l-3 3 3 3",
  text: "M5 5h14M12 5v14M8 19h8",
  note: "M5 3h11l3 3v15H5zM16 3v4h4M8 11h8M8 15h8",
  outline: "M7 5h13M7 12h13M7 19h13M3 5h.01M3 12h.01M3 19h.01",
  act: "M5 4h14v16H5zM9 4v16M15 4v16",
  song: "M9 18V6l10-2v12M9 9l10-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  sound: "M11 5L6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12",
  sequence: "M4 7h16M4 12h16M4 17h16M8 4v16M16 4v16",
  dual: "M4 5h7v14H4zM13 5h7v14h-7z",
};

function Icon({name, size = 21}) {
  return jsx("svg", {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    children: jsx("path", {d: iconPaths[name] || iconPaths.menu}),
  });
}

function findAction(groups, id) {
  for (const group of groups) {
    const action = group.actions.find(item => item.id === id);
    if (action) return action;
  }
  return null;
}

function ActionButton({action, onSelect}) {
  if (!action) return null;
  return jsxs("button", {
    type: "button",
    className: "writer-panel-action",
    disabled: action.disabled,
    "aria-current": action.active ? "page" : undefined,
    onClick: () => onSelect(action),
    children: [
      jsx("span", {children: action.label}),
      action.active ? jsx("i", {children: "مفعّل"}) : null,
    ],
  });
}

function WriterWorkspace({title, status, groups, onExit}) {
  const rootRef = React.useRef(null);
  const [openMenu, setOpenMenu] = React.useState("");
  const [activeDock, setActiveDock] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(min-width: 901px)").matches ? "analysis" : ""
  );
  const [isBook, setIsBook] = React.useState(false);

  React.useEffect(() => {
    const studio = rootRef.current?.closest(".studio");
    if (!studio) return;
    studio.dataset.soloPanel = activeDock ? "open" : "closed";
    setIsBook(studio.classList.contains("book-studio"));
    return () => {
      delete studio.dataset.soloPanel;
    };
  }, [activeDock]);

  React.useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== "Escape") return;
      if (openMenu) setOpenMenu("");
      else if (activeDock) setActiveDock("");
    };
    const onPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpenMenu("");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMenu, activeDock]);

  const selectAction = action => {
    if (!action || action.disabled) return;
    setOpenMenu("");
    if (window.matchMedia?.("(max-width: 900px)").matches) setActiveDock("");
    action.onSelect?.();
  };

  const focusMenu = (id, last = false) => requestAnimationFrame(() => {
    const menu = document.getElementById("writer-menu-" + id);
    const items = menu?.querySelectorAll('[role="menuitem"]:not(:disabled)');
    (last ? items?.item((items?.length || 1) - 1) : items?.item(0))?.focus();
  });

  const onMenuKeyDown = (event, id) => {
    const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpenMenu("");
      document.getElementById("writer-menu-button-" + id)?.focus();
    }
  };

  const activateParagraph = type => {
    if (type === "scene") {
      const heading = document.querySelector('.writer-solo-mode .scene-title input, .writer-solo-mode input[aria-label*="عنوان المشهد"], .writer-solo-mode input[placeholder*="عنوان المشهد"]');
      heading?.focus();
      heading?.scrollIntoView({block: "center", behavior: "smooth"});
      return;
    }
    const select = document.querySelector('.writer-solo-mode .editor-toolbar select[aria-label="نوع الفقرة المحددة"]');
    if (select && [...select.options].some(option => option.value === type)) {
      select.value = type;
      select.dispatchEvent(new Event("change", {bubbles: true}));
      select.focus();
      return;
    }
    const labelByType = {dialogue: "حوار", action: "حركة", transition: "قاطع", heading: "عنوان", song: "أغنية", sound: "مؤثر"};
    const label = labelByType[type];
    const fallback = [...document.querySelectorAll(".writer-solo-mode .add-block-row button")]
      .find(button => button.textContent?.includes(label));
    fallback?.click();
  };

  const runAction = id => {
    const action = findAction(groups, id);
    if (action) selectAction(action);
  };

  const openHelp = () => {
    const help = document.querySelector('.writer-solo-mode button[aria-label="مساعدة واختصارات"]');
    if (help) {
      setActiveDock("");
      help.click();
    }
  };

  const screenplayTools = [
    {id: "scene", label: "مشهد", icon: "scene", onClick: () => activateParagraph("scene")},
    {id: "action", label: "حركة", icon: "action", onClick: () => activateParagraph("action")},
    {id: "character", label: "شخصية", icon: "character", onClick: () => activateParagraph("dialogue")},
    {id: "dialogue", label: "حوار", icon: "dialogue", onClick: () => activateParagraph("dialogue")},
    {id: "transition", label: "انتقال", icon: "transition", onClick: () => activateParagraph("transition")},
    {id: "heading", label: "عنوان", icon: "text", onClick: () => activateParagraph("heading")},
    {id: "notes", label: "ملاحظة", icon: "note", onClick: () => runAction("notes")},
    {id: "structure", label: "مخطط", icon: "outline", onClick: () => runAction("structure")},
    {id: "act", label: "فصل", icon: "act", onClick: () => runAction("structure")},
    {id: "song", label: "أغنية", icon: "song", onClick: () => activateParagraph("song")},
    {id: "sound", label: "صوت", icon: "sound", onClick: () => activateParagraph("sound")},
    {id: "board", label: "تسلسل", icon: "sequence", onClick: () => runAction("board")},
    {id: "french", label: "ثنائي", icon: "dual", onClick: () => runAction("french")},
  ];

  const bookTools = [
    {id: "paragraph", label: "فقرة", icon: "text", onClick: () => runAction("write")},
    {id: "heading", label: "عنوان", icon: "outline", onClick: () => runAction("write")},
    {id: "notes", label: "ملاحظة", icon: "note", onClick: () => runAction("notes")},
    {id: "index", label: "الفهرس", icon: "sequence", onClick: () => runAction("index")},
    {id: "search", label: "بحث", icon: "analysis", onClick: () => runAction("search")},
    {id: "versions", label: "النسخ", icon: "cards", onClick: () => runAction("versions")},
    {id: "pdf", label: "تصدير", icon: "project", onClick: () => runAction("pdf")},
  ];

  const panelGroups = (() => {
    if (activeDock === "menu") return groups;
    if (activeDock === "project") return groups.filter(group => group.id === "file");
    if (activeDock === "tools") return groups.filter(group => group.id === "tools");
    if (activeDock === "analysis") {
      return groups.filter(group => group.id === "production").concat([
        {id: "analysis-tools", label: "تقارير المستند", actions: [findAction(groups, "center")].filter(Boolean)},
      ]);
    }
    if (activeDock === "cards") {
      const actions = ["board", "structure", "french", "versions"].map(id => findAction(groups, id)).filter(Boolean);
      return [{id: "cards-tools", label: "تنظيم القصة", actions}];
    }
    if (activeDock === "comments") {
      const actions = [findAction(groups, "notes")].filter(Boolean);
      return [{id: "comments-tools", label: "ملاحظات المشروع", actions}];
    }
    return [];
  })();

  return jsxs("section", {
    ref: rootRef,
    className: "writer-workspace-bar",
    dir: "rtl",
    "aria-label": "مساحة WriterSolo الداخلية باللغة العربية",
    children: [
      jsxs("header", {
        className: "writer-workspace-menubar",
        children: [
          jsxs("div", {
            className: "writer-workspace-brand",
            children: [jsx("strong", {children: "السولو العربي"}), jsx("span", {children: "استيديو الكتابة"})],
          }),
          jsx("button", {
            type: "button",
            className: "writer-mobile-menu",
            "aria-expanded": activeDock === "menu",
            onClick: () => setActiveDock(activeDock === "menu" ? "" : "menu"),
            children: jsxs(React.Fragment, {children: [jsx(Icon, {name: "menu"}), "القائمة"]}),
          }),
          jsx("nav", {
            className: "writer-workspace-menus",
            "aria-label": "قوائم السولو العربي",
            children: groups.map(group => jsxs("div", {
              className: "writer-workspace-menu",
              children: [
                jsx("button", {
                  id: "writer-menu-button-" + group.id,
                  type: "button",
                  "aria-haspopup": "menu",
                  "aria-controls": "writer-menu-" + group.id,
                  "aria-expanded": openMenu === group.id,
                  onKeyDown: event => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault();
                      setOpenMenu(group.id);
                      focusMenu(group.id, event.key === "ArrowUp");
                    }
                  },
                  onClick: () => setOpenMenu(openMenu === group.id ? "" : group.id),
                  children: group.label,
                }),
                openMenu === group.id ? jsx("div", {
                  id: "writer-menu-" + group.id,
                  role: "menu",
                  "aria-labelledby": "writer-menu-button-" + group.id,
                  onKeyDown: event => onMenuKeyDown(event, group.id),
                  children: group.actions.map(action => jsx("button", {
                    type: "button",
                    role: "menuitem",
                    disabled: action.disabled,
                    "aria-current": action.active ? "page" : undefined,
                    onClick: () => selectAction(action),
                    children: action.label,
                  }, action.id)),
                }) : null,
              ],
            }, group.id)),
          }),
          jsxs("div", {
            className: "writer-workspace-document",
            children: [jsx("strong", {dir: "auto", children: title}), jsx("span", {role: "status", children: status})],
          }),
          jsx("button", {
            type: "button",
            className: "writer-workspace-exit",
            onClick: onExit,
            "aria-label": "العودة إلى الاستوديو",
            title: "العودة إلى الاستوديو",
            children: jsxs(React.Fragment, {children: [jsx(Icon, {name: "close"}), jsx("span", {children: "الاستوديو"})]}),
          }),
        ],
      }),
      jsx("div", {
        className: "writer-format-toolbar",
        role: "toolbar",
        "aria-label": isBook ? "أدوات تنسيق الكتاب" : "أدوات تنسيق السيناريو",
        children: (isBook ? bookTools : screenplayTools).map(tool => jsxs("button", {
          type: "button",
          title: tool.label,
          "aria-label": tool.label,
          onClick: tool.onClick,
          children: [jsx(Icon, {name: tool.icon, size: 19}), jsx("span", {children: tool.label})],
        }, tool.id)),
      }),
      jsx("nav", {
        className: "writer-solo-dock",
        "aria-label": "لوحات السولو العربي",
        children: dockItems.map(item => jsxs("button", {
          type: "button",
          "aria-label": item.label,
          "aria-expanded": activeDock === item.id,
          "aria-current": activeDock === item.id ? "page" : undefined,
          onClick: () => setActiveDock(activeDock === item.id ? "" : item.id),
          children: [jsx(Icon, {name: item.icon}), jsx("span", {children: item.label})],
        }, item.id)),
      }),
      activeDock ? jsxs("aside", {
        className: "writer-solo-panel",
        "aria-label": "لوحة " + dockTitles[activeDock],
        children: [
          jsxs("header", {
            children: [
              jsxs("div", {children: [jsx("small", {children: "السولو العربي"}), jsx("h2", {children: dockTitles[activeDock]})]}),
              jsx("button", {
                type: "button",
                "aria-label": "إغلاق اللوحة",
                onClick: () => setActiveDock(""),
                children: jsx(Icon, {name: "close"}),
              }),
            ],
          }),
          jsx("div", {
            className: "writer-solo-panel-body",
            children: activeDock === "help" ? jsxs("section", {
              className: "writer-panel-help",
              children: [
                jsx("h3", {children: "الكتابة داخل مشروعك"}),
                jsx("p", {children: "استخدم شريط التنسيق لتبديل نوع الفقرة، وافتح القوائم للحفظ والاستيراد والتصدير وتنظيم المشاهد."}),
                jsx("button", {type: "button", className: "writer-panel-primary", onClick: openHelp, children: "الاختصارات ودليل الاستخدام"}),
              ],
            }) : activeDock === "account" ? jsxs("section", {
              className: "writer-panel-account",
              children: [
                jsx("small", {children: "المشروع الحالي"}),
                jsx("h3", {dir: "auto", children: title}),
                jsx("p", {role: "status", children: status}),
                jsx("button", {type: "button", className: "writer-panel-primary", onClick: onExit, children: "العودة إلى الاستوديو"}),
              ],
            }) : panelGroups.length ? panelGroups.map(group => jsxs("section", {
              className: "writer-panel-group",
              children: [
                jsx("h3", {children: group.label}),
                jsx("div", {children: group.actions.map(action => jsx(ActionButton, {action, onSelect: selectAction}, action.id))}),
              ],
            }, group.id)) : jsx("p", {className: "writer-panel-empty", children: "تُفتح الأدوات المرتبطة بهذه اللوحة من داخل مشروعك."}),
          }),
        ],
      }) : null,
    ],
  });
}

export {WriterWorkspace as default};
