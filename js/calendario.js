/* =========================================================
   CALENDARIO ESCOLAR
   Qué hace: Muestra el calendario del mes; al hacer clic en un día se ven sus eventos y actividades a la derecha. Quien tiene permiso puede crear, editar y borrar eventos.
   Por qué: Es el lugar donde el colegio y los profesores avisan fechas importantes. Este archivo crea solo su formulario y sus estilos, así no hace falta agregar nada al HTML.
   ========================================================= */

/* ---------- Los eventos ----------
   Qué hace: Guarda en un objeto los eventos organizados por día (ej. "2026-10-23").
   Por qué: Buscar los eventos de un día así es rápido; los datos reales vienen de la base de datos. */
// Los eventos viven en la base de datos (api/eventos.php): {"2026-10-23": [{id, title, desc, groups?, by, byName, byRole, subject}]}
let calendarEvents = {};

/* ---------- Traer eventos del servidor ----------
   Qué hace: Pide al servidor todos los eventos que le corresponden a esta cuenta.
   Por qué: Los eventos están en la base de datos para que todos vean lo mismo. */
async function cargarEventosServidor(){
  try{
    const resp = await fetch("api/eventos.php", {credentials:"same-origin", cache:"no-store"});
    const d = await resp.json();
    if(!d || !d.ok || !d.eventos || typeof d.eventos !== "object") return false;
    calendarEvents = d.eventos;
    return true;
  }catch(e){
    return false;
  }
}

/* ---------- Recargar eventos ----------
   Qué hace: Vuelve a pedir los eventos y redibuja la pantalla.
   Por qué: Para ver los cambios hechos por otras personas. */
// Vuelve a pedir los eventos y redibuja la pantalla
async function recargarEventos(){
  const ok = await cargarEventosServidor();
  if(ok && typeof currentUser !== "undefined" && currentUser && typeof render === "function") render();
  return ok;
}

/* ---------- Mes y día seleccionados ----------
   Qué hace: Guarda qué mes se está mirando, qué día se eligió y si se está editando un evento.
   Por qué: El calendario necesita recordar dónde está la persona para no perderla al redibujar. */
// El calendario abre siempre en el mes actual (cambia solo cada mes)
let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalendarDay = null;   // día seleccionado (AAAA-MM-DD)
let calendarEditing = null;       // {key, index} cuando se edita un evento
 
/* ---------- Fecha en texto ----------
   Qué hace: Convierte año, mes y día en texto tipo "2026-10-23".
   Por qué: Es la "llave" que se usa para buscar los eventos de cada día. */
function calendarKey(year, month, day){
  return year + "-" + String(month + 1).padStart(2,"0") + "-" + String(day).padStart(2,"0");
}
 
/* ---------- Limpiar textos ----------
   Qué hace: Cambia símbolos especiales (< > & ") por versiones seguras.
   Por qué: Evita que lo que escribe una persona dañe la página o meta código. Otros archivos también usan esta función. */
