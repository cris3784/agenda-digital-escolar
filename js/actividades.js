/* =========================================================
   TAMAÑO UNIFORME DE TODAS LAS PÁGINAS
   (Inicio, Actividades, Materias, Horario, Calendario,
    Mi perfil y Administración)
   ========================================================= */
 
function ensureHomeStyle(){
 
  if(document.getElementById("homeExtraStyle")) return;
 
  const st = document.createElement("style");
  st.id = "homeExtraStyle";
  st.textContent = `
    /* Encabezado de bienvenida (todas las páginas) */
    .page .welcome{margin-bottom:14px}
    .page .welcome h2{font-size:22px;margin-bottom:3px}
    .page .welcome p{font-size:13px}
    .page .welcome .btn,
    .page > div > .btn{padding:7px 13px;font-size:13px}
 
    /* Cuadros de números */
    #inicio .stats{gap:14px}
    #inicio .stats .card{padding:12px 16px;border-radius:13px}
    #inicio .stat-label{font-size:12px}
    #inicio .stat-number{font-size:24px;margin-top:4px}
 
    /* Títulos de sección */
    .page .section-head{margin:18px 0 10px}
    .page .card > .section-head:first-child{margin-top:0}
    .page .section-head h3{font-size:16px}
    .page .section-head .btn{padding:6px 12px;font-size:12px}
 
    /* Tarjetas de actividades */
    .activities{gap:12px}
    .card.activity{padding:12px 14px;border-radius:13px}
    .activity-info h4{font-size:14px;margin-bottom:3px}
    .activity-info p{font-size:12px}
    .activity-info p.activity-extra{margin-top:4px}
 
    /* Tarjeta: el texto se acomoda al espacio y los botones quedan fijos */
    /* Evita que una tarjeta con texto largo ensanche su columna y aplaste a la vecina */
    .activities > *,
    .card.activity{min-width:0}
    .activity-info{
      flex:1 1 0;
      min-width:0;               /* permite que el texto largo se corte en vez de empujar los botones */
      overflow-wrap:anywhere;
    }
    .activity-info a.file-link{
      display:inline-block;
      max-width:calc(100% - 30px);   /* deja sitio al 📎 */
      vertical-align:bottom;
      overflow:hidden;
      text-overflow:ellipsis;    /* nombre largo: "Archivo_muy_lar..." */
      white-space:nowrap;
    }
    .activity-side{
      display:flex;
      flex-direction:column;
      align-items:flex-end;
      gap:6px;
      flex:0 0 auto;             /* nunca se encoge ni se mueve */
    }
    .activity-actions{flex-wrap:nowrap !important}
    .activity-actions .btn{white-space:nowrap}
    .activity-side .badge{font-size:10px;padding:4px 8px}
 
    .activity-actions{
      display:flex;
      flex-wrap:wrap;
      justify-content:flex-end;
      gap:5px;
    }
    .activity-actions .btn{
      padding:4px 9px;
      font-size:11px;
      border-radius:7px;
    }
 
    /* Botones pequeños (materias, horario, tabla) */
    .subject-actions .btn,
    .table .btn,
    .tt-tools .btn{padding:4px 10px;font-size:11px;border-radius:7px}
 
    /* Mi perfil */
    #perfil .card{padding:14px 16px;border-radius:13px}
    #perfil .profile{max-width:760px}
    #perfil .profile-top{gap:14px;margin-bottom:16px}
    #perfil .profile-top h2{font-size:20px;margin-bottom:2px}
    #perfil .big-avatar{width:56px;height:56px;font-size:21px}
    #perfil .form-grid{gap:12px}
    #perfil .actions{margin-top:14px}
    #perfil .field{gap:5px}
    #perfil .field label{font-size:12px}
    #perfil .field input,
    #perfil .field select{padding:8px 10px;font-size:13px;border-radius:8px}
 
    /* Administración */
    #admin .card{padding:14px 16px;border-radius:13px}
    #admin .table th,
    #admin .table td{padding:9px 12px;font-size:12px}
  `;
 
  document.head.appendChild(st);
 
}
 
ensureHomeStyle();
 
 
/* =========================================================
   ACTIVIDADES
   ========================================================= */
 
// Las actividades y las entregas viven en la base de datos (api/actividades.php).
// Aquí solo hay una copia en memoria mientras la página está abierta.
let activities = [];

async function cargarActividadesServidor(){
  try{
    const resp = await fetch("api/actividades.php", {credentials:"same-origin", cache:"no-store"});
    const d = await resp.json();
    if(!d || !d.ok || !Array.isArray(d.actividades)) return false;
    activities = d.actividades;
    return true;
  }catch(e){
    return false;
  }
}

// Vuelve a pedir las actividades al servidor y redibuja la pantalla
async function recargarActividades(){
  const ok = await cargarActividadesServidor();
  if(ok && typeof currentUser !== "undefined" && currentUser && typeof render === "function") render();
  return ok;
}

// Como apiPost, pero para formularios con archivos (FormData)
async function apiForm(url, datos){
  let r;
  try{
    r = await fetch(url, {method:"POST", credentials:"same-origin", body:datos});
  }catch(e){
    return {ok:false, error:"No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."};
  }
  try{
    return await r.json();
  }catch(e){
    return {ok:false, error:"El servidor no respondió bien. Recarga la página (F5) e intenta otra vez."};
  }
}

// Cambia en la lista la actividad que devolvió el servidor (con sus entregas al día)
function reemplazarActividad(nueva){
  if(!nueva) return;
  const pos = activities.findIndex(x => x.id === nueva.id);
  if(pos >= 0) activities[pos] = nueva; else activities.unshift(nueva);
}
 
// Solo las actividades que le corresponden a la cuenta (su grupo o sus materias)
function visibleActivities(){
  return activities.filter(canSeeActivity);
}


