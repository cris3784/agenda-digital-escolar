/* =========================================================
   PRINCIPAL: guardado, navegación, tarjetas y arranque
   ========================================================= */
 
// Guardado agrupado: si se llama varias veces seguidas (ej. al corregir varias entregas) se escribe
// una sola vez, así no se congela la pantalla serializando todo cada vez. Se guarda sí o sí al
// cerrar o cambiar de pestaña (flushSave).
// Las actividades ya no se guardan en el navegador: viven en la base de datos.
// Estas dos funciones se dejan vacías para que cualquier llamada vieja a save() no falle.
function flushSave(){}
function save(){}

/* ---------- Botones de icono (verdes, como los iconos del menú) ----------
   Se usan para Editar / Borrar / Agregar en Materias, Horario, Calendario y Administración.
   ibtn("edit", "Editar", "editSubject(3)")  →  devuelve el HTML del botón. */

const IBTN_ICONS = {
  edit:  '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>',
  plus:  '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  lock:  '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};

function ensureIconBtnStyle(){
  if(document.getElementById("iconBtnStyle")) return;
  const st = document.createElement("style");
  st.id = "iconBtnStyle";
  st.textContent = `
    .ibtn{
      flex:none; width:30px; height:30px; padding:0; margin:0; border-radius:9px;
      display:inline-grid; place-items:center; cursor:pointer; color:#fff; line-height:1;
      background:linear-gradient(150deg,#2fb86d,#17663f);
      border:1px solid rgba(111,227,161,.55);
      box-shadow:0 3px 10px rgba(37,160,93,.3), inset 0 1px 0 rgba(255,255,255,.18);
      transition:filter .15s, transform .15s;
    }
    .ibtn svg{width:15px; height:15px; display:block; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round}
    .ibtn:hover{filter:brightness(1.18); transform:translateY(-1px)}
    .ibtn.danger:hover{background:linear-gradient(150deg,#e0546f,#8f2238); border-color:rgba(255,160,180,.65); filter:none}
    .ibtn.sm{width:22px; height:22px; border-radius:7px}
    .ibtn.sm svg{width:12px; height:12px}
    .ibtn[disabled]{opacity:.45; cursor:default; transform:none; filter:none}
    .ibtn-row{display:flex; gap:6px; align-items:center}
  `;
  document.head.appendChild(st);
}

function ibtn(kind, title, onclick, size){
  ensureIconBtnStyle();
  const t = String(title || "").replace(/"/g, "&quot;");
  return '<button type="button" class="ibtn' + (kind === "trash" ? " danger" : "") + (size ? " " + size : "") + '" title="' + t + '" aria-label="' + t + '"' +
    (onclick ? ' onclick="' + onclick + '"' : " disabled") + '>' + (IBTN_ICONS[kind] || "") + '</button>';
}

window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => { if(document.hidden) flushSave(); });
 
 
/* ---------- Cambio de páginas ---------- */
 
/* ---------- Iconos del menú y título de cada apartado ----------
   Los emojis se cambian por iconos (SVG) y, al abrir un apartado, arriba a la
   izquierda aparece su icono y su nombre. No hace falta tocar el HTML. */

const ICON_OPEN  = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICON_SOLID = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">';

const NAV_ICONS = {
  inicio: ICON_SOLID + '<path d="M12 2.9 2.7 11.2a1 1 0 0 0 .7 1.7H5v7.1c0 .6.4 1 1 1h3.6v-5.3c0-.5.4-.9.9-.9h3c.5 0 .9.4.9.9V21H18c.6 0 1-.4 1-1v-7.1h1.6a1 1 0 0 0 .7-1.7L12 2.9z"/></svg>',
  actividades: ICON_OPEN + '<rect x="4.5" y="4.5" width="15" height="17" rx="2.4"/><path d="M9 4.5V3.6c0-.3.3-.6.6-.6h4.8c.3 0 .6.3.6.6v.9"/><path d="M8.5 11.2h2M8.5 15.8h2M12.5 11.2h3M12.5 15.8h3"/></svg>',
  materias: ICON_SOLID + '<path d="M2.8 5.2c3.5 0 6 .6 8.2 2v11.4c-2.2-1.4-4.7-2-8.2-2z"/><path d="M21.2 5.2c-3.5 0-6 .6-8.2 2v11.4c2.200-1.400 4.700-2 8.200-2z"/></svg>',
  horario: ICON_OPEN + '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15.2" r="2.6"/><path d="M12 14v1.3l.9.6"/></svg>',
  calendario: ICON_OPEN + '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 13.6h.01M12 13.6h.01M16 13.6h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="2.4"/></svg>',
  perfil: ICON_SOLID + '<circle cx="12" cy="7.8" r="4.2"/><path d="M3.8 20.4c0-4.200 3.700-6.600 8.200-6.600s8.200 2.400 8.200 6.600c0 .6-.4 1-1 1H4.800c-.6 0-1-.4-1-1z"/></svg>',
  admin: ICON_SOLID + '<path d="M12 2.6 4.4 5.500v5.800c0 4.800 3.200 8.500 7.600 10.100 4.400-1.600 7.600-5.300 7.600-10.100V5.500L12 2.600z"/><path d="m8.700 12.200 2.400 2.400 4.300-4.600" fill="none" stroke="#0b1530" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  logout: ICON_OPEN + '<path d="M9.500 4H6.500A1.500 1.500 0 0 0 5 5.500v13A1.500 1.500 0 0 0 6.500 20h3"/><path d="m15 8 4 4-4 4M19 12H9.500"/></svg>'
};

// Los que se ven "rellenos" van en azul; los de línea, en azul claro
const NAV_FILLED = ["inicio", "materias", "perfil", "admin"];

function ensureNavStyle(){

  if(document.getElementById("navIconStyle")) return;

  const st = document.createElement("style");
  st.id = "navIconStyle";
  st.textContent = `
    .nav button{display:flex;align-items:center;gap:14px;padding:11px 14px;font-size:14px}
    .nav button:hover{background:rgba(255,255,255,.06)}
    .nav button.active{
      background:linear-gradient(90deg,rgba(37,99,235,.62),rgba(37,99,235,.10));
      box-shadow:inset 3px 0 #22d3ee;
      color:#fff;
    }
    .nav-ico{width:22px;height:22px;flex:none;display:inline-grid;place-items:center;color:#b9cbee;font-style:normal}
    .nav-ico svg{width:22px;height:22px;display:block}
    .nav-ico.fill{color:#7db2ff}
    .nav button:hover .nav-ico,.nav button.active .nav-ico{color:#fff}
    .nav button.active .nav-ico.fill{color:#a9ccff}
    .nav-sep{height:1px;background:#26304a;margin:12px 6px}

    #pageTitle{display:flex;align-items:center;gap:12px}
    .title-ico{
      width:38px;height:38px;flex:none;display:inline-grid;place-items:center;color:#fff;border-radius:11px;
      background:linear-gradient(150deg,#2fb86d,#17663f);
      border:1px solid rgba(111,227,161,.55);
      box-shadow:0 4px 14px rgba(37,160,93,.35), inset 0 1px 0 rgba(255,255,255,.2);
    }
    .title-ico svg{width:21px;height:21px;display:block}

    @media(max-width:900px){ .nav button{justify-content:center;padding:11px 8px} }
    @media(max-width:640px){ .nav-sep{display:none} .title-ico{width:32px;height:32px;border-radius:10px} .title-ico svg{width:18px;height:18px} }
  `;
  document.head.appendChild(st);
}