function escapeHtml(text){
  return String(text).replace(/[&<>'"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});
}
 
 
/* ---------- Tipos de evento y colores ----------
   Qué hace: Define los tipos (Colegio, Profesores, Actividades) y el color de cada uno.
   Por qué: Los colores ayudan a distinguir de un vistazo quién publicó cada cosa. Para cambiar un color se edita CAL_KINDS. */

const CAL_KINDS = {
  colegio:     {label:"Colegio",     chip:"Colegio",     color:"#22d3ee"},
  profesor:   {label:"Profesores", chip:"Profesor",   color:"#a78bfa"},
  actividad:  {label:"Actividades", chip:"Actividad",  color:"#f59e0b"}
};

/* ---------- Actividades por día ----------
   Qué hace: Agrupa por fecha las actividades con entrega que le corresponden a la cuenta.
   Por qué: Así las entregas también aparecen en el calendario. */
// Actividades (con fecha de entrega) que le corresponden a la cuenta, agrupadas por día: {"2026-10-19":[{a, i}]}
function activitiesByDate(){
  const map = {};
  if(typeof activities === "undefined" || typeof canSeeActivity !== "function") return map;
  activities.forEach(function(a, i){
    if(!a || !a.date || !canSeeActivity(a)) return;
    (map[a.date] = map[a.date] || []).push({a:a, i:i});
  });
  return map;
}

/* ---------- Tipo de evento ----------
   Qué hace: Si lo publicó un profesor es "profesor"; todo lo demás es del colegio.
   Por qué: Decide el color y la etiqueta del evento. */
// ¿Quién publicó el evento? Si lo hizo un profesor = "profesor"; todo lo demás es del colegio.
function calKind(e){
  return e && e.byRole === "profesor" ? "profesor" : "colegio";
}

/* ---------- Iconos ----------
   Qué hace: Dibujos pequeños (calendario, flechas, más) guardados como texto.
   Por qué: Así no hace falta cargar imágenes aparte. */
const CAL_ICONS = {
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 13.6h.01M12 13.6h.01M16 13.6h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="2.4"/></svg>',
  left:'<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
  right:'<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};

/* ---------- Panel vacío ----------
   Qué hace: Texto que se muestra a la derecha cuando todavía no se eligió un día.
   Por qué: Para que el panel no se vea vacío ni confuso. */
function calEmptyDetails(){
  return '<div class="cal2-empty">' +
    '<div class="cal2-orb"><span class="sp s1">✦</span><span class="sp s2">✦</span><span class="sp s3">✦</span>' + CAL_ICONS.cal + '</div>' +
    '<p>Selecciona un día con una actividad para ver la información completa.</p></div>';
}

/* ---------- Crear la pantalla del calendario ----------
   Qué hace: Agrega los estilos (colores y formas) y arma la estructura de la página, solo una vez.
   Por qué: Así el calendario funciona sin tocar el HTML. */
function ensureCalendarUI(){

  // 1) Estilos
  if(!document.getElementById("calendarExtraStyle")){
    const st = document.createElement("style");
    st.id = "calendarExtraStyle";
    st.textContent = `
      /* Fila de botones de la página (el título ya está arriba, en la barra) */
      .cal2-welcome{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:0 0 14px}
      .cal2-welcome:not(:has(> :not([style*="display: none"]))){display:none}
      .cal2-today{
        display:inline-flex;align-items:center;gap:8px;white-space:nowrap;cursor:pointer;
        padding:10px 16px;border-radius:11px;font-size:13px;font-weight:700;
        color:#c9f7dd;background:rgba(37,160,93,.16);border:1px solid rgba(111,227,161,.6);
      }
      .cal2-today:hover{background:rgba(37,160,93,.3)}
      .cal2-today svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
      .cal2-add{
        margin-left:auto;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;
        padding:10px 18px;border-radius:11px;font-size:13px;font-weight:700;color:#fff;border:0;cursor:pointer;
        background:linear-gradient(180deg,#2d6cf0,#1c52cf);box-shadow:0 6px 18px rgba(47,107,240,.4);
      }
      .cal2-add svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}

      /* Calendario + detalle */
      .cal2-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:stretch}
      .cal2-card,.cal2-side{
        border-radius:18px;
        background:linear-gradient(165deg,rgba(12,26,62,.92),rgba(6,15,38,.94));
        border:1px solid rgba(60,120,255,.42);
        box-shadow:0 10px 34px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04);
      }
      .cal2-card{padding:0;overflow:hidden}

      .cal2-head{
        display:flex;align-items:center;justify-content:space-between;gap:10px;
        padding:14px 16px 12px;border-bottom:1px solid rgba(60,120,255,.25);
      }
      .cal2-nav{
        width:46px;height:42px;display:grid;place-items:center;border-radius:12px;cursor:pointer;
        color:#dbe8ff;background:rgba(30,70,170,.35);border:1px solid rgba(90,150,255,.5);
      }
      .cal2-nav:hover{background:rgba(45,100,230,.5)}
      .cal2-nav svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
      .cal2-title{text-align:center}
      .cal2-title h3{margin:0;font-size:23px;color:#f2f6ff}
      .cal2-title i{display:block;width:48px;height:3px;margin:7px auto 0;border-radius:3px;background:linear-gradient(90deg,#3b82f6,#a78bfa)}

      .cal2-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;padding:10px 16px 0;font-size:12px;color:#b6c6e6}
      .cal2-legend span{display:inline-flex;align-items:center;gap:7px}
      .cal2-legend i{width:10px;height:10px;border-radius:50%;background:var(--k);box-shadow:0 0 8px var(--k)}

      .cal2-body{padding:10px 16px 16px}
      .cal2-weekdays,.cal2-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
      .cal2-weekdays{margin-bottom:8px}
      .cal2-weekdays div{text-align:center;font-size:12px;font-weight:700;color:#8fb4ee;padding:6px 0}

      .cal2-day{
        position:relative;min-height:clamp(70px,calc((100vh - 360px) / 6),104px);
        padding:8px 8px 6px;border-radius:11px;cursor:pointer;
        background:rgba(24,48,112,.22);border:1px solid rgba(70,120,230,.28);
        transition:border-color .15s, background .15s;
        display:flex;flex-direction:column;gap:3px;overflow:hidden;
      }
      .cal2-day:hover{border-color:rgba(120,170,255,.8);background:rgba(36,70,150,.32)}
      .cal2-day.blank{background:rgba(24,48,112,.1);border-color:rgba(70,120,230,.14);cursor:default}
      .cal2-day.blank:hover{border-color:rgba(70,120,230,.14);background:rgba(24,48,112,.1)}
      .cal2-day.has{background:rgba(30,62,140,.34)}
      .cal2-num{font-size:13px;font-weight:700;color:#f2f6ff;line-height:1}
      .cal2-day.today{
        border:1.5px solid #3ea0ff;background:rgba(30,100,210,.2);
        box-shadow:0 0 0 1px rgba(62,160,255,.35), 0 0 20px rgba(62,160,255,.35);
      }
      .cal2-day.today .cal2-num{
        display:inline-grid;place-items:center;width:24px;height:22px;border-radius:8px;
        background:#1e9bff;color:#fff;
      }
      .cal2-hoy{
        position:absolute;top:7px;right:7px;font-size:10px;font-weight:700;letter-spacing:.5px;
        padding:3px 8px;border-radius:7px;background:rgba(30,155,255,.22);color:#74c8ff;
      }
      .cal2-day.selected{border-color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.55)}

      .cal2-ev{
        --k:#22d3ee;display:flex;align-items:flex-start;gap:6px;
        padding:4px 6px;border-radius:7px;font-size:10.5px;line-height:1.25;color:#e6eeff;
        background:color-mix(in srgb, var(--k) 22%, #0c1630);
        border:1px solid color-mix(in srgb, var(--k) 38%, transparent);
      }
      .cal2-ev i{flex:none;width:7px;height:7px;border-radius:50%;margin-top:3px;background:var(--k);box-shadow:0 0 6px var(--k)}
      .cal2-ev span{min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
      .cal2-ev.more{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);color:#b6c6e6}

      /* Panel de detalle */
      .cal2-side{padding:20px 18px;min-height:420px;max-height:calc(100vh - 150px);overflow:auto}
      .cal2-empty{height:100%;min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center}
      .cal2-empty p{margin:0;max-width:230px;font-size:15px;font-weight:600;line-height:1.5;color:#7fb0ff}
      .cal2-orb{
        position:relative;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;color:#4d9bff;
        background:radial-gradient(circle,rgba(40,90,200,.35),rgba(10,24,60,.4));
        border:1px solid rgba(90,150,255,.45);box-shadow:0 0 34px rgba(40,110,255,.25);
      }
      .cal2-orb svg{width:50px;height:50px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      .cal2-orb .sp{position:absolute;color:#4a7fe6;font-size:12px}
      .cal2-orb .s1{top:-6px;right:-16px}.cal2-orb .s2{bottom:6px;left:-24px;font-size:9px}.cal2-orb .s3{top:8px;left:-20px;font-size:8px}

      .cal2-dh{margin:0 0 14px}
      .cal2-dh h4{margin:0 0 3px;font-size:17px;color:#f2f6ff}
      .cal2-dh small{color:#8fa6c8;font-size:12px}
      .cal2-item{
        --k:#22d3ee;margin:0 0 12px;padding:12px 13px;border-radius:12px;
        background:color-mix(in srgb, var(--k) 10%, #0b1530);
        border:1px solid color-mix(in srgb, var(--k) 35%, transparent);
        border-left:4px solid var(--k);
      }
      .cal2-chip{
        display:inline-block;margin-bottom:6px;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.4px;
        color:var(--k);background:color-mix(in srgb, var(--k) 16%, transparent);border:1px solid color-mix(in srgb, var(--k) 45%, transparent);
      }
      .cal2-item strong{display:block;font-size:14px;color:#f2f6ff;overflow-wrap:anywhere}
      .cal2-meta{margin:3px 0 0;font-size:11.5px;color:#9fb0cf}
      .cal2-item p.d{margin:8px 0 0;font-size:12.5px;line-height:1.5;color:#c3cfe8;white-space:pre-wrap;overflow-wrap:anywhere}
      .cal2-acts{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}
      .cal2-btn{
        padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#cfe0ff;
        background:rgba(47,107,240,.18);border:1px solid rgba(90,150,255,.55);
      }
      .cal2-btn.danger{color:#ffb3c6;background:rgba(214,64,110,.18);border-color:rgba(214,64,110,.5)}
      .cal2-btn.primary{color:#fff;background:linear-gradient(180deg,#2d6cf0,#1c52cf);border-color:transparent}
      .cal2-none{margin:0 0 14px;font-size:13px;color:#9fb0cf}

      @media(max-width:1000px){
        .cal2-layout{grid-template-columns:1fr}
        .cal2-side{min-height:0;max-height:none}
        .cal2-empty{min-height:220px}
      }
      @media(max-width:640px){
        .cal2-add{margin-left:0}
        .cal2-weekdays,.cal2-grid{gap:4px}
        .cal2-day{min-height:62px;padding:5px 4px}
        .cal2-hoy{display:none}
        .cal2-ev{padding:2px 4px;font-size:9px}
        .cal2-ev i{display:none}
        .cal2-body{padding:8px 8px 12px}
      }
    `;
    document.head.appendChild(st);
  }

  // 2) Estructura de la página (se crea sola; usa los mismos id que ya usaba el resto del código)
  const page = document.getElementById("calendario");
  if(page && !document.getElementById("cal2Root")){
    page.innerHTML = `
      <div id="cal2Root">
        <div class="cal2-welcome">
          <button type="button" class="cal2-today" onclick="goToCalendarToday()">${CAL_ICONS.cal}<span>Hoy</span></button>
          <button type="button" class="cal2-add" id="calAddBtn" onclick="addCalendarEvent(selectedCalendarDay || undefined)">${CAL_ICONS.plus}<span>Nuevo evento</span></button>
        </div>

        <div class="cal2-layout">
          <div class="cal2-card">
            <div class="cal2-head">
              <button type="button" class="cal2-nav" onclick="changeCalendarMonth(-1)" aria-label="Mes anterior">${CAL_ICONS.left}</button>
              <div class="cal2-title"><h3 id="calendarMonthTitle"></h3><i></i></div>
              <button type="button" class="cal2-nav" onclick="changeCalendarMonth(1)" aria-label="Mes siguiente">${CAL_ICONS.right}</button>
            </div>
            <div class="cal2-legend">
              <span style="--k:${CAL_KINDS.colegio.color}"><i></i>${CAL_KINDS.colegio.label}</span>
              <span style="--k:${CAL_KINDS.profesor.color}"><i></i>${CAL_KINDS.profesor.label}</span>
              <span style="--k:${CAL_KINDS.actividad.color}"><i></i>${CAL_KINDS.actividad.label}</span>
            </div>
            <div class="cal2-body">
              <div class="cal2-weekdays"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div></div>
              <div class="cal2-grid" id="calendarGrid"></div>
            </div>
          </div>
          <div class="cal2-side" id="calendarDetails">${calEmptyDetails()}</div>
        </div>
      </div>`;
  }

}

/* ---------- Crear la pantalla al cargar ----------
   Qué hace: Llama a la función de arriba.
   Por qué: Para que el calendario ya esté armado cuando se necesite. */
ensureCalendarUI();
 
 
/* ---------- Eventos de cada cuenta ----------
   Qué hace: Funciones para sacar los eventos de un día y el texto con quién lo publicó.
   Por qué: No todos ven todos los eventos: algunos son solo de ciertos grupos. */

// Devuelve [{e, i}] con el evento y su posición real en la lista del día
function eventsOfDay(key){
  return (calendarEvents[key] || [])
    .map(function(e, i){ return {e:e, i:i}; })
    .filter(function(x){ return canSeeEvent(x.e); });
}

// Texto "Prof. Fulano · Matemáticas · Grupo 7-1" de un evento publicado por un profesor

/* ---------- Texto del evento ----------
   Qué hace: Arma el texto "Profesor · Materia · Grupo" de un evento publicado por un profesor.
   Por qué: Para saber de dónde viene el aviso. */
function eventMeta(e){
  const parts = [];
  if(e.byRole === "profesor" && e.byName) parts.push(e.byName);
  if(e.subject) parts.push(e.subject);
  if(Array.isArray(e.groups) && e.groups.length) parts.push((e.groups.length === 1 ? "Grupo " : "Grupos ") + e.groups.join(", "));
  return parts.join(" · ");
}


/* ---------- Dibujar el calendario ----------
   Qué hace: Pone el título del mes, los días en la cuadrícula, marca el día de hoy y los días con eventos.
   Por qué: Se vuelve a ejecutar cada vez que cambia el mes o los eventos. El botón "Nuevo evento" solo lo ve quien puede crearlos. */
 
function renderCalendar(){
  ensureCalendarUI();

  const title = document.getElementById("calendarMonthTitle");
  const grid = document.getElementById("calendarGrid");
  if(!title || !grid) return;

  // El botón "Nuevo evento" solo lo ven quienes pueden crear eventos
  const addBtn = document.getElementById("calAddBtn");
  if(addBtn) addBtn.style.display = hasPermission("create","calendario") ? "" : "none";
 
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const monthName = new Intl.DateTimeFormat("es-CO", {month:"long", year:"numeric"}).format(calendarCursor)
    .replace(/^(\S+) (\d{4})$/, "$1 de $2");
  title.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
 
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const now = new Date();
  const todayKey = calendarKey(now.getFullYear(), now.getMonth(), now.getDate());
  let html = "";
  const actMap = activitiesByDate();
 
  for(let i=0;i<offset;i++) html += '<div class="cal2-day blank"></div>';
 
  for(let day=1; day<=daysInMonth; day++){
    const key = calendarKey(year, month, day);
    // Eventos del día + actividades que se entregan ese día (en color ámbar)
    const events = eventsOfDay(key).map(function(x){ return x.e; })
      .concat((actMap[key] || []).map(function(x){
        const showGroup = x.a.group && getRole() !== "estudiante";
        return {title:x.a.title + (showGroup ? " · " + x.a.group : ""), _act:true};
      }));

    const eventHtml = events.slice(0,2).map(function(e){
      const k = CAL_KINDS[e._act ? "actividad" : calKind(e)];
      return '<div class="cal2-ev" style="--k:' + k.color + '" title="' + escapeHtml(k.chip + ': ' + e.title) + '">' +
        '<i></i><span>' + escapeHtml(e.title) + '</span></div>';
    }).join("");
    const more = events.length > 2 ? '<div class="cal2-ev more"><span>+' + (events.length-2) + ' más</span></div>' : "";

    let cls = "cal2-day";
    if(events.length) cls += " has";
    if(key === todayKey) cls += " today";
    if(key === selectedCalendarDay) cls += " selected";

    html += '<div class="' + cls + '" data-key="' + key + '" onclick="showCalendarDay(\'' + key + '\')">' +
      '<div class="cal2-num">' + day + '</div>' +
      (key === todayKey ? '<span class="cal2-hoy">HOY</span>' : '') +
      eventHtml + more + '</div>';
  }
  grid.innerHTML = html;

  // Al abrir el mes actual ya queda seleccionado el día de hoy (el panel de la derecha no empieza vacío)
  if(!selectedCalendarDay && year === now.getFullYear() && month === now.getMonth()){
    selectedCalendarDay = todayKey;
    const cell = grid.querySelector('[data-key="' + todayKey + '"]');
    if(cell) cell.classList.add("selected");
  }
 
  if(selectedCalendarDay){
    showCalendarDay(selectedCalendarDay, true);
  }
}
 
 
/* ---------- Detalle del día ----------
   Qué hace: Muestra a la derecha los eventos y actividades del día elegido, con botones de editar y borrar si hay permiso.
   Por qué: Es donde se lee la información completa de cada día. */
 
function showCalendarDay(key, skipGrid){
  const box = document.getElementById("calendarDetails");
  if(!box) return;
 
  selectedCalendarDay = key;
 
  // Marcar el día seleccionado en la cuadrícula
  if(!skipGrid){
    document.querySelectorAll("#calendarGrid .cal2-day").forEach(function(el){
      el.classList.toggle("selected", el.getAttribute("data-key") === key);
    });
  }
 
  const events = eventsOfDay(key);
  const dayActs = activitiesByDate()[key] || [];
  const total = events.length + dayActs.length;
  const canCreate = hasPermission("create","calendario");
  const parts = key.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
  const label = new Intl.DateTimeFormat("es-CO", {weekday:"long", day:"numeric", month:"long", year:"numeric"}).format(date);
 
  let html = '<div class="cal2-dh"><h4>' + label.charAt(0).toUpperCase() + label.slice(1) + '</h4>' +
    '<small>' + (total ? total + (total === 1 ? " elemento" : " elementos") : "Sin eventos") + '</small></div>';
 
  if(!total){
    html += '<p class="cal2-none">No hay actividades o eventos registrados para este día.</p>';
  }
 
  html += events.map(function(x){
    const e = x.e, index = x.i;
    const kind = CAL_KINDS[calKind(e)];
    const meta = eventMeta(e);
    return '<div class="cal2-item" style="--k:' + kind.color + '">' +
      '<span class="cal2-chip">' + escapeHtml(kind.chip) + '</span>' +
      '<strong>' + escapeHtml(e.title) + '</strong>' +
      (meta ? '<div class="cal2-meta">' + escapeHtml(meta) + '</div>' : '') +
      '<p class="d">' + escapeHtml(e.desc || "Sin descripción") + '</p>' +
      (canManageEvent(e)
        ? '<div class="cal2-acts ibtn-row">' + ibtn("edit", "Editar evento", "editCalendarEvent(\'" + key + "\'," + index + ")") +
          ibtn("trash", "Borrar evento", "deleteCalendarEvent(\'" + key + "\'," + index + ")") + '</div>'
        : '') +
      '</div>';
  }).join("");

  // Actividades que se entregan este día
  html += dayActs.map(function(x){
    const a = x.a, kind = CAL_KINDS.actividad;
    const meta = [a.subject, a.group ? "Grupo " + a.group : ""].filter(Boolean).join(" · ");
    return '<div class="cal2-item" style="--k:' + kind.color + '">' +
      '<span class="cal2-chip">' + escapeHtml(kind.chip) + '</span>' +
      '<strong>' + escapeHtml(a.title) + '</strong>' +
      (meta ? '<div class="cal2-meta">' + escapeHtml(meta) + '</div>' : '') +
      '<p class="d">' + escapeHtml(a.desc || "Sin descripción") + '</p>' +
      '<div class="cal2-acts"><button type="button" class="cal2-btn" onclick="viewActivity(' + x.i + ')">Ver actividad</button></div>' +
      '</div>';
  }).join("");
 
 
  box.innerHTML = html;
}
 
 
/* ---------- Formulario de evento ----------
   Qué hace: Abre la ventana para escribir fecha, título, descripción y para quién es el evento.
   Por qué: Reutiliza la misma ventana de "Nuevo aviso". El profesor solo puede publicar para sus propios grupos. */
 
// Formulario: la misma ventana que "Nuevo aviso" (fecha, título, descripción y para quién es)
async function openCalendarModal(key, event){

  const role = getRole();
  const mine = role === "profesor" ? teacherGroups() : null;      // el profesor solo publica para sus grupos
  const current = event && Array.isArray(event.groups) && event.groups.length ? event.groups : null;

  const r = await adeForm({
    title: event ? "Editar evento" : "Nuevo evento", icon: "📅", ok: "Guardar",
    fields: [
      {id:"date", label:"Fecha", type:"date", value:key, required:true},
      {id:"title", label:"Título", type:"text", maxlength:150, required:true, value:event ? event.title : "", placeholder:"Ej. Izada de bandera"},
      {id:"desc", label:"Descripción (opcional)", type:"textarea", maxlength:500, value:event ? (event.desc || "") : "", placeholder:"Escribe los detalles del evento"},
      {id:"groups", label:"¿Para quién es?", type:"groups", allowed:mine, allowAll:!mine, value:current || mine || []}
    ],
    validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? "" : "Elige una fecha para el evento."
  });

  if(!r){ calendarEditing = null; return; }
  saveCalendarEvent(r);
}
 
 
/* ---------- Añadir y editar eventos ----------
   Qué hace: Preparan el formulario para crear un evento nuevo o modificar uno existente.
   Por qué: Se revisa el permiso primero: el profesor solo edita lo suyo. */
 
function addCalendarEvent(key){
  if(!requirePermission("create","calendario")) return;
  calendarEditing = null;
  const date = key || selectedCalendarDay ||
    calendarKey(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  openCalendarModal(date, null);
}
 
/* ---------- Editar evento ----------
   Qué hace: Busca el evento, revisa que se pueda modificar y abre el formulario con sus datos.
   Por qué: Para que nadie edite eventos de otra persona. */
function editCalendarEvent(key, index){
  if(!requirePermission("edit","calendario")) return;
  const event = calendarEvents[key]?.[index];
  if(!event) return;
  if(!canManageEvent(event)) return denyPermission();      // el profesor solo edita lo suyo
  calendarEditing = {key:key, index:index};
  openCalendarModal(key, event);
}
 
/* ---------- Guardando… ----------
   Qué hace: Marca si se está guardando un evento.
   Por qué: Evita guardar dos veces por clics seguidos. */
let calendarBusy = false;

/* ---------- Guardar el evento ----------
   Qué hace: Revisa los datos, los manda al servidor, avisa en la campanita a quienes les corresponde y muestra el día del evento.
   Por qué: Así quienes deben enterarse reciben la notificación, y quien guardó ve el resultado enseguida. */
async function saveCalendarEvent(r0){
  const date  = r0.date;
  const title = r0.title.trim();
  const desc  = (r0.desc || "").trim();
  const role  = getRole();
  const groups = r0.groups.length ? r0.groups : null;      // vacío = todo el colegio

  const mine = role === "profesor" ? teacherGroups() : null;
  if(mine && groups && groups.some(g => !mine.includes(g))){
    alert("Solo puedes publicar eventos para tus grupos.");
    calendarEditing = null;
    return;
  }

  if(calendarBusy) return;

  let isNew = true;
  let id = "";
 
  if(calendarEditing){
    const event = calendarEvents[calendarEditing.key]?.[calendarEditing.index];
    if(!event) return;
    if(!canManageEvent(event)) return denyPermission();
    isNew = false;
    id = event.id;
  }else{
    if(!requirePermission("create","calendario")) return;
  }

  calendarBusy = true;
  const r = await apiPost("api/evento_guardar.php", {
    accion: isNew ? "crear" : "editar", id:id, fecha:date, titulo:title, desc:desc, groups: groups
  });
  calendarBusy = false;

  if(!r.ok){ calendarEditing = null; return alert(r.error || "No se pudo guardar el evento."); }

  // Aviso en la campanita para los que les corresponde
  if(typeof notify === "function"){
    const who = role === "profesor" && currentUser ? " (" + (currentUser.name || currentUser.username) + ")" : "";
    notify({
      type: "calendario",
      title: isNew ? "Nuevo evento en el calendario" : "Evento del calendario actualizado",
      text: title + " · " + formatDate(date) + who,
      groups: groups || null,
      page: "calendario"
    });
  }
 
  // Ir al mes del evento y mostrar ese día
  const p = date.split("-");
  calendarCursor = new Date(Number(p[0]), Number(p[1])-1, 1);
  selectedCalendarDay = date;
 
  calendarEditing = null;
  await cargarEventosServidor();
  renderCalendar();
}
 
/* ---------- Borrar evento ----------
   Qué hace: Revisa el permiso, pide confirmación y lo elimina en el servidor.
   Por qué: Borrar es definitivo, por eso se pregunta antes. El profesor no puede borrar lo del administrador. */
async function deleteCalendarEvent(key, index){
  if(!requirePermission("delete","calendario")) return;
  const event = calendarEvents[key]?.[index];
  if(!event) return;
  if(!canManageEvent(event)) return denyPermission();      // el profesor no borra lo del administrador
  if(!await adeConfirm("Se eliminará este evento del calendario.", {title:"Eliminar evento", ok:"Sí, eliminar", danger:true})) return;

  const r = await apiPost("api/evento_guardar.php", {accion:"borrar", id:event.id});
  if(!r.ok) return alert(r.error || "No se pudo borrar el evento.");

  await cargarEventosServidor();
  renderCalendar();
  showCalendarDay(key);
}
 
 
/* ---------- Botón "Hoy" ----------
   Qué hace: Vuelve al mes actual y selecciona el día de hoy.
   Por qué: Para regresar rápido si la persona se fue a otro mes. */

function goToCalendarToday(){
  const now = new Date();
  calendarCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  selectedCalendarDay = calendarKey(now.getFullYear(), now.getMonth(), now.getDate());
  renderCalendar();
}


/* ---------- Cambiar de mes ----------
   Qué hace: Avanza o retrocede un mes y redibuja el calendario.
   Por qué: Es lo que hacen las flechas ‹ y › del calendario. */
 
function changeCalendarMonth(delta){
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth()+delta, 1);
  selectedCalendarDay = null;
  renderCalendar();
  const box = document.getElementById("calendarDetails");
  if(box && !selectedCalendarDay) box.innerHTML = calEmptyDetails();
}