/* ---------- Estado de una actividad: solo 2 ----------
   pending = Pendiente  (el estudiante aún no entrega / nadie ha entregado)
   done    = Entregada  (el estudiante ya entregó / ya hay entregas)          */

function activityStatus(a){
  const subs = a && a.submissions ? a.submissions : null;
  if(getRole() === "estudiante"){
    return subs && currentUser && subs[currentUser.username] ? "done" : "pending";
  }
  return subs && Object.keys(subs).length ? "done" : "pending";
}

// Momento límite de entrega: la fecha + la hora (si no tiene hora, vence al terminar el día)
function activityDeadline(a){
  if(!a || !a.date) return null;
  const t = /^\d{1,2}:\d{2}$/.test(a.time || "") ? String(a.time).padStart(5, "0") + ":59" : "23:59:59";
  const d = new Date(a.date + "T" + t);
  return isNaN(d) ? null : d;
}

// "11:30" → "11:30 a. m."
function formatTime(t){
  if(!/^\d{1,2}:\d{2}$/.test(t || "")) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("es-CO", {hour:"numeric", minute:"2-digit", hour12:true});
}

// "20/10/2026 · 11:59 p. m."
function formatDue(a){
  return formatDate(a.date) + (a.time ? " · " + formatTime(a.time) : "");
}

// Días que faltan para la fecha de entrega (0 = hoy, negativo = ya pasó)
function activityDaysLeft(a){
  if(!a || !a.date) return null;
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((new Date(a.date + "T00:00:00") - start) / 86400000);
}

// ¿Esta entrega (hecha en "when") llegó después del límite?
function isLateSubmission(a, when){
  const dl = activityDeadline(a);
  return !!dl && (when || new Date()) > dl;
}

// Estado según la fecha: "late" = ya venció · "today" = vence hoy · "" = a tiempo o ya entregada
function activityDue(a){
  if(!a || !a.date || activityStatus(a) !== "pending") return "";
  const dl = activityDeadline(a);
  if(!dl) return "";
  if(new Date() > dl) return "late";
  return activityDaysLeft(a) === 0 ? "today" : "";
}

// Insignia de la tarjeta: Nota (estudiante calificado) · Entregada · Vencida · Vence hoy / mañana / en 2 días · Pendiente
function activityBadge(a){
  if(activityStatus(a) === "done"){
    const mine = getRole() === "estudiante" && a.submissions && currentUser ? a.submissions[currentUser.username] : null;
    if(mine && mine.grade != null) return {key:"graded", label:"Nota " + Number(mine.grade).toFixed(1)};
    return {key:"done", label:"Entregada"};
  }
  const due = activityDue(a);
  if(due === "late")  return {key:"late",  label:"Vencida"};
  if(due === "today") return {key:"today", label:"Vence hoy"};
  const d = activityDaysLeft(a);
  if(d === 1) return {key:"soon", label:"Vence mañana"};
  if(d === 2) return {key:"soon", label:"Vence en 2 días"};
  return {key:"pending", label:"Pendiente"};
}

// Estudiantes registrados a los que les toca la actividad (los de su grupo; si es para todos, los grupos del profesor / todos)
function activityStudents(a){
  let list = users.filter(u => u && u.role === "estudiante");
  if(a.group) return list.filter(u => u.grade === a.group);
  if(getRole() === "profesor" && teacherGroups()){
    const mine = teacherGroups();
    list = list.filter(u => mine.includes(u.grade));
  }
  return list;
}

// {done, total}: cuántos de los estudiantes ya entregaron ("5 de 28")
function activityProgress(a){
  const students = activityStudents(a);
  const subs = a.submissions || {};
  const delivered = students.filter(u => subs[u.username]);
  return {
    done: delivered.length,
    total: students.length,
    ungraded: delivered.filter(u => subs[u.username].grade == null).length
  };
}

function actFileLink(f){
  return '<a class="file-link" href="' + f.data + '" download="' + escapeHtml(f.name) + '" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</a>';
}


/* ---------- Estilos del apartado Actividades ---------- */