// "Administración" ya no cuelga de "CUENTA": tiene su propio título "GESTIÓN" (solo lo ve el administrador)
function setupAdminNavLabel(){

  if(document.querySelector("[data-admin-label]")) return;

  const adminBtn = Array.from(document.querySelectorAll(".nav button"))
    .find(b => /showPage\(\s*['"]admin['"]/.test(b.getAttribute("onclick") || ""));
  if(!adminBtn) return;

  // Se copia el aspecto del título "CUENTA" para que quede igual
  const ref = Array.from(document.querySelectorAll(".nav *"))
    .find(el => el.children.length === 0 && /^cuenta$/i.test((el.textContent || "").trim()));
  if(!ref) return;

  const label = document.createElement(ref.tagName);
  label.className = ref.className;
  label.textContent = "GESTIÓN";
  label.dataset.adminLabel = "1";
  adminBtn.insertAdjacentElement("beforebegin", label);
}

// Lo llama applyPermissions(): el título solo se ve si el botón de Administración se ve
function syncAdminNavLabel(isAdmin){
  const label = document.querySelector("[data-admin-label]");
  if(!label) return;
  if(isAdmin) label.style.removeProperty("display");
  else label.style.setProperty("display", "none", "important");
}

// Cambia los emojis del menú por iconos y separa los grupos con una línea
function setupNavIcons(){

  ensureNavStyle();

  document.querySelectorAll(".nav button").forEach(btn => {

    const onclick = btn.getAttribute("onclick") || "";
    const m = onclick.match(/showPage\(\s*['"](\w+)['"]/);
    const key = m ? m[1] : (/logout/.test(onclick) ? "logout" : null);
    if(!key || !NAV_ICONS[key]) return;

    let label = btn.querySelector("span");
    if(!label){
      const text = btn.textContent.replace(/^[^\p{L}]+/u, "").trim();
      btn.textContent = "";
      label = document.createElement("span");
      label.textContent = text;
      btn.appendChild(label);
    }

    // quitar el emoji (texto suelto) y poner el icono
    Array.from(btn.childNodes).forEach(n => { if(n.nodeType === 3) n.remove(); });
    btn.querySelectorAll(".nav-ico").forEach(e => e.remove());

    const ico = document.createElement("i");
    ico.className = "nav-ico" + (NAV_FILLED.indexOf(key) !== -1 ? " fill" : "");
    ico.innerHTML = NAV_ICONS[key];
    btn.insertBefore(ico, btn.firstChild);
    btn.title = label.textContent.trim();         // en celular solo se ve el icono
  });

  // Líneas de separación (como en el diseño de referencia): sin títulos de grupo
  const titles = document.querySelectorAll(".nav .nav-title");
  titles.forEach((t, i) => {
    t.style.display = "none";
    if(i > 0 && !t.previousElementSibling?.classList.contains("nav-sep")){
      const sep = document.createElement("div");
      sep.className = "nav-sep";
      t.insertAdjacentElement("beforebegin", sep);
    }
  });

  setupAdminNavLabel();

  const out = document.querySelector('.nav button[onclick*="logout"]');
  if(out && !out.previousElementSibling?.classList.contains("nav-sep")){
    const sep = document.createElement("div");
    sep.className = "nav-sep";
    out.insertAdjacentElement("beforebegin", sep);
  }
}

// Título de arriba a la izquierda: icono + nombre del apartado
function setPageTitle(id){
  const el = $("pageTitle");
  if(!el) return;
  el.innerHTML = '<span class="title-ico">' + (NAV_ICONS[id] || "") + '</span><span>' + (PAGE_NAMES[id] || "") + '</span>';
}


/* =========================================================
   NOTIFICACIONES (la campanita de arriba a la derecha)
   Se avisa cuando alguien publica una actividad o un evento del calendario,
   cuando cambia el horario o cuando se publica un aviso.
   Cada cuenta solo ve los avisos de su grupo (o los que son para todos).
   ========================================================= */

const NOTIF_TYPES = {
  actividad:  {label:"Actividad",  icon:'<path d="M9 4.5V3.6c0-.3.3-.6.6-.6h4.8c.3 0 .6.3.6.6v.9"/><rect x="4.5" y="4.5" width="15" height="17" rx="2.4"/><path d="M8.5 11.2h2M8.5 15.8h2M12.5 11.2h3M12.5 15.8h3"/>'},
  calendario: {label:"Calendario", icon:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'},
  horario:    {label:"Horario",    icon:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15.2" r="2.6"/><path d="M12 14v1.3l.9.6"/>'},
  aviso:      {label:"Aviso",      icon:'<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11"/>'}
};

// Las notificaciones viven en la base de datos (api/notificaciones.php).
// El servidor ya manda solo las que le corresponden a esta cuenta y cuáles ya leyó.
let notifList = [];
let notifSig = "";

async function cargarNotificaciones(){
  try{
    const resp = await fetch("api/notificaciones.php", {credentials:"same-origin", cache:"no-store"});
    const d = await resp.json();
    if(!d || !d.ok || !Array.isArray(d.notificaciones)) return false;
    const sig = JSON.stringify(d.notificaciones);
    const changed = sig !== notifSig;
    notifSig = sig;
    notifList = d.notificaciones;
    if(changed) renderNotifications();
    return true;
  }catch(e){
    return false;
  }
}

function loadNotifs(){ return notifList.slice(); }

// Publica una notificación en el servidor. groups = lista de grupos, o null para todos.
// Quien la publica no la recibe; les llega a los demás cuando abren la página o cada minuto.
async function notify(n){
  const r = await apiPost("api/notificacion_crear.php", {
    type: n.type || "aviso",
    title: n.title || "",
    text: n.text || "",
    groups: Array.isArray(n.groups) && n.groups.length ? n.groups : null,
    page: n.page || "",
    to: n.to || ""                  // solo para esa cuenta (ej. "tu trabajo fue calificado")
  });
  if(!r.ok) console.error("[ADE] No se pudo publicar la notificación:", r.error);
  return !!r.ok;
}

function myNotifs(){ return notifList.slice(); }       // el servidor ya filtró

function unreadCount(){ return notifList.filter(n => !n.read).length; }

function markNotifRead(id){
  const n = notifList.find(x => x.id === id);
  if(!n || n.read) return;
  n.read = true;
  notifSig = JSON.stringify(notifList);
  apiPost("api/notificacion_leer.php", {ids:[id]});
}

function markAllNotifsRead(){
  notifList.forEach(n => { n.read = true; });
  notifSig = JSON.stringify(notifList);
  apiPost("api/notificacion_leer.php", {todas:true});
  renderNotifications();
}

function timeAgo(iso){
  const t = new Date(iso).getTime();
  if(!t) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if(min < 1) return "ahora";
  if(min < 60) return "hace " + min + " min";
  const h = Math.round(min / 60);
  if(h < 24) return "hace " + h + (h === 1 ? " hora" : " horas");
  const d = Math.round(h / 24);
  if(d === 1) return "ayer";
  if(d < 7) return "hace " + d + " días";
  return new Date(t).toLocaleDateString("es-CO", {day:"numeric", month:"short"});
}

function ensureNotifStyle(){

  if(document.getElementById("notifStyle")) return;

  const st = document.createElement("style");
  st.id = "notifStyle";
  st.textContent = `
    .notif-wrap{position:relative;margin-left:auto;display:flex;align-items:center;flex:none}
    .sidebar-bottom.in-topbar{margin-left:0 !important}
    .notif-btn{
      position:relative;width:40px;height:40px;border-radius:50%;
      background:transparent;color:#c7d6f5;display:grid;place-items:center;padding:0;
    }
    .notif-btn:hover,.notif-btn.open{background:rgba(255,255,255,.08);color:#fff}
    .notif-btn svg{width:22px;height:22px}
    .notif-badge{
      position:absolute;top:-4px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;
      background:#ef4444;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;
      border:2px solid #07122b;box-sizing:content-box;line-height:1;
    }
    .notif-divider{width:1px;height:30px;background:#26304a;margin:0 16px}

    .notif-panel{
      position:absolute;right:-8px;top:50px;width:370px;max-width:92vw;
      background:#0b1530;border:1px solid #26304a;border-radius:14px;
      box-shadow:0 18px 40px rgba(0,0,0,.5);display:none;z-index:40;overflow:hidden;
    }
    .notif-panel.open{display:block}
    .notif-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #26304a}
    .notif-head b{font-size:15px}
    .notif-head button{background:transparent;color:#7db2ff;font-size:12px;padding:4px 6px}
    .notif-head button:hover{text-decoration:underline}
    .notif-list{max-height:380px;overflow:auto}
    .notif-item{
      display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;
    }
    .notif-item:last-child{border-bottom:0}
    .notif-item:hover{background:rgba(255,255,255,.04)}
    .notif-item.unread{background:rgba(37,99,235,.14)}
    .notif-ico{
      width:34px;height:34px;border-radius:10px;flex:none;display:grid;place-items:center;
      background:rgba(125,178,255,.14);color:#8cbcff;
    }
    .notif-ico svg{width:19px;height:19px}
    .notif-body{min-width:0;flex:1}
    .notif-body strong{display:block;font-size:13px;line-height:1.3}
    .notif-body p{font-size:12px;color:#aeb8cc;margin-top:2px;line-height:1.4;overflow-wrap:anywhere}
    .notif-body small{display:block;font-size:11px;color:#7e8aa5;margin-top:4px}
    .notif-dot{width:8px;height:8px;border-radius:50%;background:#22d3ee;flex:none;margin-top:6px}
    .notif-empty{padding:28px 16px;text-align:center;color:#7e8aa5;font-size:13px}
    .notif-foot{padding:10px 16px;border-top:1px solid #26304a}
    .notif-foot button{width:100%;padding:8px;font-size:12px}

    @media(max-width:640px){
      .notif-divider{margin:0 8px}
      .notif-panel{position:fixed;left:8px;right:8px;top:62px;width:auto;max-width:none}
    }
  `;
  document.head.appendChild(st);
}

function setupNotifBell(){

  const top = document.querySelector(".topbar");
  if(!top || document.getElementById("notifWrap")) return;

  ensureNotifStyle();

  const wrap = document.createElement("div");
  wrap.className = "notif-wrap";
  wrap.id = "notifWrap";
  wrap.innerHTML = `
    <button type="button" class="notif-btn" id="notifBtn" title="Notificaciones" aria-label="Notificaciones">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.500 2 6.500H4S6 14 6 9z"/><path d="M10 19a2.200 2.200 0 0 0 4 0"/></svg>
      <span class="notif-badge" id="notifBadge" style="display:none">0</span>
    </button>
    <div class="notif-divider"></div>
    <div class="notif-panel" id="notifPanel"></div>`;

  const box = top.querySelector(".sidebar-bottom");
  if(box) top.insertBefore(wrap, box); else top.appendChild(wrap);

  $("notifBtn").addEventListener("click", function(e){
    e.stopPropagation();
    $("notifPanel").classList.toggle("open");
    $("notifBtn").classList.toggle("open", $("notifPanel").classList.contains("open"));
  });

  document.addEventListener("click", function(e){
    const panel = $("notifPanel");
    if(panel && panel.classList.contains("open") && !panel.contains(e.target)){
      panel.classList.remove("open");
      $("notifBtn").classList.remove("open");
    }
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && $("notifPanel")) { $("notifPanel").classList.remove("open"); $("notifBtn").classList.remove("open"); }
  });

  // Si otra persona publica algo, la campanita se actualiza sola (cada minuto y al volver a la pestaña)
  setInterval(function(){ if(currentUser && !document.hidden) cargarNotificaciones(); }, 60000);
  document.addEventListener("visibilitychange", function(){ if(!document.hidden && currentUser) cargarNotificaciones(); });
}

function renderNotifications(){

  const panel = $("notifPanel");
  const badge = $("notifBadge");
  if(!panel || !badge) return;

  if(!currentUser){ badge.style.display = "none"; return; }

  const list = myNotifs();
  const unread = list.filter(n => !n.read).length;

  badge.textContent = unread > 9 ? "9+" : unread;
  badge.style.display = unread ? "grid" : "none";

  const canPost = hasPermission("create", "aviso");

  panel.innerHTML =
    '<div class="notif-head"><b>Notificaciones</b>' +
      (unread ? '<button type="button" onclick="markAllNotifsRead()">Marcar todo como leído</button>' : '') +
    '</div>' +
    '<div class="notif-list">' +
      (list.length ? list.slice(0, 30).map(n => {
        const t = NOTIF_TYPES[n.type] || NOTIF_TYPES.aviso;
        const isUnread = !n.read;
        return '<div class="notif-item' + (isUnread ? ' unread' : '') + '" onclick="openNotif(\'' + n.id + '\')">' +
          '<div class="notif-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + t.icon + '</svg></div>' +
          '<div class="notif-body"><strong>' + escapeHtml(n.title) + '</strong>' +
            (n.text ? '<p>' + escapeHtml(n.text) + '</p>' : '') +
            '<small>' + t.label + (n.byName && n.role !== "admin" ? ' · ' + escapeHtml(n.byName) : '') + ' · ' + timeAgo(n.date) + '</small></div>' +
          (isUnread ? '<span class="notif-dot"></span>' : '') +
        '</div>';
      }).join("") : '<div class="notif-empty">No tienes notificaciones por ahora.</div>') +
    '</div>' +
    (canPost ? '<div class="notif-foot"><button type="button" class="btn secondary" onclick="publishNotice()">＋ Publicar un aviso</button></div>' : '');
}

function openNotif(id){
  const n = loadNotifs().find(x => x.id === id);
  markNotifRead(id);
  renderNotifications();
  if(n && n.page && hasPermission("view", n.page)){
    const btn = document.querySelector('.nav button[onclick*="\'' + n.page + '\'"]');
    $("notifPanel").classList.remove("open");
    $("notifBtn").classList.remove("open");
    showPage(n.page, btn);
  }
}

// Aviso / noticia: administrador (para todos o un grupo) y profesores (para sus grupos)
function publishNotice(){

  if(!requirePermission("create", "aviso")) return;

  const title = prompt("Título del aviso:");
  if(title === null || !title.trim()) return;
  const text = prompt("Mensaje (opcional):", "");
  if(text === null) return;

  let groups = null;
  if(getRole() === "profesor"){
    groups = teacherGroups();                                  // solo sus grupos
  }else{
    const g = prompt("¿Para qué grupo? (ej. 7-1). Déjalo vacío para todos:", "");
    if(g === null) return;
    if(g.trim()){
      const known = window.ADE_CURRICULUM ? ADE_CURRICULUM.groups : [];
      if(known.length && known.indexOf(g.trim()) === -1) return alert("Ese grupo no existe.");
      groups = [g.trim()];
    }
  }

  notify({type:"aviso", title:title.trim(), text:text.trim(), groups:groups});
  if(typeof showToast === "function") showToast("Aviso publicado", "Ya les aparece en la campanita.", "ok", 3000);
}

// Al entrar: si hay avisos sin leer, se avisa con un mensajito
function announceUnread(){
  const n = unreadCount();
  if(n && typeof showToast === "function"){
    showToast("Tienes " + (n === 1 ? "1 notificación" : n + " notificaciones") + " sin leer",
      "Abre la campanita de arriba a la derecha.", "info", 4500);
  }
}


/* =========================================================
   INICIO: encabezado de bienvenida y cuatro cuadros con números
   (Actividades pendientes · Completadas · Materias · Clases de hoy)
   Solo cambia el dibujo de esta página: el fondo animado no se toca.
   ========================================================= */

function ensureHomeStatsStyle(){

  if(document.getElementById("homeStatsStyle")) return;

  const st = document.createElement("style");
  st.id = "homeStatsStyle";
  st.textContent = `
    #inicio .welcome{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
    #inicio .welcome h2{font-size:28px;line-height:1.2;margin-bottom:4px}
    #inicio .welcome p{font-size:15px;color:#7db2ff}
    #inicio .welcome > .btn,#inicio .welcome .btn{
      background:#2f6bf0;color:#fff;border-radius:11px;padding:12px 22px;font-size:14px;font-weight:700;
      display:inline-flex;align-items:center;gap:10px;box-shadow:0 6px 18px rgba(47,107,240,.35);
    }
    #inicio .welcome .btn:hover{filter:brightness(1.1)}

    #inicio .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
    #inicio .stats .home-stat{
      --c:#2f6bf0;
      position:relative;display:flex;align-items:center;gap:18px;text-align:left;width:100%;
      padding:20px 38px 20px 24px;border-radius:14px;color:#fff;cursor:pointer;
      background:linear-gradient(135deg,rgba(15,26,56,.88),rgba(9,17,38,.82));
      border:1px solid rgba(125,178,255,.16);overflow:hidden;transition:.2s;
    }
    #inicio .stats .home-stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--c)}
    #inicio .stats .home-stat:hover{transform:translateY(-2px);border-color:var(--c);box-shadow:0 10px 26px rgba(0,0,0,.35)}
    .hs-ico{
      width:56px;height:56px;border-radius:50%;flex:none;display:grid;place-items:center;
      background:var(--c);box-shadow:0 0 0 6px color-mix(in srgb,var(--c) 22%,transparent);color:#fff;
    }
    .hs-ico svg{width:27px;height:27px}
    .hs-text{min-width:0;display:block}
    .hs-label{display:block;font-size:14px;color:#e6edfa;font-weight:600;line-height:1.2}
    .hs-num{display:block;font-size:34px;font-weight:700;line-height:1.1;margin:4px 0 4px}
    .hs-sub{display:block;font-size:12px;color:#7db2ff;line-height:1.3}
    .hs-go{position:absolute;right:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:#b9cbee}
    @media(max-width:1250px){ #inicio .stats{grid-template-columns:repeat(2,minmax(0,1fr))} }
    @media(max-width:640px){
      #inicio .stats{grid-template-columns:1fr;gap:12px}
      #inicio .welcome h2{font-size:22px}
      #inicio .stats .home-stat{padding:16px 34px 16px 18px}
    }
  `;
  document.head.appendChild(st);
}

const HOME_ICONS = {
  pend:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4.500" width="14" height="17" rx="2.400"/><path d="M9 4.500V3.600c0-.3.3-.6.6-.6h4.800c.3 0 .6.3.6.6v.9"/><path d="M8.600 12.200h2M8.600 16.600h2M12.600 12.200h2.800M12.600 16.600h2.800"/></svg>',
  done:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4.500 12.800 4.700 4.700L19.500 7"/></svg>',
  subj:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.800 5.500c3.400 0 6 .6 9.200 2.200v11.600c-3.200-1.600-5.800-2.200-9.200-2.200z"/><path d="M21.200 5.500c-3.400 0-6 .6-9.200 2.200v11.600c3.200-1.600 5.800-2.200 9.200-2.200z"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.500" y="5" width="17" height="15.500" rx="3"/><path d="M3.500 10h17M8 3v4M16 3v4"/><path d="M8 13.700h.01M12 13.700h.01M16 13.700h.01M8 17h.01M12 17h.01" stroke-width="2.600"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6"/><circle cx="17.2" cy="9" r="2.6"/><path d="M17 14.2c2.6.2 4.2 1.9 4.6 4.6"/></svg>',
  go:    '<svg class="hs-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>'
};

// Cuántas clases hay hoy (estudiante: su grupo · profesor: las suyas · admin: todo el colegio)
function classesToday(dayIndex){

  const names = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const idx = dayIndex === undefined ? new Date().getDay() : dayIndex;
  const day = names[idx];
  const role = getRole();
  const hasGroups = typeof groupSchedules !== "undefined" && Object.keys(groupSchedules).length;

  const of = list => (list || []).filter(d => d.day === day).reduce((n, d) => n + d.classes.length, 0);

  if(hasGroups){
    if(role === "estudiante") return of(groupSchedules[studentGroup()]);
    if(role === "profesor" && teacherGroups()){
      return teacherGroups().reduce((n, g) => {
        const d = (groupSchedules[g] || []).find(x => x.day === day);
        return n + (d ? d.classes.filter(c => c.teacher === currentUser.username || teacherSubjects().some(s => ttClassIsOfSubject(c.subject, s))).length : 0);
      }, 0);
    }
    if(role === "admin") return Object.keys(groupSchedules).reduce((n, g) => n + of(groupSchedules[g]), 0);
  }

  // Cuentas antiguas: horario general
  const d = (typeof schedule !== "undefined" ? schedule : []).find(x => x.day === day);
  if(!d) return 0;
  if(role === "profesor") return d.classes.filter(c => teacherSubjects().some(s => ttClassIsOfSubject(c.subject, s))).length;
  return d.classes.length;
}

function homeStats(){

  const role = getRole();
  const mine = visibleActivities();
  const isDone = a => role === "estudiante"
    ? !!(a.submissions && currentUser && a.submissions[currentUser.username])
    : !!(a.submissions && Object.keys(a.submissions).length);

  let subjectsCount = subjects.length;
  if(role === "profesor") subjectsCount = teacherSubjects().length || 0;
  else if(role === "estudiante" && window.ADE_CURRICULUM && studentGroup()){
    subjectsCount = ADE_CURRICULUM.subjectsOfGroup(studentGroup()).length || subjects.length;
  }

  return {
    pending: mine.filter(a => !isDone(a)).length,
    done: mine.filter(isDone).length,
    subjects: subjectsCount,
    today: classesToday()
  };
}

// Texto que va debajo del nombre (arriba a la derecha): el cargo y el grupo, no el usuario
function userRoleLabel(u){
  if(!u) return "";
  if(u.role === "admin") return String(u.name || "").trim().toLowerCase() === "administrador" ? "Acceso total" : "Administrador";
  const role = u.role === "profesor" ? "Profesor" : (u.role === "acudiente" ? "Acudiente" : "Estudiante");
  let g = "";
  if(u.role === "profesor"){
    const gs = typeof teacherGroups === "function" ? teacherGroups(u) : null;
    g = gs ? (gs.length <= 2 ? gs.join(", ") : gs.length + " grupos") : "";
  }else{
    g = u.grade || "";
  }
  return role + (g ? " · " + g : "");
}

function goHome(page){
  const btn = document.querySelector('.nav button[onclick*="\'' + page + '\'"]');
  showPage(page, btn);
}

function renderHomeStats(){

  const box = document.querySelector("#inicio .stats");
  if(!box || !currentUser) return;

  ensureHomeStatsStyle();

  const s = homeStats();
  const student = getRole() === "estudiante";
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

  const cards = [
    {c:"#25a05d", icon:HOME_ICONS.pend, label:"Actividades pendientes", id:"pendingCount", n:s.pending, page:"actividades",
     sub: student ? "Tienes " + plural(s.pending, "actividad", "actividades") + " por entregar" : "Actividades sin entregas"},
    {c:"#14b8a6", icon:HOME_ICONS.done, label:"Entregadas", id:"doneCount", n:s.done, page:"actividades",
     sub: student ? "Actividades entregadas" : "Actividades con entregas"},
    {c:"#7c5cff", icon:HOME_ICONS.subj, label:"Materias", id:"subjectCount", n:s.subjects, page:"materias",
     sub: "Materias activas"},
    {c:"#f59e0b", icon:HOME_ICONS.today, label:"Clases de hoy", id:"todayCount", n:s.today, page:"horario",
     sub: s.today ? "Clases programadas" : "Hoy no hay clases"}
  ];

  // Administrador: "clases de hoy" sumaba las de los 54 grupos (no servía). Mejor: cuántas cuentas hay.
  if(getRole() === "admin"){
    const nEst = users.filter(u => u && u.role === "estudiante").length;
    const nProf = users.filter(u => u && u.role === "profesor").length;
    cards[3] = {c:"#f59e0b", icon:HOME_ICONS.users, label:"Usuarios", id:"usersCount", n:nEst + nProf, page:"admin",
      sub: plural(nEst, "estudiante", "estudiantes") + " · " + plural(nProf, "profesor", "profesores")};
  }

  // El acudiente no ve entregas: se quitan las tarjetas de pendientes y entregadas
  if(typeof isGuardian === "function" && isGuardian()) cards.splice(0, 2);

  box.innerHTML = cards.map(k =>
    '<button type="button" class="home-stat" style="--c:' + k.c + '" onclick="goHome(\'' + k.page + '\')">' +
      '<span class="hs-ico">' + k.icon + '</span>' +
      '<span class="hs-text"><span class="hs-label">' + k.label + '</span>' +
      '<span class="hs-num" id="' + k.id + '">' + k.n + '</span>' +
      '<span class="hs-sub">' + k.sub + '</span></span>' +
      HOME_ICONS.go +
    '</button>'
  ).join("");

  // Encabezado
  const head = document.querySelector("#inicio .welcome");
  if(head){
    const h2 = head.querySelector("h2");
    const sub = head.querySelector("p");
    const hr = new Date().getHours();
    const greet = hr < 12 ? "Buenos días" : (hr < 19 ? "Buenas tardes" : "Buenas noches");
    const first = String(currentUser.name || currentUser.username || "")
      .replace(/^(prof(esor(a)?)?\.?)\s+/i, "").trim().split(/\s+/)[0] || "";
    const fecha = new Date().toLocaleDateString("es-CO", {weekday:"long", day:"numeric", month:"long", year:"numeric"});
    if(h2){
      h2.innerHTML = escapeHtml(greet + (first ? ", " + first : "")) + ' <span class="wave-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#6fe3a1" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/></svg></span>';
    }
    if(sub) sub.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    const add = head.querySelector(".btn");
    if(add && !add.querySelector("svg")){
      add.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>Nueva actividad</span>';
    }
  }
}


const PAGE_NAMES = {
  inicio:"Inicio",
  actividades:"Actividades",
  materias:"Materias",
  horario:"Horario",
  calendario:"Calendario",
  perfil:"Mi perfil",
  admin:"Administración"
};
 
function showPage(id, btn){
 
  if(!hasPermission("view", id)) return denyPermission();
 
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(id).classList.add("active");
 
  document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
  if(btn) btn.classList.add("active");
 
  setPageTitle(id);
 
  render();
}
 
 
/* ---------- Fechas ---------- */
 
function formatDate(d){
  if(!d) return "Sin fecha";
  return new Date(d + "T00:00:00").toLocaleDateString("es-CO", {
    day:"2-digit", month:"2-digit", year:"numeric"
  });
}
 
 
/* ---------- Tarjeta de actividad ---------- */
 
function card(a){

  const i = activities.indexOf(a);
  const isStudent = getRole() === "estudiante";
  const status = activityStatus(a);                       // "pending" | "done"
  const mine = a.submissions && currentUser?.username ? a.submissions[currentUser.username] : null;
  const count = a.submissions ? Object.keys(a.submissions).length : 0;

  // Fecha vencida (solo si sigue pendiente)
  const badge = activityBadge(a);                        // {key, label}: pending | today | late | done
  const late = badge.key === "late";

  // Estudiante: su entrega. Profesor / admin: cuántos han entregado ("5 de 28") con barrita
  let note;
  if(isStudent){
    note = mine
      ? `<p class="act-note">✓ Entregaste: ${escapeHtml(mine.name)}${mine.late ? " (tarde)" : ""}${mine.grade != null ? " · Nota " + Number(mine.grade).toFixed(1) : ""}</p>`
      : "";
  }else{
    const pr = activityProgress(a);
    note = pr.total
      ? `<div class="act-prog"><p class="act-note staff">${pr.done} de ${pr.total} ${pr.total === 1 ? "entrega" : "entregas"}${pr.ungraded ? " · " + pr.ungraded + " por calificar" : ""}${a.group ? " · Grupo " + escapeHtml(a.group) : ""}</p>` +
        `<div class="act-prog-bar"><i style="width:${Math.round(pr.done / pr.total * 100)}%"></i></div></div>`
      : `<p class="act-note staff">${count} ${count === 1 ? "entrega" : "entregas"}${a.group ? " · Grupo " + escapeHtml(a.group) : ""}</p>`;
  }

  // Estudiante con trabajo pendiente: botón para entregar. Los demás: ver la actividad.
  const button = (isStudent && status === "pending" && hasPermission("create","entrega"))
    ? `<button class="act-btn ghost" onclick="event.stopPropagation();submitWork(${i})">${ACT_ICONS.upload}Entregar trabajo</button>`
    : `<button class="act-btn" onclick="event.stopPropagation();viewActivity(${i})">Ver actividad</button>`;

  return `
    <div class="act-card" onclick="viewActivity(${i})">
      ${subjectIcon(a.subject)}
      <div class="act-body">
        <h4>${escapeHtml(a.title)}</h4>
        <p class="act-meta"><b>${escapeHtml(a.subject)}</b> · Entrega: <span class="${late ? "late" : ""}">${formatDue(a)}</span></p>
        <p class="act-desc">${escapeHtml(a.desc || "")}</p>
        ${note}
      </div>
      <div class="act-side">
        <div class="act-top">
          <span class="act-badge ${badge.key}">${badge.label}</span>
          ${ACT_ICONS.chev}
        </div>
        ${button}
      </div>
    </div>
  `;
}
 
 
/* ---------- Encabezado de cada apartado ----------
   Igual que en Calendario: icono grande + título + subtítulo (y el botón de la página a la derecha).
   Se crea solo, no hace falta tocar el HTML. Para cambiar un texto, edita PAGE_HEADERS.
   (Inicio conserva su saludo: lo escribe renderHomeStats.) */

const PAGE_HEADERS = {
  inicio:      {icon:"inicio",      title:"",                  sub:""},
  actividades: {icon:"actividades", title:"Actividades",       sub:"Consulta, entrega y organiza tus tareas."},
  materias:    {icon:"materias",    title:"Materias",          sub:"Todas las materias del colegio y sus actividades."},
  horario:     {icon:"horario",     title:"Horario de clases", sub:"Consulta tus clases de la semana."},
  perfil:      {icon:"perfil",      title:"Mi perfil",         sub:"Administra tu información personal y tu foto."},
  admin:       {icon:"admin",       title:"Administración",    sub:"Gestiona las cuentas de los usuarios de la plataforma."}
};

function ensurePageHeaderStyle(){

  if(document.getElementById("pageHeaderStyle")) return;

  const st = document.createElement("style");
  st.id = "pageHeaderStyle";
  st.textContent = `
    .page .welcome.pg-head{
      display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px 16px;
      margin:0 0 16px;
    }
    .pg-left{display:flex; align-items:center; gap:16px; min-width:0}
    .pg-ico{
      flex:none; width:62px; height:62px; border-radius:17px; display:grid; place-items:center; color:#fff;
      background:linear-gradient(150deg,#2d6cf0,#17317f);
      border:1px solid rgba(110,165,255,.5);
      box-shadow:0 8px 22px rgba(30,90,220,.35), inset 0 1px 0 rgba(255,255,255,.2);
    }
    .pg-ico svg{width:30px; height:30px; display:block}
    .page .welcome.pg-head h2{margin:0 0 4px; font-size:25px; color:#f2f6ff}
    .page .welcome.pg-head p{margin:0; font-size:13px; color:#8fb4ee}
    .page .welcome.pg-head > :not(.pg-left){margin-left:auto}
    .page .welcome.pg-head > .btn:not(.secondary):not(.danger){
      display:inline-flex; align-items:center; gap:8px; white-space:nowrap;
      padding:10px 18px; border-radius:11px; font-size:13px; font-weight:700; color:#fff; border:0;
      background:linear-gradient(180deg,#2d6cf0,#1c52cf); box-shadow:0 6px 18px rgba(47,107,240,.4);
    }
    /* Versión compacta: el título (con su logo verde) ya está en la barra de arriba, así que el bloque grande
       se oculta y solo queda la fila de botones de la página (si no tiene ninguno visible, la fila desaparece). */
    /* Inicio: el logo verde ya está en la barra de arriba, así que no se repite junto al saludo */
    #inicio .welcome.pg-head .pg-ico{display:none}
    .page .welcome.pg-head.pg-slim{margin:0 0 14px; justify-content:flex-end}
    .page .welcome.pg-head.pg-slim .pg-left{display:none}
    .page .welcome.pg-head.pg-slim:not(:has(> :not(.pg-left):not([style*="display: none"]))){display:none}
    @media(max-width:640px){
      .pg-ico{width:50px; height:50px; border-radius:14px}
      .pg-ico svg{width:24px; height:24px}
      .page .welcome.pg-head h2{font-size:21px}
      .page .welcome.pg-head > :not(.pg-left){margin-left:0}
    }
  `;
  document.head.appendChild(st);
}

function setupPageHeaders(){

  ensurePageHeaderStyle();

  Object.keys(PAGE_HEADERS).forEach(function(id){

    const page = document.getElementById(id);
    if(!page) return;

    const cfg = PAGE_HEADERS[id];
    let head = page.querySelector(".welcome");

    // Si la página no tenía encabezado, se crea uno arriba
    if(!head){
      head = document.createElement("div");
      head.className = "welcome";
      head.appendChild(document.createElement("h2"));
      head.appendChild(document.createElement("p"));
      page.insertBefore(head, page.firstChild);
    }

    if(head.dataset.pgDone) return;           // ya está listo (no se repite)
    head.dataset.pgDone = "1";
    head.classList.add("pg-head");

    let h2 = head.querySelector("h2");
    let p = head.querySelector("p");
    if(!h2){ h2 = document.createElement("h2"); head.insertBefore(h2, head.firstChild); }
    if(!p){ p = document.createElement("p"); h2.insertAdjacentElement("afterend", p); }

    if(cfg.title){
      h2.textContent = cfg.title;
      p.textContent = cfg.sub;
    }

    // Texto (título + subtítulo) en un solo bloque
    let text = h2.parentElement;
    if(text === head){
      text = document.createElement("div");
      head.insertBefore(text, h2);
      text.appendChild(h2);
      text.appendChild(p);
    }

    // Bloque de la izquierda: icono + texto. Lo demás (botones) queda a la derecha.
    const left = document.createElement("div");
    left.className = "pg-left";

    const ico = document.createElement("span");
    ico.className = "pg-ico";
    ico.innerHTML = NAV_ICONS[cfg.icon] || "";

    head.insertBefore(left, text);
    left.appendChild(ico);
    left.appendChild(text);

    // Todos los apartados menos Inicio usan la versión compacta
    if(id !== "inicio") head.classList.add("pg-slim");

    // El botón "Agregar materia" pasa arriba a la derecha, junto a los demás botones de acción
    if(id === "materias"){
      const addBtn = document.getElementById("addSubjectBtn");
      if(addBtn) head.appendChild(addBtn);
    }
  });
}
 
 
/* ---------- Tema verde ----------
   Botones, menú activo, pestañas, encabezados y bordes pasan de azul a verde
   (el mismo verde del botón "Iniciar sesión"). El fondo oscuro se queda igual.
   Para cambiar el verde, edita los colores de este bloque
   (#2fb86d claro · #25a05d principal · #1d8a52 oscuro · #6fe3a1 detalles). */

function ensureGreenTheme(){

  if(document.getElementById("greenThemeStyle")) return;

  const st = document.createElement("style");
  st.id = "greenThemeStyle";
  st.textContent = `
    /* Botones principales */
    .page .btn:not(.secondary):not(.danger),
    .modal .btn:not(.secondary):not(.danger),
    .act-btn:not(.ghost):not(.danger),
    .cal2-add,
    .cal2-btn.primary,
    .page .welcome.pg-head > .btn:not(.secondary):not(.danger){
      background:linear-gradient(180deg,#2fb86d,#1d8a52) !important;
      border-color:transparent !important;
      box-shadow:0 6px 18px rgba(37,160,93,.4) !important;
      color:#fff !important;
    }
    .page .btn:not(.secondary):not(.danger):hover,
    .modal .btn:not(.secondary):not(.danger):hover,
    .act-btn:not(.ghost):not(.danger):hover,
    .cal2-add:hover{filter:brightness(1.1)}

    /* Botones suaves (borde + fondo transparente) */
    .act-btn.ghost,
    .cal2-btn:not(.primary):not(.danger){
      background:rgba(37,160,93,.16) !important;
      border-color:rgba(111,227,161,.6) !important;
      color:#c9f7dd !important;
      box-shadow:none !important;
    }

    /* Menú lateral */
    .nav button.active{
      background:linear-gradient(90deg,#1f8a55,#0d3a28) !important;
      border-color:rgba(111,227,161,.55) !important;
      border-left-color:#6fe3a1 !important;
      box-shadow:inset 3px 0 0 #6fe3a1, 0 6px 18px rgba(37,160,93,.25) !important;
    }
    .nav button.active::before{background:#6fe3a1 !important}
    .nav button .nav-ico{color:#7fd9a6}
    .nav button.active .nav-ico{color:#fff}
    .title-ico{color:#fff !important}

    /* Encabezados de cada apartado */
    .pg-ico,
    .cal2-wico{
      background:linear-gradient(150deg,#2fb86d,#17663f) !important;
      border-color:rgba(111,227,161,.55) !important;
      box-shadow:0 8px 22px rgba(37,160,93,.35), inset 0 1px 0 rgba(255,255,255,.2) !important;
    }
    .page .welcome.pg-head p,
    .cal2-welcome p{color:#8fe3b3 !important}

    /* Tarjetas de Inicio */
    #inicio .stats .home-stat .hs-sub{color:color-mix(in srgb, var(--c) 55%, #fff) !important}

    /* Actividades */
    .act-card{border-color:rgba(80,200,130,.38) !important}
    .act-card:hover{border-color:rgba(111,227,161,.85) !important; box-shadow:0 12px 28px rgba(20,120,70,.3) !important}
    .act-search,
    .act-select{border-color:rgba(80,200,130,.4) !important}
    .act-tab{border-color:rgba(80,200,130,.32) !important}
    .act-tab:hover{border-color:rgba(111,227,161,.8) !important}
    .act-tab.active{
      background:linear-gradient(180deg,#2fb86d,#1d8a52) !important;
      border-color:#6fe3a1 !important;
      box-shadow:0 6px 18px rgba(37,160,93,.4) !important;
    }
    .act-detail a.file-link{color:#6fe3a1 !important}

    /* Calendario */
    .cal2-card,
    .cal2-side{border-color:rgba(80,200,130,.38) !important}
    .cal2-head{border-bottom-color:rgba(80,200,130,.28) !important}
    .cal2-nav{
      background:rgba(37,160,93,.28) !important;
      border-color:rgba(111,227,161,.5) !important;
    }
    .cal2-nav:hover{background:rgba(37,160,93,.5) !important}
    .cal2-title i{background:linear-gradient(90deg,#2fb86d,#6fe3a1) !important}
    .cal2-weekdays div{color:#8fe3b3 !important}
    .cal2-day{border-color:rgba(80,200,130,.22) !important}
    .cal2-day:hover{border-color:rgba(111,227,161,.75) !important}
    .cal2-day.today{
      border-color:#4ade80 !important;
      background:rgba(37,160,93,.2) !important;
      box-shadow:0 0 0 1px rgba(74,222,128,.35), 0 0 20px rgba(74,222,128,.3) !important;
    }
    .cal2-day.today .cal2-num{background:#25a05d !important}
    .cal2-hoy{background:rgba(37,160,93,.3) !important; color:#8ff0b8 !important}
    .cal2-orb{color:#5fdc95 !important; border-color:rgba(111,227,161,.45) !important; box-shadow:0 0 34px rgba(37,160,93,.28) !important}
    .cal2-empty p{color:#8fe3b3 !important}

    /* Horario */
    .tt-head.today{
      border-color:#4ade80 !important;
      background:linear-gradient(180deg,#14472f,#0e3322) !important;
      box-shadow:0 0 0 1px rgba(74,222,128,.35), 0 6px 20px rgba(37,160,93,.28) !important;
    }
    .tt-hoy{background:#25a05d !important}
    .tt-cell.today{
      background:rgba(37,160,93,.08) !important;
      box-shadow:inset 0 0 0 1px rgba(74,222,128,.55) !important;
    }
    .tt-live{background:rgba(37,160,93,.35) !important; border-color:rgba(111,227,161,.65) !important; color:#d7fbe6 !important}
    .tt-class.live{box-shadow:0 0 0 1px rgba(111,227,161,.55), 0 4px 14px rgba(37,160,93,.3) !important}
  `;
  document.head.appendChild(st);
}

ensureGreenTheme();


/* ---------- Letra: Arial en TODA la página ----------
   Esta regla gana sobre cualquier otra letra (HTML, otros estilos, ventanas, tablas, botones…).
   Para cambiar de letra en todo el sitio, cambia solo "Arial,Helvetica,sans-serif". */
(function(){
  if(document.getElementById("arialEverywhereStyle")) return;
  const st = document.createElement("style");
  st.id = "arialEverywhereStyle";
  st.textContent = "*,*::before,*::after,input::placeholder,textarea::placeholder{font-family:Arial,Helvetica,sans-serif !important}";
  document.head.appendChild(st);
})();
 
 
/* ---------- Fondo animado: capas que se mueven con transform (el estilo está en estilos.css) ---------- */
(function(){
  if(document.querySelector(".amb-mist") || !document.body) return;
  const box = document.createElement("div");
  box.className = "amb-mist";
  box.setAttribute("aria-hidden", "true");
  box.innerHTML = '<i class="l"></i><i class="v"></i><i class="r"></i><i class="m4"></i><i class="m3"></i><i class="m2"></i><i class="m1"></i>';
  document.body.insertBefore(box, document.body.firstChild);
})();


/* ---------- Cuadros redondeados de Inicio ----------
   "Próximas actividades" y "Mis materias" quedan cada una dentro de su cuadro con
   bordes redondeados (título + botón + tarjetas). Se arma solo, sin tocar el HTML. */

function ensureHomePanelStyle(){

  if(document.getElementById("homePanelStyle")) return;

  const st = document.createElement("style");
  st.id = "homePanelStyle";
  st.textContent = `
    #inicio .home-panel{
      margin:18px 0 0; padding:16px 18px 18px; border-radius:20px; min-width:0;
      background:linear-gradient(165deg,rgba(12,26,62,.62),rgba(6,15,38,.68));
      border:1px solid rgba(80,200,130,.38);
      box-shadow:0 10px 30px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04);
    }
    #inicio .home-panel > .section-head,
    #inicio .home-panel > .home-panel-head{margin:0 0 14px}
    @media(max-width:640px){
      #inicio .home-panel{padding:13px 12px 14px; border-radius:17px; margin-top:14px}
    }
  `;
  document.head.appendChild(st);
}

// Mete el título (con su botón) y la lista en un mismo cuadro
function wrapHomeSection(boxId, titleRe){

  const box = $(boxId);
  if(!box || box.closest(".home-panel")) return;

  // El título es el h2/h3 de Inicio que dice el nombre de la sección
  let h = null;
  document.querySelectorAll("#inicio h2, #inicio h3").forEach(el => {
    if(!h && titleRe.test(normText(el.textContent))) h = el;
  });

  // Encabezado = el bloque que contiene al título y es vecino de la lista
  let head = h;
  while(head && head.parentElement && head.parentElement !== box.parentElement) head = head.parentElement;
  if(!head || head.parentElement !== box.parentElement || head === box) head = null;

  const panel = document.createElement("section");
  panel.className = "home-panel";
  (head || box).insertAdjacentElement("beforebegin", panel);

  let node = head || box;
  while(node){
    const next = node.nextElementSibling;
    panel.appendChild(node);
    if(node === box) break;
    node = next;
  }
  if(head && !head.classList.contains("section-head")) head.classList.add("home-panel-head");
}

function setupHomePanels(){
  ensureHomePanelStyle();
  wrapHomeSection("homeActivities", /proximas actividades/);
  wrapHomeSection("homeSubjects", /mis materias/);
}


/* ---------- Render general ---------- */
 
// Si una parte falla, las demás se siguen dibujando (y el error queda en la consola)
function safeStep(fn){
  try{ fn(); }catch(e){ console.error("[ADE] Error en " + (fn.name || "render") + ":", e); }
}

function activePageId(){
  const p = document.querySelector(".page.active");
  return p ? p.id : "inicio";
}

// Solo se dibuja lo que se está viendo (antes se redibujaban TODAS las páginas en cada cambio).
// Al entrar a otro apartado, showPage() vuelve a llamar a render() y se dibuja en ese momento.
function render(){
  const page = activePageId();

  safeStep(setupPageHeaders);
  safeStep(setupHomePanels);
  safeStep(renderNotifications);

  // El horario de la cuenta se elige aquí aunque no se esté viendo (Inicio lo usa para "clases de hoy/mañana")
  if(page !== "horario" && typeof ttPrepare === "function") safeStep(ttPrepare);

  if(page === "inicio") safeStep(renderHomeStats);
  if(page === "inicio" || page === "actividades") safeStep(renderActivities);
  if(page === "inicio" || page === "materias") safeStep(renderSubjects);
  if(page === "horario") safeStep(renderSchedule);
  if(page === "calendario") safeStep(renderCalendar);
 
  // Estudiante: según SU entrega. Profesor/admin: según si ya recibieron entregas.
  let mineList = [];
  try{ mineList = visibleActivities(); }catch(e){ console.error(e); }
  const isDone = a => getRole() === "estudiante"
    ? !!(a.submissions && currentUser && a.submissions[currentUser.username])
    : !!(a.submissions && Object.keys(a.submissions).length);
  if($("pendingCount")) $("pendingCount").textContent = mineList.filter(a => !isDone(a)).length;
  if($("doneCount")) $("doneCount").textContent = mineList.filter(isDone).length;
}
 
 
/* ---------- Pantalla pública ---------- */
 
function scrollToSection(id){
  $(id).scrollIntoView({behavior:"smooth"});
}
 
 
/* ---------- Arranque ---------- */
 
// Se quita el reloj y el usuario (foto + nombre) pasa de abajo a la izquierda
// a la parte de arriba a la derecha. Se mueve el mismo bloque, así que todo lo
// que lo usa (foto, nombre) sigue funcionando.
(function(){
  const clock = $("clock");
  if(clock) clock.remove();

  const box = document.querySelector(".sidebar-bottom");
  const top = document.querySelector(".topbar");
  if(box && top){
    box.classList.add("in-topbar");
    top.appendChild(box);
  }
})();

setupNavIcons();
setPageTitle("inicio");
setupNotifBell();
render();
 
// Si ya había una sesión iniciada, entrar directo a la aplicación
if(currentUser) enterApp();