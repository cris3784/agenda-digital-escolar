/* =========================================================
   HORARIO EDITABLE PARA ADMINISTRADOR
   Cada clase se dibuja según su hora real, así que las clases de
   distintos días que empiezan a la misma hora quedan niveladas.
   El descanso se dibuja como una franja centrada en todos los días.
   ========================================================= */

// Los horarios viven en la base de datos (api/horarios.php): una lista de clases por grupo.
// "schedule" es el horario que se está mostrando ahora (el de un grupo, o las clases del profesor).
let schedule = [];

/* ---------- Un horario por grupo (viene del servidor) ---------- */

let groupSchedules = {};
let scheduleGroup = "";           // grupo que está viendo/editando el administrador
let scheduleMode = "legacy";      // "group" | "teacher" | "legacy"

async function cargarHorariosServidor(){
  try{
    const resp = await fetch("api/horarios.php", {credentials:"same-origin", cache:"no-store"});
    const d = await resp.json();
    if(!d || !d.ok || !d.horarios || typeof d.horarios !== "object") return false;
    groupSchedules = d.horarios;
    return true;
  }catch(e){
    return false;
  }
}

// Vuelve a pedir los horarios y redibuja la pantalla
async function recargarHorarios(){
  const ok = await cargarHorariosServidor();
  if(ok && typeof currentUser !== "undefined" && currentUser && typeof render === "function") render();
  return ok;
}

// Elige el horario que le toca a la cuenta que inició sesión:
//  estudiante = el de su grupo · profesor = sus clases de todos sus grupos · admin = el grupo que elija
function ttPrepare(){

  const role = getRole();
  const groups = Object.keys(groupSchedules);
  scheduleMode = "legacy";
  schedule = [];

  if(!groups.length) return;

  if(role === "estudiante"){
    const g = studentGroup();
    if(groupSchedules[g]){ schedule = groupSchedules[g]; scheduleMode = "group"; scheduleGroup = g; }
    return;
  }

  if(role === "profesor"){
    if(!currentUser) return;
    const mine = currentUser.username;
    const mySubs = teacherSubjects();
    const myGroups = teacherGroups() || groups;            // sin grupos fijos = todos los que el servidor mandó
    schedule = ["Lunes","Martes","Miércoles","Jueves","Viernes"].map(function(day){
      const classes = [];
      myGroups.forEach(function(g){
        const d = (groupSchedules[g] || []).find(function(x){ return x.day === day; });
        if(d) d.classes.forEach(function(c){
          // clases que tiene asignadas, o de cualquiera de sus materias en ese grupo
          if(c.teacher === mine || mySubs.some(function(s){ return ttClassIsOfSubject(c.subject, s); })){
            classes.push(Object.assign({}, c, {group:g}));
          }
        });
      });
      return {day:day, classes:classes};
    });
    scheduleMode = "teacher";
    return;
  }

  if(role === "admin"){
    if(!groupSchedules[scheduleGroup]) scheduleGroup = groups[0];
    schedule = groupSchedules[scheduleGroup];
    scheduleMode = "group";
  }
}

// Selector de grupo (solo administrador)
function ttGroupPicker(el){

  let box = document.getElementById("scheduleGroupPicker");

  if(getRole() !== "admin" || scheduleMode !== "group"){
    if(box) box.style.display = "none";
    return;
  }

  if(!box){
    box = document.createElement("div");
    box.id = "scheduleGroupPicker";
    box.style.cssText = "display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:13px";
    el.insertAdjacentElement("beforebegin", box);
  }

  box.style.display = "flex";
  box.innerHTML = '<label for="scheduleGroupSelect">Grupo:</label><select id="scheduleGroupSelect" style="padding:6px 10px;border-radius:8px">' +
    Object.keys(groupSchedules).map(function(g){
      return '<option value="' + g + '"' + (g === scheduleGroup ? ' selected' : '') + '>' + g + '</option>';
    }).join("") + '</select>';

  document.getElementById("scheduleGroupSelect").onchange = function(){
    scheduleGroup = this.value;
    renderSchedule();
  };
}