function ensureActivityStyle(){

  if(document.getElementById("activityNewStyle")) return;

  const st = document.createElement("style");
  st.id = "activityNewStyle";
  st.textContent = `
    /* Barra de búsqueda y filtros */
    .act-toolbar{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 14px}
    .act-search{
      flex:1 1 320px; display:flex; align-items:center; gap:10px;
      padding:0 14px; height:44px; border-radius:12px;
      background:rgba(15,28,63,.75); border:1px solid rgba(60,120,255,.4);
    }
    .act-search svg{flex:none;width:18px;height:18px;stroke:#9fb4dc;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .act-search input{
      flex:1; min-width:0; background:none; border:0; outline:0;
      color:#eef2fb; font-size:13px; padding:0; height:100%;
    }
    .act-search input::placeholder{color:#7e8aa5}
    .act-select{
      flex:0 1 190px; position:relative; display:flex; align-items:center; gap:9px;
      padding:0 12px; height:44px; border-radius:12px;
      background:rgba(15,28,63,.75); border:1px solid rgba(60,120,255,.4);
    }
    .act-select svg{flex:none;width:18px;height:18px;stroke:#9fb4dc;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .act-select select{
      flex:1; min-width:0; width:100%; height:100%; background:transparent; border:0; outline:0;
      color:#dfe7f7; font-size:13px; cursor:pointer; padding:0 2px;
    }
    .act-select select option{background:#0f1830;color:#eef2fb}

    /* Pestañas */
    .act-tabs{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}
    .act-tab{
      display:inline-flex; align-items:center; gap:9px;
      padding:9px 18px; border-radius:11px; font-size:13px; font-weight:700;
      color:#c3cfe8; background:rgba(15,28,63,.75); border:1px solid rgba(60,120,255,.3);
      cursor:pointer;
    }
    .act-tab:hover{border-color:rgba(90,150,255,.7)}
    .act-tab.active{
      color:#fff; border-color:#3d7bff;
      background:linear-gradient(180deg,#2d6cf0,#1f55d0);
      box-shadow:0 6px 18px rgba(47,107,240,.4);
    }
    .act-count{
      min-width:24px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; text-align:center;
      background:rgba(255,255,255,.12); color:#fff;
    }
    .act-tab[data-st="pending"] .act-count{background:rgba(214,64,110,.35);color:#ffb3c6}
    .act-tab[data-st="done"] .act-count{background:rgba(20,184,166,.3);color:#7ff0df}
    .act-tab[data-st="late"] .act-count{background:rgba(239,68,68,.35);color:#ffb4b4}
    .act-tab.active .act-count{background:rgba(255,255,255,.25);color:#fff}

    /* Lista en 2 columnas */
    #activityList,#homeActivities,#homeLate{
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; align-items:stretch;
    }
    #activityList > .card.empty,#homeActivities > .card.empty,#homeLate > .card.empty{grid-column:1 / -1}

    /* Tarjeta de actividad */
    .act-card{
      display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:14px; align-items:stretch;
      padding:14px 16px; border-radius:15px; cursor:pointer; text-align:left;
      background:linear-gradient(165deg,#0f1c3f,#0a1330);
      border:1px solid rgba(60,120,255,.42);
      box-shadow:0 8px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04);
      transition:border-color .15s, transform .15s, box-shadow .15s;
    }
    .act-card:hover{border-color:rgba(110,165,255,.85);transform:translateY(-1px);box-shadow:0 12px 28px rgba(20,60,160,.3)}
    .act-card .subj-ico{width:54px;height:54px;border-radius:15px}
    .act-body{min-width:0;display:flex;flex-direction:column;gap:4px}
    .act-body h4{font-size:15px;font-weight:700;color:#f2f6ff;margin:0;overflow-wrap:anywhere}
    .act-meta{font-size:12px;color:#9fb0cf;margin:0}
    .act-meta b{color:#dfe7f7;font-weight:700}
    .act-meta .late{color:#ff9fb7}
    .act-desc{
      font-size:12px;line-height:1.45;color:#8fa6c8;margin:2px 0 0;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
    }
    .act-note{font-size:11px;color:#5eead4;margin:2px 0 0}
    .act-note.staff{color:#9fb0cf}
    .act-side{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:10px;flex:none}
    .act-top{display:flex;align-items:center;gap:10px}
    .act-chev{width:16px;height:16px;stroke:#8fa6c8;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}

    .act-badge{
      font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;white-space:nowrap;border:1px solid transparent;
    }
    .act-badge.pending{background:rgba(214,64,110,.22);color:#ffb3c6;border-color:rgba(214,64,110,.5)}
    .act-badge.done{background:rgba(20,184,166,.2);color:#7ff0df;border-color:rgba(20,184,166,.5)}
    .act-badge.late{background:rgba(239,68,68,.25);color:#ffb4b4;border-color:rgba(239,68,68,.65)}
    .act-badge.today{background:rgba(245,158,11,.2);color:#fcd34d;border-color:rgba(245,158,11,.55)}
    .act-badge.soon{background:rgba(245,158,11,.12);color:#fde68a;border-color:rgba(245,158,11,.4)}
    .act-badge.graded{background:rgba(47,184,109,.25);color:#b8f7d2;border-color:rgba(111,227,161,.65)}

    /* Avance de entregas ("5 de 28") */
    .act-prog{margin:3px 0 0;max-width:300px}
    .act-prog .act-note{margin:0 0 4px}
    .act-prog-bar,.ad-prog-bar{height:5px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
    .act-prog-bar i,.ad-prog-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#2fb86d,#6fe3a1)}
    .ad-prog{display:flex;align-items:center;gap:12px;margin:2px 0 4px}
    .ad-prog b{font-size:20px;color:#6fe3a1;white-space:nowrap}
    .ad-prog span{font-size:12px;color:#9fb0cf;white-space:nowrap}
    .ad-prog .ad-prog-bar{flex:1;height:8px}
    .ad-missing{display:flex;flex-wrap:wrap;gap:6px;max-height:140px;overflow:auto}
    .ad-missing span{padding:4px 10px;border-radius:999px;font-size:11.5px;color:#ffc9d4;background:rgba(214,64,110,.16);border:1px solid rgba(214,64,110,.4)}

    .act-btn{
      display:inline-flex;align-items:center;justify-content:center;gap:7px;
      padding:8px 16px;border-radius:9px;font-size:12px;font-weight:700;white-space:nowrap;
      color:#fff;border:1px solid transparent;cursor:pointer;
      background:linear-gradient(180deg,#2d6cf0,#1c52cf);
      box-shadow:0 5px 14px rgba(47,107,240,.35);
    }
    .act-btn:hover{filter:brightness(1.12)}
    .act-btn.ghost{
      background:rgba(47,107,240,.16);border-color:rgba(90,150,255,.6);color:#cfe0ff;box-shadow:none;
    }
    .act-btn.danger{background:rgba(214,64,110,.2);border-color:rgba(214,64,110,.55);color:#ffb3c6;box-shadow:none}
    .act-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}

    @media(max-width:1000px){
      #activityList,#homeActivities,#homeLate{grid-template-columns:1fr}
    }
    @media(max-width:560px){
      .act-card{grid-template-columns:auto minmax(0,1fr);}
      .act-side{grid-column:1 / -1;flex-direction:row;align-items:center;justify-content:space-between}
      .act-select{flex:1 1 100%}
    }

    /* Ventana de detalle */
    .act-detail{display:flex;flex-direction:column;gap:12px;font-size:13px;color:#c3cfe8}
    .act-detail .ad-top{display:flex;align-items:center;gap:14px}
    .act-detail .ad-top h3{margin:0 0 3px;font-size:17px;color:#f2f6ff;overflow-wrap:anywhere}
    .act-detail .ad-top p{margin:0;font-size:12px;color:#9fb0cf}
    .act-detail h5{margin:6px 0 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7e8aa5}
    .act-detail p.ad-text{margin:0;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
    .act-detail a.file-link{color:#8db8ff;font-weight:700;overflow-wrap:anywhere}
    .act-subs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto}
    .act-subs li{padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
    .act-subs small{display:block;color:#7e8aa5;margin-top:2px}
    .act-detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;justify-content:flex-end}

    /* Entregas: tabla con quién entregó, quién falta y la nota */
    #actDetailModal .modal-box{width:min(860px,94vw);max-width:none}
    .sub-filter{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}
    .sub-filter button{
      padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;
      color:#c9f7dd;background:rgba(37,160,93,.12);border:1px solid rgba(111,227,161,.4);
    }
    .sub-filter button.on{background:linear-gradient(180deg,#2fb86d,#1d8a52);color:#fff;border-color:transparent}
    .sub-wrap{overflow:auto;max-height:340px;border-radius:12px;border:1px solid rgba(255,255,255,.08)}
    .sub-table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:620px}
    .sub-table th{
      position:sticky;top:0;background:#0f1d3d;text-align:left;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;
      color:#7e8aa5;padding:8px 10px;
    }
    .sub-table td{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);vertical-align:middle}
    .sub-table td small{display:block;color:#7e8aa5;margin-top:2px}
    .sub-st{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid transparent}
    .sub-st.done{color:#7ff0df;background:rgba(20,184,166,.2);border-color:rgba(20,184,166,.5)}
    .sub-st.late{color:#fcd34d;background:rgba(245,158,11,.18);border-color:rgba(245,158,11,.5)}
    .sub-st.miss{color:#ffc9d4;background:rgba(214,64,110,.16);border-color:rgba(214,64,110,.45)}
    .sub-grade{display:flex;align-items:center;gap:6px}
    .sub-grade input{
      background:rgba(15,28,63,.8);border:1px solid rgba(80,200,130,.35);border-radius:8px;color:#eef2fb;font-size:12px;padding:6px 8px;
    }
    .sub-grade .gr-in{width:62px}
    .sub-grade .gr-fb{flex:1;min-width:120px}
    .ad-grade{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:rgba(47,184,109,.12);border:1px solid rgba(111,227,161,.4)}
    .ad-grade b{color:#6fe3a1;font-size:18px}
  `;
  document.head.appendChild(st);
}