/* ---------------------------------------------------------
   TAMAÑO: píxeles por minuto.
   Más pequeño = número menor (ej. 0.9). Más grande = mayor (ej. 1.4).
   --------------------------------------------------------- */
const TT_SCALE = 1.5;          // tamaño fijo, igual en todas las pantallas (calendario y horario con la misma escala)
const TT_DAY_START = 6 * 60;           // 6:00
const TT_DAY_END = 11 * 60 + 45;       // 11:45

/* ---------------------------------------------------------
   DESCANSO: franja centrada que cruza todos los días.
   Cambia la hora si tu descanso es otra (formato "8:37 - 9:07").
   Para quitar el descanso escribe:  const TT_BREAK = null;
   --------------------------------------------------------- */
const TT_BREAK = {label:"DESCANSO", time:"8:37 - 9:07"};


/* ---------- Horario del profesor: solo sus clases ---------- */

// Nombres cortos del horario -> materia de la lista de Materias
const TT_SUBJECT_ALIASES = {
  "tec e inf":"Tecnología", "quimica":"Química", "ingles":"Inglés", "fisica":"Física",
  "matematicas":"Matemáticas", "leng castellana":"Castellano", "filosofia":"Filosofía",
  "educ religiosa":"Religión", "ed fisica 11 ts":"Educación Física", "educ artistica":"Artística",
  "et y val humanos":"Ética", "soc_cat_paz":"Sociales", "emprendimiento":"Emprendimiento",
  "cien econ y pol":"Economía"
};

// Actividades de la materia de esta clase (y de su grupo): el profesor ve cuántas ha puesto,
// el estudiante cuántas tiene pendientes.
function ttClassActs(c){
  if(typeof visibleActivities !== "function" || getRole() === "admin") return 0;
  const g = c.group || (scheduleMode === "group" ? scheduleGroup : "");
  const onlyPending = getRole() === "estudiante" && typeof activityStatus === "function";
  return visibleActivities().filter(function(a){
    return ttClassIsOfSubject(c.subject, a.subject) &&
      (!g || !a.group || a.group === g) &&
      (!onlyPending || activityStatus(a) === "pending");
  }).length;
}