/* ---------- Barra de filtros (se crea sola, no hace falta tocar el HTML) ---------- */

const ACT_FILTER = {q:"", subject:"", group:"", status:"all", date:"all"};

const ACT_ICONS = {
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M12 6.8C10 5.2 7.3 4.6 3.8 4.8v13.4c3.5-.2 6.2.4 8.2 2 2-1.6 4.7-2.2 8.2-2V4.8c-3.5-.2-6.2.4-8.2 2z"/><path d="M12 6.8v13.4"/></svg>',
  filter:'<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  chev:'<svg class="act-chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  upload:'<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6"/><circle cx="17.2" cy="9" r="2.6"/><path d="M17 14.2c2.6.2 4.2 1.9 4.6 4.6"/></svg>',
  edit:'<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>'
};

function ensureActivityToolbar(){

  const list = $("activityList");
  if(!list || $("actToolbar")) return;

  const wrap = document.createElement("div");
  wrap.id = "actToolbar";
  wrap.innerHTML = `
    <div class="act-toolbar">
      <label class="act-search">${ACT_ICONS.search}
        <input id="actSearch" type="search" placeholder="Buscar actividad o materia..." autocomplete="off">
      </label>
      <label class="act-select">${ACT_ICONS.book}
        <select id="actSubject"><option value="">Todas las materias</option></select>
      </label>
      <label class="act-select" id="actGroupBox">${ACT_ICONS.users}
        <select id="actGroup"><option value="">Todos los grupos</option></select>
      </label>
      <label class="act-select">${ACT_ICONS.cal}
        <select id="actDate">
          <option value="all" hidden disabled>Fecha de entrega</option>
          <option value="all">Cualquier fecha</option>
          <option value="late">Vencidas</option>
          <option value="week">Próximos 7 días</option>
          <option value="month">Este mes</option>
          <option value="none">Sin fecha</option>
        </select>
      </label>
    </div>
    <div class="act-tabs" id="actTabs"></div>`;
  list.insertAdjacentElement("beforebegin", wrap);

  // la búsqueda espera un instante a que termines de escribir (no redibuja con cada letra)
  let searchTimer = null;
  $("actSearch").addEventListener("input", e => {
    ACT_FILTER.q = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderActivityList, 160);
  });
  $("actSubject").addEventListener("change", e => { ACT_FILTER.subject = e.target.value; renderActivityList(); });
  $("actGroup").addEventListener("change", e => { ACT_FILTER.group = e.target.value; renderActivityList(); });
  $("actDate").addEventListener("change", e => { ACT_FILTER.date = e.target.value; renderActivityList(); });
  $("actTabs").addEventListener("click", e => {
    const b = e.target.closest(".act-tab");
    if(!b) return;
    ACT_FILTER.status = b.dataset.st;
    renderActivityList();
  });
}

function actMatchesDate(a){
  const f = ACT_FILTER.date;
  if(f === "all") return true;
  if(f === "none") return !a.date;
  if(!a.date) return false;
  const d = new Date(a.date + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if(f === "late")  return d < today;
  if(f === "week")  return d >= today && d <= new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  if(f === "month") return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  return true;
}

function renderActivityList(){

  const all = visibleActivities()
    .sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));

  // Materias que sí aparecen en la lista
  const subjSel = $("actSubject");
  if(subjSel){
    const present = [...new Set(all.map(a => a.subject))];
    const ordered = subjects.filter(s => present.includes(s)).concat(present.filter(s => !subjects.includes(s)));
    if(ACT_FILTER.subject && !ordered.includes(ACT_FILTER.subject)) ACT_FILTER.subject = "";
    const optsHtml = '<option value="">Todas las materias</option>' +
      ordered.map(s => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>').join("");
    if(subjSel.dataset.sig !== optsHtml){          // solo se reconstruye si cambió la lista de materias
      subjSel.innerHTML = optsHtml;
      subjSel.dataset.sig = optsHtml;
    }
    subjSel.value = ACT_FILTER.subject;
  }

  // Grupos que aparecen en la lista (el estudiante solo tiene el suyo, así que no ve este filtro)
  const groupSel = $("actGroup");
  if(groupSel){
    const box = $("actGroupBox");
    if(box) box.style.display = getRole() === "estudiante" ? "none" : "";
    const present = [...new Set(all.map(a => a.group).filter(Boolean))]
      .sort((x, y) => x.localeCompare(y, "es", {numeric:true}));
    if(ACT_FILTER.group && !present.includes(ACT_FILTER.group)) ACT_FILTER.group = "";
    const gHtml = '<option value="">Todos los grupos</option>' +
      present.map(g => '<option value="' + escapeHtml(g) + '">Grupo ' + escapeHtml(g) + '</option>').join("");
    if(groupSel.dataset.sig !== gHtml){
      groupSel.innerHTML = gHtml;
      groupSel.dataset.sig = gHtml;
    }
    groupSel.value = ACT_FILTER.group;
  }

  // Filtros (todos menos el estado: así los números de las pestañas son útiles)
  const q = normText(ACT_FILTER.q);
  const base = all.filter(a =>
    (!q || normText(a.title).includes(q) || normText(a.subject).includes(q) || normText(a.desc).includes(q)) &&
    (!ACT_FILTER.subject || normText(a.subject) === normText(ACT_FILTER.subject)) &&
    (!ACT_FILTER.group || !a.group || a.group === ACT_FILTER.group) &&
    actMatchesDate(a)
  );

  // Pestañas: Pendientes (a tiempo) · Vencidas · Entregadas  (entre las tres suman "Todas")
  const tabState = a => activityStatus(a) === "done" ? "done" : (activityDue(a) === "late" ? "late" : "pending");
  const nDone = base.filter(a => tabState(a) === "done").length;
  const nLate = base.filter(a => tabState(a) === "late").length;
  const nPending = base.length - nDone - nLate;

  const tabs = $("actTabs");
  if(tabs){
    const tab = (st, label, n) =>
      '<button type="button" class="act-tab' + (ACT_FILTER.status === st ? " active" : "") + '" data-st="' + st + '">' +
      label + ' <span class="act-count">' + n + '</span></button>';
    tabs.innerHTML = tab("all", "Todas", base.length) + tab("pending", "Pendientes", nPending) + tab("late", "Vencidas", nLate) + tab("done", "Entregadas", nDone);
  }
  const shown = ACT_FILTER.status === "all" ? base : base.filter(a => tabState(a) === ACT_FILTER.status);

  $("activityList").innerHTML = shown.length
    ? shown.map(card).join("")
    : '<div class="card empty">' + (all.length ? "No hay actividades con esos filtros." : "No hay actividades registradas.") + '</div>';
}

function renderActivities(){

  ensureActivityStyle();
  ensureActivityToolbar();
  renderActivityList();

  // Inicio: las 4 próximas pendientes (si ya entregó todo, las 4 próximas)
  const all = visibleActivities()
    .sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
  const notLate = all.filter(a => activityDue(a) !== "late");
  const pend = notLate.filter(a => activityStatus(a) === "pending");
  const next = (pend.length ? pend : notLate).slice(0, 4);

  $("homeActivities").innerHTML = next.map(card).join("")
    || '<div class="card empty">No hay actividades próximas.</div>';

  renderHomeLate(all.filter(a => activityDue(a) === "late").reverse());      // la que venció más reciente, primero
}

// Inicio: las vencidas van en su propio cuadro, aparte de las próximas
function renderHomeLate(late){

  const home = $("homeActivities");
  if(!home) return;

  let panel = $("homeLatePanel");

  if(!late.length){
    if(panel) panel.style.display = "none";
    return;
  }

  if(!panel){
    panel = document.createElement("section");
    panel.className = "home-panel late-panel";
    panel.id = "homeLatePanel";
    panel.innerHTML =
      '<div class="section-head"><h3>Vencidas <span class="late-count" id="homeLateCount"></span></h3>' +
      '<button type="button" class="btn secondary" onclick="goToLateActivities()">Ver todas</button></div>' +
      '<div id="homeLate"></div>';
    (home.closest(".home-panel") || home).insertAdjacentElement("afterend", panel);

    const st = document.createElement("style");
    st.textContent = `
      #inicio .late-panel{border-color:rgba(239,68,68,.45) !important}
      .late-count{
        display:inline-block;margin-left:8px;padding:1px 9px;border-radius:999px;font-size:12px;font-weight:700;
        color:#ffb4b4;background:rgba(239,68,68,.25);border:1px solid rgba(239,68,68,.55);vertical-align:2px;
      }
    `;
    document.head.appendChild(st);
  }

  panel.style.display = "";
  $("homeLateCount").textContent = late.length;
  $("homeLate").innerHTML = late.slice(0, 4).map(card).join("");
}

// "Ver todas" de Vencidas: abre Actividades ya filtradas
function goToLateActivities(){
  Object.assign(ACT_FILTER, {q:"", subject:"", group:"", date:"all", status:"late"});
  const q = $("actSearch"); if(q) q.value = "";
  const d = $("actDate"); if(d) d.value = "all";
  if(typeof goHome === "function") goHome("actividades");
  renderActivityList();
}