function ttNorm(t){
  return String(t == null ? "" : t).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ¿Esta clase del horario es de la materia del profesor?
function ttClassIsOfSubject(classSubject, teacherSubject){
  const mine = ttNorm(teacherSubject);
  if(!mine) return false;
  const cls = ttNorm(classSubject);
  const alias = TT_SUBJECT_ALIASES[cls];
  if(alias && ttNorm(alias) === mine) return true;
  return cls === mine;
}


/* ---------- Utilidades ---------- */

function ttEsc(t){
  return String(t == null ? "" : t).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// Convierte "6:00 - 7:45" (o "6:00 AM - 7:45 AM") en minutos {start, end}
function ttParseTime(str){

  const m = String(str || "").match(
    /(\d{1,2})[:.](\d{2})\s*([ap]\.?\s?m\.?)?\s*(?:-|–|—|a|hasta)\s*(\d{1,2})[:.](\d{2})\s*([ap]\.?\s?m\.?)?/i
  );

  if(!m) return null;

  const sm = Number(m[2]);
  const em = Number(m[5]);
  const ss = (m[3] || "").toLowerCase().charAt(0);
  const es = (m[6] || "").toLowerCase().charAt(0);

  function to24(h, suf){
    if(suf === "p" && h < 12) return h + 12;
    if(suf === "a" && h === 12) return 0;
    if(!suf && h < 6) return h + 12;   // 1:00 sin AM/PM = tarde
    return h;
  }

  const sh = to24(Number(m[1]), ss);
  const eh = to24(Number(m[4]), es || ss);

  if(sh > 23 || eh > 23 || sm > 59 || em > 59) return null;

  const start = sh * 60 + sm;
  let end = eh * 60 + em;

  if(end <= start && !es && end + 720 > start && end < 720){
    end += 720;
  }

  return end > start ? {start:start, end:end} : null;

}

// Minutos -> "7:45"
function ttFmt(min){
  const h = Math.floor(min / 60);
  const mm = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ":" + String(mm).padStart(2,"0");
}

function ttHourLabel(h){
  const x = h % 12 === 0 ? 12 : h % 12;
  return x + ":00";
}


/* ---------- Ayudas visuales (iconos, colores, fechas) ---------- */

// Filas de clase (periodos) que se ven en la columna "Hora"
const TT_PERIODS = [[360,412],[412,465],[465,517],[547,600],[600,652],[652,705]];

const TT_DAY_INDEX = {lunes:0, martes:1, miercoles:2, jueves:3, viernes:4, sabado:5, domingo:6};

// Color de la materia (el mismo que usa materias.js)
function ttColor(name){
  try{
    if(typeof subjectIconKey === "function" && typeof SUBJECT_ICONS !== "undefined"){
      const k = subjectIconKey(name);
      if(k && SUBJECT_ICONS[k]) return SUBJECT_ICONS[k].c;
    }
  }catch(e){}
  let h = 0;
  String(name || "").split("").forEach(function(ch){ h = (h * 31 + ch.charCodeAt(0)) % 360; });
  return "hsl(" + h + " 52% 46%)";
}

// "LENG CASTELLANA" -> "Castellano"
function ttSubjectName(raw){
  return TT_SUBJECT_ALIASES[ttNorm(raw)] || raw;
}

function ttIconHtml(name){
  return typeof subjectIcon === "function" ? subjectIcon(name, "sm") : "";
}

// Fecha de cada día de la semana y cuál se resalta.
//  · Lunes a viernes: se marca el día de hoy con "HOY" (y la clase que está en curso).
//  · Sábado y domingo no hay clases: se muestra la semana siguiente y se resalta el lunes
//    ("MAÑANA" el domingo, "PRÓXIMO" el sábado) para que siempre se vea un día marcado.
// today = columna resaltada · now = es realmente hoy · badge = texto de la etiqueta
function ttWeekInfo(days){
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;                       // lunes = 0 ... domingo = 6
  const weekend = dow >= 5;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + (weekend ? 7 : 0));
  return days.map(function(d){
    const idx = TT_DAY_INDEX[ttNorm(d.day)];
    if(idx === undefined) return {label:"", today:false, now:false, badge:""};
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const isNow = date.toDateString() === now.toDateString();
    const isNext = weekend && idx === 0;
    return {
      label: date.toLocaleDateString("es-CO", {day:"numeric", month:"short", year:"numeric"}),
      today: isNow || isNext,
      now: isNow,
      badge: isNow ? "HOY" : (isNext ? (dow === 6 ? "MAÑANA" : "PRÓXIMO") : "")
    };
  });
}


/* ---------- Estilos propios del horario ---------- */

function ttEnsureStyle(){

  if(document.getElementById("scheduleExtraStyle")) return;

  const st = document.createElement("style");
  st.id = "scheduleExtraStyle";
  st.textContent = `
    #scheduleList{display:block;overflow-x:auto;overflow-y:hidden;padding-bottom:14px}

    .tt{
      display:grid;
      column-gap:8px;
      align-items:start;
      min-width:780px;
    }

    /* Encabezado de cada día */
    .tt-hora{
      align-self:center;
      text-align:center;
      font-size:12px;
      font-weight:700;
      color:#c7cede;
    }
    .tt-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:6px;
      padding:9px 12px;
      margin-bottom:6px;
      background:linear-gradient(180deg,#141d36,#0f1730);
      border:1px solid #26304a;
      border-radius:12px;
    }
    .tt-head .tt-dn{display:block;font-size:14px;font-weight:700;color:#eef2fb}
    .tt-head small{display:block;margin-top:2px;font-size:10px;color:#7e8aa5}
    .tt-head > div:first-child{min-width:0}
    .tt-head small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tt-tools{flex:none}
    .tt-head.today{
      border-color:#3d7bff;
      background:linear-gradient(180deg,#18284f,#112042);
      box-shadow:0 0 0 1px rgba(61,123,255,.35), 0 6px 20px rgba(47,107,240,.28);
    }
    .tt-hoy{
      background:#2f6bf0;
      color:#fff;
      font-size:9px;
      font-weight:700;
      letter-spacing:.8px;
      padding:3px 8px;
      border-radius:999px;
    }
    .tt-tools{display:flex;gap:3px;align-items:center}

    /* Columna de horas */
    .tt-axis{position:relative}
    .tt-axis .tt-per{
      position:absolute;
      left:0;
      right:6px;
      display:flex;
      align-items:center;
      justify-content:flex-end;
      text-align:right;
      font-size:10px;
      color:#8a97b3;
      white-space:nowrap;
    }
    .tt-axis .tt-per.tick{transform:translateY(-7px);height:14px}

    /* Columna de cada día */
    .tt-cell{
      background:#0e1528;
      border-radius:12px;
      overflow:hidden;
      box-shadow:inset 0 0 0 1px #222c45;
    }
    .tt-cell.today{
      background:rgba(47,107,240,.07);
      box-shadow:inset 0 0 0 1px rgba(80,140,255,.55);
    }
    .tt-body{position:relative}

    /* Descanso */
    .tt-break{
      grid-column:2 / -1;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      margin:8px 0;
      background:linear-gradient(90deg,rgba(47,107,240,.10),rgba(47,107,240,.26),rgba(47,107,240,.10));
      border:1px solid rgba(80,130,255,.4);
      border-radius:12px;
      color:#cfe0ff;
    }
    .tt-break svg{width:13px;height:13px;fill:currentColor;opacity:.85}
    .tt-break b{font-size:11px;letter-spacing:2px}
    .tt-break small{font-size:11px;color:#9bb3e6}

    /* Tarjeta de clase */
    .tt-class{
      --c:#2f6bf0;
      position:absolute;
      left:4px;
      right:4px;
      display:flex;
      align-items:center;
      gap:9px;
      padding:0 10px 0 8px;
      background:color-mix(in srgb, var(--c) 13%, #0e1528);
      border:1px solid color-mix(in srgb, var(--c) 40%, #1d2640);
      border-left:3px solid var(--c);
      border-radius:10px;
      overflow:hidden;
      line-height:1.25;
    }
    .tt .tt-class .subj-ico{width:30px;height:30px;border-radius:9px;flex:none;box-shadow:0 3px 8px color-mix(in srgb, var(--c) 35%, transparent)}
    .tt-txt{min-width:0;flex:1}
    .tt-name{
      display:block;
      font-size:12px;
      font-weight:700;
      color:#eef2fb;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .tt-room{
      display:block;
      margin-top:1px;
      font-size:10px;
      color:#8995ad;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .tt-acts{
      display:inline-block; margin-top:3px; max-width:100%;
      font:700 9px Arial,Helvetica,sans-serif; line-height:1;
      padding:3px 7px; border-radius:999px; cursor:pointer;
      color:#9ff0c4; background:rgba(34,197,94,.14); border:1px solid rgba(34,197,94,.45);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .tt-acts:hover{background:rgba(34,197,94,.28)}
    .tt-live{
      position:absolute;
      right:6px;
      bottom:5px;
      background:rgba(47,107,240,.35);
      border:1px solid rgba(110,160,255,.6);
      color:#dbe8ff;
      font-size:8px;
      font-weight:700;
      padding:2px 6px;
      border-radius:999px;
    }
    .tt-class.live{box-shadow:0 0 0 1px rgba(110,160,255,.55), 0 4px 14px rgba(47,107,240,.3)}

    .tt-class.has-actions .tt-name,
    .tt-class.has-actions .tt-room{padding-right:44px}

    .tt-class.flow{
      position:static;
      margin:4px 4px 0;
      min-height:46px;
    }

    .tt-extra{
      background:#0e1528;
      border-radius:12px;
      box-shadow:inset 0 0 0 1px #222c45;
      padding-bottom:4px;
      margin-top:8px;
    }
    .tt-extra small{display:block;color:#7e8aa5;font-size:10px;padding:6px 10px 0}

    #addScheduleDayBtn{display:none !important}
    .tt-actions{
      position:absolute;
      top:3px;
      right:3px;
      display:flex;
      gap:2px;
    }

    .tt-ico{
      background:#202a43;
      color:#dfe5f1;
      border-radius:5px;
      width:20px;
      height:20px;
      padding:0;
      font-size:10px;
      line-height:20px;
      text-align:center;
    }

    .tt-ico.danger{background:#49202a}
    .tt-ico:hover{filter:brightness(1.25)}
  `;

  document.head.appendChild(st);

}


/* ---------- Dibujar el horario ---------- */

function renderSchedule(){

  ttEnsureStyle();

  const el = document.getElementById("scheduleList");
  if(!el) return;

  ttPrepare();
  ttGroupPicker(el);

  if(!schedule.length){
    el.innerHTML = '<div class="card empty">No hay días en el horario.</div>';
    return;
  }

  const isAdmin   = getRole() === "admin";
  const canEdit   = isAdmin && hasPermission("edit","horario");
  const canDelete = isAdmin && hasPermission("delete","horario");
  const canCreate = isAdmin && hasPermission("create","horario");

  // Leer las horas de todas las clases
  let parsed = schedule.map(function(d){
    return d.classes.map(function(c, ci){
      return {c:c, ci:ci, t:ttParseTime(c.time), segs:[]};
    });
  });

  let min = Infinity;
  let max = -Infinity;

  parsed.forEach(function(day){
    day.forEach(function(x){
      if(x.t){
        min = Math.min(min, x.t.start);
        max = Math.max(max, x.t.end);
      }
    });
  });

  // Siempre se muestra la jornada completa (6:00 a 11:45), aunque el profesor tenga pocas clases
  if(!isFinite(min)){ min = TT_DAY_START; max = TT_DAY_END; }
  min = Math.min(min, TT_DAY_START);
  max = Math.max(max, TT_DAY_END);

  // Profesor: solo ve las clases de su materia (la escala de horas es la misma para todos)
  const isTeacher = getRole() === "profesor" && scheduleMode === "legacy";   // cuentas antiguas: filtra por materia
  const mySubjects = isTeacher && currentUser ? teacherSubjects() : [];
  const teacherSubject = teacherSubjectsText();

  if(isTeacher){
    if(!mySubjects.length){
      el.innerHTML = '<div class="card empty">Aún no tienes una materia asignada. Pídele al administrador que la agregue a tu cuenta.</div>';
      return;
    }
    parsed = parsed.map(function(day){
      return day.filter(function(x){
        return mySubjects.some(function(s){ return ttClassIsOfSubject(x.c.subject, s); });
      });
    });
  }

  const from = Math.floor(min / 60) * 60;
  const to = Math.ceil(max / 60) * 60;

  // Tamaño fijo del horario
  const S = TT_SCALE;

  // Descanso: parte el horario en "antes" y "después"
  const br = TT_BREAK ? ttParseTime(TT_BREAK.time) : null;
  const hasBreak = !!(br && br.start > from && br.end < to);

  const regions = hasBreak
    ? [{a:from, b:br.start, cls:"top"}, {a:br.end, b:to, cls:"bottom"}]
    : [{a:from, b:to, cls:"full"}];

  // Repartir cada clase en los tramos (una clase que cruza el descanso se corta en dos)
  parsed.forEach(function(day){
    day.forEach(function(x){
      if(!x.t) return;
      regions.forEach(function(rg, ri){
        const s = Math.max(x.t.start, rg.a);
        const e = Math.min(x.t.end, rg.b);
        if(e > s) x.segs.push({ri:ri, s:s, e:e});
      });
    });
  });

  const week = ttWeekInfo(schedule);
  const nowD = new Date();
  const nowMin = nowD.getHours() * 60 + nowD.getMinutes();

  function classHtml(x, di, style, flow, timeText, withActions, seg){

    const c = x.c;
    const showActions = withActions && (canEdit || canDelete);
    const cls = "tt-class" + (flow ? " flow" : "") + (showActions ? " has-actions" : "");

    let actions = "";

    if(showActions){
      actions = '<div class="tt-actions">' +
        (canEdit ? ibtn("edit", "Editar clase", "editScheduleItem(" + di + "," + x.ci + ")", "sm") : '') +
        (canDelete ? ibtn("trash", "Borrar clase", "deleteScheduleItem(" + di + "," + x.ci + ")", "sm") : '') +
        '</div>';
    }

    const name = ttSubjectName(c.subject);
    const live = !!(seg && week[di] && week[di].now && nowMin >= seg.s && nowMin < seg.e);
    const roomText = c.room ? (/^sal[oó]n/i.test(String(c.room).trim()) ? String(c.room).trim() : "Salón " + c.room) : "";
    const nActs = ttClassActs(c);
    const actsTxt = nActs
      ? (getRole() === "estudiante" ? nActs + (nActs === 1 ? " pendiente" : " pendientes")
                                    : nActs + (nActs === 1 ? " actividad" : " actividades"))
      : "";
    const sub = flow ? (timeText + (roomText ? " · " + roomText : "")) : roomText;

    return '<div class="' + cls + (live ? " live" : "") + '" style="--c:' + ttColor(name) + ';' + style + '" title="' +
      ttEsc(c.subject) + ' · ' + ttEsc(c.time) + ' · ' + ttEsc(c.room) + '">' +
      ttIconHtml(name) +
      '<div class="tt-txt"><b class="tt-name">' + ttEsc(name) + '</b>' +
      '<span class="tt-room">' + ttEsc(sub) + '</span>' +
      (actsTxt ? '<button type="button" class="tt-acts" data-s="' + ttEsc(name) + '" title="Ver actividades de ' + ttEsc(name) +
        '" onclick="goToSubjectActivities(this.dataset.s)">' + ttEsc(actsTxt) + '</button>' : '') +
      '</div>' +
      (live ? '<span class="tt-live">En curso</span>' : '') +
      actions +
      '</div>';

  }

  let html = '<div class="tt" style="grid-template-columns:74px repeat(' + schedule.length + ',minmax(0,1fr))">';

  // Fila 1: encabezados de los días (con fecha y "HOY")
  html += '<div class="tt-hora">Hora</div>';

  schedule.forEach(function(d, di){
    const w = week[di] || {label:"", today:false, now:false, badge:""};
    html += '<div class="tt-head' + (w.today ? ' today' : '') + '">' +
      '<div><span class="tt-dn">' + ttEsc(d.day) + '</span>' + (w.label ? '<small>' + ttEsc(w.label) + '</small>' : '') + '</div>' +
      '<span class="tt-tools">' +
      (w.today ? '<span class="tt-hoy">' + ttEsc(w.badge || "HOY") + '</span>' : '') +
      (canCreate ? ibtn("plus", "Agregar clase", "addScheduleItem(" + di + ")", "sm") : '') +
      '</span></div>';
  });

  // Tramos: (antes del descanso) + franja de descanso + (después del descanso)
  const hourPx = 60 * S;

  regions.forEach(function(rg, ri){

    // Franja de descanso, centrada, entre los dos tramos
    if(hasBreak && ri === 1){
      html += '<div></div>';
      html += '<div class="tt-break" style="height:' + Math.round((br.end - br.start) * S) + 'px">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' +
        '<b>' + ttEsc(TT_BREAK.label || "DESCANSO") + '</b>' +
        '<small>' + ttFmt(br.start) + ' - ' + ttFmt(br.end) + '</small></div>';
    }

    const bodyH = Math.round((rg.b - rg.a) * S);
    const firstHour = (Math.floor(rg.a / 60) + 1) * 60;
    const off = ((firstHour - rg.a) * S - hourPx).toFixed(2);

    // Eje de horas
    html += '<div class="tt-axis' + (rg.cls === "bottom" ? " bottom" : "") + '" style="height:' + bodyH + 'px">';

    const pers = TT_PERIODS.filter(function(p){ return p[0] >= rg.a && p[1] <= rg.b; });

    if(pers.length){
      pers.forEach(function(p){
        html += '<span class="tt-per" style="top:' + Math.round((p[0] - rg.a) * S) + 'px;height:' +
          Math.round((p[1] - p[0]) * S) + 'px">' + ttFmt(p[0]) + ' - ' + ttFmt(p[1]) + '</span>';
      });
    }else{
      for(let t = Math.ceil(rg.a / 60) * 60; t <= rg.b; t += 60){
        html += '<span class="tt-per tick" style="top:' + Math.round((t - rg.a) * S) + 'px">' + ttHourLabel(t / 60) + '</span>';
      }
    }

    html += '</div>';

    // Una columna por día
    parsed.forEach(function(day, di){

      html += '<div class="tt-cell ' + rg.cls + (week[di] && week[di].today ? ' today' : '') + '"><div class="tt-body" style="height:' + bodyH +
        'px;--h:' + hourPx.toFixed(2) + 'px;--off:' + off + 'px">';

      day.forEach(function(x){

        const seg = x.segs.find(function(s){ return s.ri === ri; });
        if(!seg) return;

        const top = ((seg.s - rg.a) * S + 1).toFixed(1);
        const h = Math.max((seg.e - seg.s) * S - 2, 4).toFixed(1);
        const full = seg.s === x.t.start && seg.e === x.t.end;
        const timeText = full ? x.c.time : ttFmt(seg.s) + " - " + ttFmt(seg.e);
        const first = x.segs[0].ri === ri;

        html += classHtml(x, di, 'top:' + top + 'px;height:' + h + 'px', false, timeText, first, seg);

      });

      html += '</div></div>';

    });

  });

  // Clases que no se pudieron ubicar (sin hora válida o dentro del descanso)
  const anyLoose = parsed.some(function(day){
    return day.some(function(x){ return x.segs.length === 0; });
  });

  if(anyLoose){

    html += '<div></div>';

    parsed.forEach(function(day, di){

      const loose = day.filter(function(x){ return x.segs.length === 0; });

      if(!loose.length){
        html += '<div></div>';
        return;
      }

      html += '<div class="tt-extra"><small>Sin ubicar en el horario</small>';

      loose.forEach(function(x){
        html += classHtml(x, di, '', true, x.c.time, true);
      });

      html += '</div>';

    });

  }

  html += '</div>';

  if(isTeacher){
    html = '<p class="muted" style="margin:0 0 10px">Horario de ' + ttEsc(teacherSubject) +
      ': solo aparecen los días y horas en que te toca clase.</p>' + html;
  }

  if(scheduleMode === "group" && getRole() === "estudiante"){
    html = '<p class="muted" style="margin:0 0 10px">Horario del grupo ' + ttEsc(scheduleGroup) + '.</p>' + html;
  }
  if(scheduleMode === "teacher"){
    html = '<p class="muted" style="margin:0 0 10px">Tus clases de ' + ttEsc(teacherSubjectsText()) +
      ' (grupo ' + ttEsc(teacherGroups().join(", ")) + ').</p>' + html;
  }

  el.innerHTML = html;

}


/* ---------- Agregar / editar / borrar ---------- */

// Avisa a los del grupo (y a sus profesores) que el horario cambió
function ttNotifyChange(what){
  if(typeof notify !== "function") return;
  const group = scheduleMode === "group" && scheduleGroup ? scheduleGroup : "";
  notify({
    type: "horario",
    title: "Cambio en el horario" + (group ? " del grupo " + group : ""),
    text: what,
    groups: group ? [group] : null,
    page: "horario"
  });
}

let horarioBusy = false;

// Convierte lo escrito (acepta los nombres cortos del horario) a una materia de la lista
function ttResolveSubject(text){
  const n = ttNorm(ttSubjectName(text));
  if(!n) return null;
  return subjects.find(function(s){ return ttNorm(s) === n; }) || null;
}

function ttToHHMM(min){
  return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
}

// Guarda un cambio en el servidor y vuelve a pedir los horarios. Devuelve true si salió bien.
async function guardarHorario(datos){
  if(horarioBusy) return false;
  horarioBusy = true;
  const r = await apiPost("api/horario_guardar.php", datos);
  horarioBusy = false;
  if(!r.ok){ alert(r.error || "No se pudo guardar el horario."); return false; }
  await recargarHorarios();
  return true;
}

// Pide materia, hora y salón en una ventana. Devuelve los datos listos para enviar, o null si se canceló.
async function ttAskClass(c){

  const current = c ? ttResolveSubject(c.subject) : null;
  const t0 = c ? ttParseTime(c.time) : null;

  const r = await adeForm({
    title: c ? "Editar clase" : "Agregar clase", icon: "🕐", ok: c ? "Guardar cambios" : "Agregar",
    fields: [
      {id:"materia", label:"Materia", type:"select", options:subjects.slice(), value:current || subjects[0] || ""},
      {id:"inicio", label:"Hora de inicio", type:"time", value:t0 ? ttToHHMM(t0.start) : "", half:true, required:true},
      {id:"fin", label:"Hora de fin", type:"time", value:t0 ? ttToHHMM(t0.end) : "", half:true, required:true},
      {id:"salon", label:"Salón / lugar (opcional)", type:"text", maxlength:20, value:c ? c.room : "", placeholder:"Ej. 201"}
    ],
    validate: v => v.inicio >= v.fin ? "La clase debe terminar después de empezar." : null
  });
  if(!r) return null;

  const fmt = hhmm => { const p = hhmm.split(":").map(Number); return (p[0] % 12 === 0 ? 12 : p[0] % 12) + ":" + String(p[1]).padStart(2, "0"); };
  return {materia:r.materia, inicio:r.inicio, fin:r.fin, salon:r.salon.trim(), hora:fmt(r.inicio) + " - " + fmt(r.fin)};
}

async function addScheduleItem(di){
  if(!requirePermission("create","horario")) return;
  if(scheduleMode !== "group" || !scheduleGroup) return;
  const q = await ttAskClass(null);
  if(!q) return;
  const day = schedule[di].day;
  const ok = await guardarHorario({accion:"agregar", grupo:scheduleGroup, dia:day, materia:q.materia, inicio:q.inicio, fin:q.fin, salon:q.salon});
  if(ok) ttNotifyChange("Se agregó " + q.materia + " el " + day + " (" + q.hora + ").");
}

async function editScheduleItem(di,ci){
  if(!requirePermission("edit","horario")) return;
  const c = schedule[di].classes[ci];
  if(!c || !c.id) return;
  const q = await ttAskClass(c);
  if(!q) return;
  const day = schedule[di].day;
  const ok = await guardarHorario({accion:"editar", codigo:c.id, materia:q.materia, inicio:q.inicio, fin:q.fin, salon:q.salon});
  if(ok) ttNotifyChange("Cambió " + q.materia + " el " + day + " (" + q.hora + ").");
}

async function deleteScheduleItem(di,ci){
  if(!requirePermission("delete","horario")) return;
  const c = schedule[di].classes[ci];
  if(!c || !c.id) return;
  if(!await adeConfirm("Se quitará esta clase del horario.", {title:"Borrar clase", ok:"Sí, borrar", danger:true})) return;
  const day = schedule[di].day;
  const ok = await guardarHorario({accion:"borrar", codigo:c.id});
  if(ok) ttNotifyChange("Se quitó " + c.subject + " del " + day + ".");
}

// El horario usa siempre los días de lunes a viernes (los botones de días no se muestran)
function addScheduleDay(){ alert("El horario usa los días de lunes a viernes."); }


// Actualiza "En curso" y "HOY" cada minuto (solo si el horario está a la vista)
setInterval(function(){
  const el = document.getElementById("scheduleList");
  const sel = document.getElementById("scheduleGroupSelect");
  if(!document.hidden && el && el.offsetParent !== null && document.activeElement !== sel && typeof renderSchedule === "function") renderSchedule();
}, 60000);