// Estudiante: al entrar, un aviso si tiene actividades que vencen hoy, mañana o en 2 días
function announceDueSoon(){

  if(getRole() !== "estudiante" || typeof showToast !== "function" || !currentUser) return;

  const key = "ade_duesoon_" + currentUser.username + "_" + new Date().toDateString();
  try{
    if(sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  }catch(e){}

  const soon = visibleActivities().filter(a => {
    if(activityStatus(a) !== "pending" || activityDue(a) === "late") return false;
    const d = activityDaysLeft(a);
    return d !== null && d >= 0 && d <= 2;
  });
  if(!soon.length) return;

  const today = soon.filter(a => activityDaysLeft(a) === 0).length;
  const title = today
    ? "Vence hoy: " + today + (today === 1 ? " actividad" : " actividades")
    : "Tienes " + soon.length + (soon.length === 1 ? " actividad" : " actividades") + " por vencer";
  const text = soon.slice(0, 2).map(a => a.title).join(" · ") + (soon.length > 2 ? " y " + (soon.length - 2) + " más" : "");
  showToast(title, text, "info", 7000);
}


/* ---------- Ventana "Ver actividad" ---------- */

let actDetailIndex = null;

function ensureActDetailModal(){

  if($("actDetailModal")) return;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "actDetailModal";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <h2>Actividad</h2>
        <button class="close" onclick="closeActDetail()">×</button>
      </div>
      <div id="actDetailBody"></div>
    </div>`;
  modal.addEventListener("click", e => { if(e.target === modal) closeActDetail(); });
  document.body.appendChild(modal);
}

function closeActDetail(){
  const m = $("actDetailModal");
  if(m) m.classList.remove("show");
  actDetailIndex = null;
}

function viewActivity(i){

  const a = activities[i];
  if(!a || !canSeeActivity(a)) return;

  ensureActivityStyle();
  ensureActDetailModal();
  actDetailIndex = i;

  const student = getRole() === "estudiante";
  const status = activityStatus(a);
  const badge = activityBadge(a);
  const mine = a.submissions && currentUser ? a.submissions[currentUser.username] : null;
  const subs = a.submissions ? Object.values(a.submissions) : [];
  const manage = canManageActivity(a);

  let html = '<div class="act-detail">' +
    '<div class="ad-top">' + subjectIcon(a.subject) +
      '<div style="min-width:0;flex:1"><h3>' + escapeHtml(a.title) + '</h3>' +
      '<p>' + escapeHtml(a.subject) + ' · Entrega: ' + formatDue(a) + (a.group ? ' · Grupo ' + escapeHtml(a.group) : '') + '</p></div>' +
      '<span class="act-badge ' + badge.key + '">' + badge.label + '</span>' +
    '</div>' +
    '<h5>Descripción</h5><p class="ad-text">' + escapeHtml(a.desc || "Sin descripción.") + '</p>';

  if(a.attachment) html += '<h5>Archivo de la actividad</h5><p class="ad-text">📎 ' + actFileLink(a.attachment) + '</p>';

  if(student){
    html += '<h5>Tu entrega</h5>' + (mine
      ? '<p class="ad-text">📤 ' + actFileLink(mine) + '<br><small style="color:#7e8aa5">Enviado: ' + escapeHtml(mine.submittedAt || "") +
        (mine.late ? ' · <b style="color:#fcd34d">Entregado tarde</b>' : '') + '</small></p>' +
        (mine.grade != null || mine.feedback
          ? '<div class="ad-grade">' + (mine.grade != null ? 'Nota: <b>' + Number(mine.grade).toFixed(1) + '</b>' : 'Sin nota todavía') +
            (mine.feedback ? '<p class="ad-text" style="margin-top:6px">' + escapeHtml(mine.feedback) + '</p>' : '') + '</div>'
          : '')
      : '<p class="ad-text">Aún no has entregado este trabajo.</p>');
  }else{
    // Todos los estudiantes del grupo con su estado (entregó / tarde / falta), el archivo y la nota
    const students = activityStudents(a);
    const subsMap = a.submissions || {};
    const rows = students.map(u => ({u:u.username, name:u.name || u.username, sub:subsMap[u.username] || null}));
    Object.keys(subsMap).forEach(k => {                      // entregas de cuentas que ya no están en la lista
      if(!students.some(u => u.username === k)) rows.push({u:k, name:subsMap[k].studentName || k, sub:subsMap[k]});
    });
    rows.sort((x, y) => (y.sub ? 1 : 0) - (x.sub ? 1 : 0) || x.name.localeCompare(y.name, "es"));

    const doneN = rows.filter(r => r.sub).length;
    const lateN = rows.filter(r => r.sub && r.sub.late).length;
    const canGrade = manage && !student;

    if(rows.length){
      const pct = Math.round(doneN / rows.length * 100);
      html += '<h5>Entregas' + (a.group ? ' · Grupo ' + escapeHtml(a.group) : '') + '</h5>' +
        '<div class="ad-prog"><b>' + doneN + ' de ' + rows.length + '</b>' +
        '<div class="ad-prog-bar"><i style="width:' + pct + '%"></i></div>' +
        '<span>' + pct + '%' + (lateN ? ' · ' + lateN + ' tarde' : '') + '</span></div>' +
        '<div class="sub-filter">' +
          '<button type="button" class="on" onclick="filterSubs(this,\'all\')">Todos (' + rows.length + ')</button>' +
          '<button type="button" onclick="filterSubs(this,\'done\')">Entregaron (' + doneN + ')</button>' +
          '<button type="button" onclick="filterSubs(this,\'miss\')">Faltan (' + (rows.length - doneN) + ')</button>' +
        '</div>';

      const MAX = 200;
      html += '<div class="sub-wrap"><table class="sub-table"><thead><tr><th>Estudiante</th><th>Estado</th><th>Entrega</th><th>Nota</th></tr></thead><tbody>' +
        rows.slice(0, MAX).map(r => {
          const st = !r.sub ? "miss" : (r.sub.late ? "late" : "done");
          const label = {miss:"Falta", late:"Tarde", done:"Entregó"}[st];
          const file = r.sub ? actFileLink(r.sub) + '<small>' + escapeHtml(r.sub.submittedAt || "") + '</small>' : '<span style="color:#7e8aa5">—</span>';
          let grade = '<span style="color:#7e8aa5">—</span>';
          if(r.sub && canGrade){
            grade = '<div class="sub-grade">' +
              '<input class="gr-in" type="number" min="0" max="5" step="0.1" placeholder="0–5" value="' + (r.sub.grade != null ? r.sub.grade : '') + '">' +
              '<input class="gr-fb" type="text" maxlength="300" placeholder="Comentario (opcional)" value="' + escapeHtml(r.sub.feedback || '') + '">' +
              ibtn("check", "Guardar nota", "saveGrade(this," + i + ")", "sm") + '</div>';
          }else if(r.sub && r.sub.grade != null){
            grade = '<b>' + Number(r.sub.grade).toFixed(1) + '</b>';
          }
          return '<tr data-u="' + escapeHtml(r.u) + '" data-st="' + (r.sub ? "done" : "miss") + '">' +
            '<td><b>' + escapeHtml(r.name) + '</b></td><td><span class="sub-st ' + st + '">' + label + '</span></td>' +
            '<td>' + file + '</td><td>' + grade + '</td></tr>';
        }).join("") + '</tbody></table></div>' +
        (rows.length > MAX ? '<p class="ad-text" style="margin-top:6px;color:#7e8aa5">Se muestran los primeros ' + MAX + ' de ' + rows.length + '.</p>' : '');
    }else{
      html += '<h5>Entregas</h5><p class="ad-text">Todavía no hay estudiantes registrados en este grupo.</p>';
    }
  }

  html += '</div><div class="act-detail-actions">';
  if(hasPermission("create","entrega")){
    html += '<button class="act-btn" onclick="closeActDetail();submitWork(' + i + ')">' + ACT_ICONS.upload + (mine ? "Cambiar entrega" : "Entregar trabajo") + '</button>';
  }
  if(hasPermission("edit","actividad") && manage){
    html += '<button class="act-btn ghost" onclick="closeActDetail();editActivity(' + i + ')">' + ACT_ICONS.edit + 'Editar</button>';
  }
  if(hasPermission("delete","actividad") && manage){
    html += '<button class="act-btn danger" onclick="closeActDetail();deleteActivity(' + i + ')">' + ACT_ICONS.trash + 'Borrar</button>';
  }
  html += '<button class="act-btn ghost" onclick="closeActDetail()">Cerrar</button></div>';

  $("actDetailBody").innerHTML = html;
  $("actDetailModal").classList.add("show");
}

// Filtro de la tabla de entregas: todos / entregaron / faltan
function filterSubs(btn, mode){
  const box = btn.closest("#actDetailBody") || document;
  box.querySelectorAll(".sub-filter button").forEach(b => b.classList.toggle("on", b === btn));
  box.querySelectorAll(".sub-table tbody tr").forEach(tr => {
    tr.style.display = (mode === "all" || tr.dataset.st === mode) ? "" : "none";
  });
}

// Guarda la nota (0 a 5) y el comentario de una entrega, y le avisa al estudiante
let gradeBusy = false;

async function saveGrade(btn, i){

  const a = activities[i];
  if(!a || getRole() === "estudiante" || !canManageActivity(a)) return denyPermission();

  const tr = btn.closest("tr");
  const username = tr && tr.dataset.u;
  const sub = a.submissions && a.submissions[username];
  if(!sub || gradeBusy) return;

  const raw = tr.querySelector(".gr-in").value.trim().replace(",", ".");
  const feedback = tr.querySelector(".gr-fb").value.trim().slice(0, 300);

  let grade = null;
  if(raw !== ""){
    grade = Number(raw);
    if(!isFinite(grade) || grade < 0 || grade > 5) return alert("La nota debe estar entre 0 y 5.");
    grade = Math.round(grade * 10) / 10;
  }

  const changed = grade !== (sub.grade != null ? sub.grade : null) || feedback !== (sub.feedback || "");
  if(!changed) return;

  gradeBusy = true;
  const r = await apiPost("api/entrega_calificar.php", {actividad:a.id, usuario:username, nota:grade, comentario:feedback});
  gradeBusy = false;

  if(!r.ok) return alert(r.error || "No se pudo guardar la nota.");
  reemplazarActividad(r.actividad);

  if(typeof notify === "function"){
    notify({
      type:"actividad", title:"Tu trabajo fue calificado",
      text: a.subject + ": " + a.title + (grade !== null ? " · Nota " + grade.toFixed(1) : ""),
      to: username, page:"actividades"
    });
  }
  render();                                    // la tarjeta de atrás se actualiza; la ventana sigue abierta
  if(typeof showToast === "function") showToast("Nota guardada", (sub.studentName || username) + (grade !== null ? ": " + grade.toFixed(1) : ""), "ok", 2500);
}
 
 
/* ---------- Entrega de trabajo del estudiante ---------- */
 
let studentSubmissionInput = null;
let submitBusy = false;
 
function submitWork(i){
 
  // Solo el estudiante entrega trabajos (profesores y administrador no)
  if(!requirePermission("create","entrega")) return;
 
  const activity = activities[i];
  if(!activity || !canSeeActivity(activity)) return;
 
  if(!studentSubmissionInput){
    studentSubmissionInput = document.createElement("input");
    studentSubmissionInput.type = "file";
    studentSubmissionInput.style.display = "none";
    document.body.appendChild(studentSubmissionInput);
  }
 
  studentSubmissionInput.value = "";
  studentSubmissionInput.onchange = async function(){
 
    const file = this.files && this.files[0];
    if(!file || submitBusy) return;
 
    // Cualquier tipo de archivo, con límite de tamaño.
    if(file.size > 10 * 1024 * 1024){
      alert("El archivo no puede superar los 10 MB.");
      return;
    }
 
    const datos = new FormData();
    datos.append("actividad", activity.id);
    datos.append("archivo", file, file.name);
 
    submitBusy = true;
    const r = await apiForm("api/entrega_guardar.php", datos);
    submitBusy = false;
 
    if(!r.ok) return alert(r.error || "No se pudo guardar tu entrega.");
 
    reemplazarActividad(r.actividad);
    render();
    alert("¡Trabajo entregado correctamente!");
  };
 
  studentSubmissionInput.click();
}
 
 
/* ---------- Ventana "Nueva actividad" ---------- */
 
function openModal(){
  if(!requirePermission("create","actividad")) return;
  $("modal").classList.add("show");
 
  // Profesor: solo sus materias y sus grupos. Administrador: todas.
  const role = getRole();
  const mySubjects = role === "profesor"
    ? subjects.filter(s => teacherSubjects().some(t => normText(t) === normText(s)))
    : subjects;
  $("newSubject").innerHTML = mySubjects.map(s => `<option>${s}</option>`).join("");
 
  // Hora límite (se crea sola, junto a la fecha)
  if(!$("newTime") && $("newDate")){
    const f = document.createElement("div");
    f.className = "field";
    f.innerHTML = '<label>Hora límite</label><input id="newTime" type="time" value="23:59">';
    ($("newDate").closest(".field") || $("newDate").parentElement).insertAdjacentElement("afterend", f);
  }

  let groupSel = $("newGroup");
  if(!groupSel){
    const field = document.createElement("div");
    field.className = "field";
    field.innerHTML = '<label>Grupo</label><select id="newGroup"></select>';
    const anchor = $("newSubject").closest(".field") || $("newSubject").parentElement;
    anchor.insertAdjacentElement("afterend", field);
    groupSel = $("newGroup");
  }
  const groups = role === "profesor" && teacherGroups()
    ? teacherGroups()
    : (window.ADE_CURRICULUM ? ADE_CURRICULUM.groups : []);
  groupSel.innerHTML = (role === "admin" ? '<option value="">Todos los grupos</option>' : "") +
    groups.map(g => `<option value="${g}">${g}</option>`).join("");
}
 
function closeModal(){
  $("modal").classList.remove("show");
}
 
 
/* ---------- Agregar / editar / borrar ---------- */
 
let actividadBusy = false;

async function addActivity(){
 
  if(!requirePermission("create","actividad")) return;
 
  const title = $("newTitle").value.trim();
  const fileInput = $("newAttachment");
  const file = fileInput ? fileInput.files[0] : null;
 
  if(!title) return alert("Escribe un título para la actividad.");
 
  const group = $("newGroup") ? $("newGroup").value : "";
  if(getRole() === "profesor" && !teacherCanUse($("newSubject").value, group)){
    return alert("Solo puedes crear actividades de tu materia y de tus grupos.");
  }
  if(file && file.size > 5 * 1024 * 1024) return alert("El archivo no puede superar los 5 MB.");
  if(actividadBusy) return;

  const date = $("newDate").value;
  const time = date ? (($("newTime") && $("newTime").value) || "23:59") : "";

  const datos = new FormData();
  datos.append("accion", "crear");
  datos.append("titulo", title);
  datos.append("materia", $("newSubject").value);
  datos.append("grupo", group);
  datos.append("fecha", date);
  datos.append("hora", time);
  datos.append("desc", $("newDesc").value);
  if(file) datos.append("archivo", file, file.name);

  actividadBusy = true;
  const r = await apiForm("api/actividad_guardar.php", datos);
  actividadBusy = false;

  if(!r.ok) return alert(r.error || "No se pudo guardar la actividad.");

  reemplazarActividad(r.actividad);

  if(typeof notify === "function"){
    notify({
      type: "actividad",
      title: "Nueva actividad de " + $("newSubject").value,
      text: title + (date ? " · Entrega: " + formatDate(date) + ($("newTime") && $("newTime").value ? " " + formatTime($("newTime").value) : "") : ""),
      groups: group ? [group] : null,
      page: "actividades"
    });
  }

  ["newTitle","newDesc","newDate"].forEach(id => $(id).value = "");
  if($("newTime")) $("newTime").value = "23:59";
  if(fileInput) fileInput.value = "";
  closeModal();
  render();
}
 
async function editActivity(i){
 
  if(!requirePermission("edit","actividad")) return;
 
  const a = activities[i];
  if(!canManageActivity(a)) return denyPermission();
 
  const title = prompt("Nuevo título:", a.title);
  if(title === null) return;
 
  const desc = prompt("Nueva descripción:", a.desc || "");
  if(desc === null) return;

  const datos = new FormData();
  datos.append("accion", "editar");
  datos.append("codigo", a.id);
  datos.append("titulo", title.trim() || a.title);
  datos.append("desc", desc);

  const r = await apiForm("api/actividad_guardar.php", datos);
  if(!r.ok) return alert(r.error || "No se pudo guardar la actividad.");

  reemplazarActividad(r.actividad);
  render();
}
 
async function deleteActivity(i){
  if(!requirePermission("delete","actividad")) return;
  if(!canManageActivity(activities[i])) return denyPermission();
  if(!confirm("¿Seguro que deseas borrar esta actividad?")) return;

  const datos = new FormData();
  datos.append("accion", "borrar");
  datos.append("codigo", activities[i].id);

  const r = await apiForm("api/actividad_guardar.php", datos);
  if(!r.ok) return alert(r.error || "No se pudo borrar la actividad.");

  activities.splice(i, 1);
  render();
}