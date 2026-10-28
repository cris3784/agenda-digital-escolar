/* =========================================================
   MATERIAS
   Qué hace: Maneja la lista de materias: las tarjetas de Materias, el icono y color de cada una, y la parte de Inicio que muestra "Mis materias de mañana". El administrador puede agregar, editar y borrar materias.
   Por qué: Las materias se usan en actividades, horario y profesores; tenerlas en un solo lugar hace que todo use los mismos nombres, iconos y colores.
   ========================================================= */

/* ---------- Lista de materias ----------
   Qué hace: Guarda una copia en memoria de las materias mientras la página está abierta.
   Por qué: Los datos reales están en la base de datos; así no se pide al servidor cada vez que se necesitan. */
// Las materias viven en la base de datos (api/materias.php).
// Aquí solo se guarda una copia en memoria mientras la página está abierta.
let subjects = [];

/* ---------- Traer materias del servidor ----------
   Qué hace: Pide la lista de materias y la guarda.
   Por qué: Para que todos vean las materias actuales. */
async function cargarMateriasServidor(){
  try{
    const resp = await fetch("api/materias.php", {credentials:"same-origin", cache:"no-store"});
    const d = await resp.json();
    if(!d || !d.ok || !Array.isArray(d.materias)) return false;
    subjects = d.materias;
    return true;
  }catch(e){
    return false;
  }
}

/* ---------- Grupos y sus materias ----------
   Qué hace: Guarda la lista de grupos (6-1, 7-2…) y, para cada uno, las materias según su horario.
   Por qué: Varias pantallas necesitan esta lista para ofrecer grupos. */
// Grupos del colegio (vienen de la base de datos) y las materias de cada grupo (según su horario).
// Varias pantallas leen ADE_CURRICULUM.groups para ofrecer la lista de grupos.
window.ADE_CURRICULUM = {
  groups: [],
  subjectsOfGroup: function(g){
    const dias = (typeof groupSchedules !== "undefined" && groupSchedules[g]) || [];
    const lista = [];
    dias.forEach(function(d){
      d.classes.forEach(function(c){
        const n = typeof ttSubjectName === "function" ? ttSubjectName(c.subject) : c.subject;
        if(lista.indexOf(n) < 0) lista.push(n);
      });
    });
    return lista;
  }
};

/* ---------- Traer grupos del servidor ----------
   Qué hace: Pide los grupos del colegio.
   Por qué: Los grupos vienen de la base de datos. */
async function cargarGruposServidor(){
  try{
    const resp = await fetch("api/grupos.php", {cache:"no-store"});
    const d = await resp.json();
    if(!d || !d.ok || !Array.isArray(d.grupos)) return false;
    ADE_CURRICULUM.groups = d.grupos;
    return true;
  }catch(e){
    return false;
  }
}
cargarGruposServidor();

/* ---------- Pedir los datos al abrir ----------
   Qué hace: Al abrir la página pide las materias y, cuando llegan, vuelve a dibujar lo que las muestra.
   Por qué: Así la pantalla se actualiza sola apenas llegan los datos. */
// Se piden al abrir la página; cuando llegan, se vuelve a dibujar lo que las muestra
cargarMateriasServidor().then(ok => {
  if(ok && typeof currentUser !== "undefined" && currentUser){
    try{
      if(document.getElementById("subjectList")) renderSubjects();
      if(typeof renderActivityList === "function") renderActivityList();
    }catch(e){ console.error(e); }
  }
  return ok;
});

/* ---------- Icono de cada materia ----------
   Qué hace: Cada materia tiene su icono y su color (calculadora para Matemáticas, globo para Sociales…). Una materia nueva recibe un cuaderno con un color propio.
   Por qué: Los iconos ayudan a reconocer las materias de un vistazo. Para cambiar uno se edita SUBJECT_ICONS o SUBJECT_ICON_RULES. */

const SUBJECT_ICONS = {
  matematicas:    {c:"#14b8a6", d:'<rect x="5" y="2.8" width="14" height="18.4" rx="2.6"/><rect x="8.2" y="6" width="7.6" height="3.4" rx=".9"/><path d="M8.6 13.2h.01M12 13.2h.01M15.4 13.2h.01M8.6 16.9h.01M12 16.9h.01M15.4 16.9h.01" stroke-width="2.6"/>'},
  sociales:       {c:"#8b5cf6", d:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.5 4 5.6 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.6-4-9s1.4-6.5 4-9z"/>'},
  castellano:     {c:"#2f6bf0", d:'<path d="M12 6.8C10 5.2 7.3 4.6 3.8 4.8v13.4c3.5-.2 6.2.4 8.2 2 2-1.6 4.7-2.2 8.2-2V4.8c-3.5-.2-6.2.4-8.2 2z"/><path d="M12 6.8v13.4"/>'},
  naturales:      {c:"#43a047", d:'<path d="M5.2 19.2C4.6 10.8 9.6 4.6 19.6 4.2c.4 9.8-5.2 15.2-14.4 15z"/><path d="M5.2 19.2C8 14.4 11.2 11.4 15 9.2"/>'},
  etica:          {c:"#06b6d4", d:'<path d="M12 3.5v16.5"/><path d="M8 20.5h8"/><path d="M4.5 7.2h15"/><path d="M4.5 7.2 1.9 13.4a3.6 3.6 0 0 0 5.2 0z"/><path d="M19.5 7.2l-2.6 6.2a3.6 3.6 0 0 0 5.2 0z"/>'},
  religion:       {c:"#ef7b22", d:'<path d="M12 3v18"/><path d="M6.5 8.5h11"/>'},
  ingles:         {c:"#e5484d", d:'<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>'},
  educacionfisica:{c:"#8fae1b", d:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/><path d="M5.4 5.6c3.2 2.6 3.2 10.2 0 12.8M18.6 5.6c-3.2 2.6-3.2 10.2 0 12.8"/>'},
  filosofia:      {c:"#5b5fd6", d:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M10 8.2a2 2 0 1 1 2.6 1.9c-.5.2-.6.6-.6 1.1"/><path d="M12 13.2h.01" stroke-width="2.4"/>'},
  fisica:         {c:"#0a8fd6", d:'<ellipse cx="12" cy="12" rx="10" ry="4.2"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'},
  quimica:        {c:"#c04fd8", d:'<path d="M9.5 3h5"/><path d="M10.2 3v5.6L4.9 18.3A2 2 0 0 0 6.7 21h10.6a2 2 0 0 0 1.8-2.7L13.8 8.6V3"/><path d="M7.6 14.5h8.8"/>'},
  artistica:      {c:"#ec4899", d:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.9 1.9-1.9H17a4 4 0 0 0 4-4c0-4.4-4-7.5-9-7.5z"/><path d="M7.6 11.2h.01M10 7.4h.01M14.4 7.2h.01M17.3 10.4h.01" stroke-width="2.5"/>'},
  emprendimiento: {c:"#f5a40d", d:'<path d="M12 2.6c3.2 2.1 4.6 5.6 4.3 9.4l-1.4 3.6H9.1L7.7 12c-.3-3.8 1.1-7.3 4.3-9.4z"/><circle cx="12" cy="9.2" r="1.7"/><path d="M7.8 12.6 5.2 15v3.4l3.3-1.5"/><path d="M16.2 12.6l2.6 2.4v3.4l-3.3-1.5"/><path d="M10.2 18.8c.1 1.4.8 2.4 1.8 2.9 1-.5 1.7-1.5 1.8-2.9"/>'},
  economia:       {c:"#b7791f", d:'<rect x="2.6" y="6" width="18.8" height="12" rx="2.2"/><circle cx="12" cy="12" r="2.7"/><path d="M6.2 9.2h.01M17.8 14.8h.01" stroke-width="2.4"/>'},
  tecnologia:     {c:"#55637d", d:'<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx=".8"/><path d="M9.6 3v3.6M14.4 3v3.6M9.6 17.4V21M14.4 17.4V21M3 9.6h3.6M3 14.4h3.6M17.4 9.6H21M17.4 14.4H21"/>'}
};

/* ---------- Icono de reserva ----------
   Qué hace: Dibujo de cuaderno para materias que no tienen icono propio.
   Por qué: Para que toda materia nueva se vea bien. */
// Icono de reserva para materias nuevas (cuaderno)
const SUBJECT_ICON_DEFAULT = '<path d="M6 3.5h11.5A1.5 1.5 0 0 1 19 5v14.5a1.5 1.5 0 0 1-1.5 1.5H7a2 2 0 0 1-2-2V4.5a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 11.5h4"/>';

/* ---------- Cómo reconocer cada materia ----------
   Qué hace: Reglas que relacionan palabras ("matem", "quimic"…) con un icono, sin importar tildes ni mayúsculas.
   Por qué: Así "Matemáticas 7" y "matematicas" usan el mismo icono. El orden importa: "educación física" va antes que "física". */
// Cómo reconocer cada materia por su nombre (sin importar tildes ni mayúsculas).
// El orden importa: "educación física" va antes que "física".
const SUBJECT_ICON_RULES = [
  [/educacion fisica|deporte|gimnasia/, "educacionfisica"],
  [/matem|geometr|estadist|algebra|calculo|aritmetica/, "matematicas"],
  [/social|historia|geograf|civica|democracia/, "sociales"],
  [/castellano|lengua|lectura|espanol|literatura/, "castellano"],
  [/natural|biolog|ciencias/, "naturales"],
  [/etica|valores/, "etica"],
  [/religi/, "religion"],
  [/ingles|english|idioma|frances/, "ingles"],
  [/filosof/, "filosofia"],
  [/quimic/, "quimica"],
  [/fisica/, "fisica"],
  [/artistic|\barte\b|musica|dibujo|danza/, "artistica"],
  [/emprend/, "emprendimiento"],
  [/econom|financ|contab/, "economia"],
  [/tecnolog|informat|sistemas|computa|program|robotic/, "tecnologia"]
];

/* ---------- Buscar el icono por nombre ----------
   Qué hace: Revisa las reglas de arriba y devuelve qué icono le toca a la materia.
   Por qué: Si no coincide ninguna regla, se usa el icono de reserva. */
function subjectIconKey(name){
  const t = normText(name);
  for(const [re, key] of SUBJECT_ICON_RULES){ if(re.test(t)) return key; }
  return "";
}

/* ---------- Estilos de los iconos ----------
   Qué hace: Agrega a la página los estilos del cuadrito de color, una sola vez.
   Por qué: Así el icono se ve bien sin tocar el archivo de estilos. */
function ensureSubjectIconStyle(){

  if(document.getElementById("subjectIconStyle")) return;

  const st = document.createElement("style");
  st.id = "subjectIconStyle";
  st.textContent = `
    .subj-ico{
      --c:#2f6bf0;
      width:46px; height:46px; flex:none; border-radius:13px;
      display:inline-grid; place-items:center; color:#fff;
      background:var(--c);
      background:linear-gradient(150deg, color-mix(in srgb, var(--c) 80%, #fff), var(--c) 62%);
      box-shadow:0 5px 14px color-mix(in srgb, var(--c) 38%, transparent), inset 0 1px 0 rgba(255,255,255,.22);
    }
    .subj-ico svg{
      width:56%; height:56%; display:block;
      fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round;
    }
    .subj-ico.sm{width:42px; height:42px; border-radius:12px}

    /* Tarjeta de materia: icono + nombre */
    .subj-head{display:flex; align-items:center; gap:13px; min-width:0}
    .subj-head > div{min-width:0}
    .subj-head h4{overflow-wrap:anywhere}

    /* Tarjeta de actividad: icono + texto */
    .act-row{display:flex; align-items:flex-start; gap:13px}
    .act-text{flex:1; min-width:0}

    @media(max-width:640px){
      .subj-head{flex-direction:column; align-items:flex-start; gap:9px}
      .subj-ico{width:42px; height:42px}
      .subj-ico.sm{width:38px; height:38px}
      .act-row{gap:11px}
    }
  `;
  document.head.appendChild(st);
}

/* ---------- Dibujar el icono ----------
   Qué hace: Devuelve el cuadrito de color con el dibujo de la materia (tamaño normal o pequeño).
   Por qué: Lo usan las tarjetas, Inicio y las actividades. */
// Devuelve el icono (cuadrito de color) de una materia. size = "sm" para el más pequeño.
function subjectIcon(name, size){

  ensureSubjectIconStyle();

  const key = subjectIconKey(name);
  let color, drawing;

  if(key){
    color = SUBJECT_ICONS[key].c;
    drawing = SUBJECT_ICONS[key].d;
  }else{
    // materia nueva: color propio según su nombre
    let h = 0;
    String(name || "").split("").forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) % 360; });
    color = "hsl(" + h + " 52% 46%)";
    drawing = SUBJECT_ICON_DEFAULT;
  }

  return '<span class="subj-ico' + (size ? " " + size : "") + '" style="--c:' + color + '" aria-hidden="true">' +
         '<svg viewBox="0 0 24 24">' + drawing + '</svg></span>';
}


 
 
/* ---------- Estilos de las tarjetas ----------
   Qué hace: Agrega los estilos de las tarjetas de materias para que se vean más compactas.
   Por qué: Para que quepan más materias en pantalla. */
 
function ensureSubjectsStyle(){
 
  if(document.getElementById("subjectsExtraStyle")) return;
 
  const st = document.createElement("style");
  st.id = "subjectsExtraStyle";
  st.textContent = `
    #materias .welcome{margin-bottom:14px}
 
    /* Tarjetas */
    .card.subject{
      min-height:0;
      padding:14px 16px;
      gap:10px;
      border-radius:13px;
    }
    .card.subject h4{font-size:15px;margin-bottom:2px}
    .card.subject small{font-size:11px}
    .card.subject .progress{display:none}
 
    .subj-foot{display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px}
    .subject-actions{
      display:flex;
      gap:6px;
      margin-top:9px;
    }
    .subject-actions .btn{
      padding:4px 10px;
      font-size:11px;
      border-radius:7px;
    }
 
    /* Lista completa de materias: 5 columnas (15 materias = 3 filas) */
    #subjectList{
      grid-template-columns:repeat(5,1fr);
      gap:14px;
    }
    #homeSubjects{gap:14px}
 
    @media(max-width:1250px){
      #subjectList{grid-template-columns:repeat(4,1fr)}
    }
    @media(max-width:1050px){
      #subjectList{grid-template-columns:repeat(3,1fr)}
    }
    @media(max-width:800px){
      #subjectList{grid-template-columns:repeat(2,1fr)}
    }
    @media(max-width:520px){
      #subjectList{grid-template-columns:1fr}
    }
  `;
 
  document.head.appendChild(st);
 
}
 
 
/* ---------- Dibujar las materias ----------
   Qué hace: Muestra una tarjeta por materia en la página Materias y en Inicio.
   Por qué: Si no hay materias, se muestra un aviso en vez de dejar el espacio vacío. */
 
function renderSubjects(){
  ensureSubjectsStyle();
  const list = subjects;                // todas las materias, para todos los cargos
  const empty = '<div class="card empty">No tienes materias asignadas.</div>';
  $("subjectList").innerHTML = list.map(subjectCard).join("") || empty;
  renderHomeSubjects(list, empty);
}


/* ---------- Inicio: "Mis materias de mañana" ----------
   Qué hace: Muestra las materias que le tocan a la persona el siguiente día de clases, con sus tareas pendientes. Si mañana es fin de semana, muestra el lunes. El profesor ve sus materias, grupos y entregas.
   Por qué: Así cada quien ve de inmediato qué viene y qué debe entregar, sin buscar en el horario. Administrador y cuentas sin horario ven las materias de siempre. */

/* ---------- Estilos de "mañana" ----------
   Qué hace: Agrega los estilos de las tarjetas de "Mis materias de mañana".
   Por qué: Se agregan desde aquí para no tocar el archivo de estilos. */
function ensureTomorrowStyle(){

  if(document.getElementById("tomorrowStyle")) return;

  const st = document.createElement("style");
  st.id = "tomorrowStyle";
  st.textContent = `
    /* Todas las tarjetas caben a la vez: una fila (o dos en pantallas angostas) */
    #homeSubjects.tm-grid{
      display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:12px; align-items:stretch;
    }
    .tm-day{margin-left:10px; font-size:12px; font-weight:400; color:#8fe3b3}

    .tm-card{
      display:flex; flex-direction:column; gap:9px; padding:11px 10px; border-radius:14px; min-width:0;
      border:1px solid rgba(80,200,130,.35) !important;
    }
    .tm-head{display:grid; grid-template-columns:auto minmax(0,1fr); gap:7px 8px; align-items:center; min-width:0}
    .tm-head .subj-ico{width:38px; height:38px; border-radius:11px}
    .tm-info{min-width:0}
    .tm-info h4{margin:0 0 2px; font-size:13px; line-height:1.2; color:#f2f6ff; overflow-wrap:break-word}
    .tm-info small{display:block; font-size:11px; color:#9fb0cf; line-height:1.35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
    .tm-badge{
      grid-column:1 / -1; justify-self:start; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap;
      background:rgba(214,64,110,.22); color:#ffb3c6; border:1px solid rgba(214,64,110,.5);
    }
    .tm-badge.ok{background:rgba(37,160,93,.2); color:#7ff0b0; border-color:rgba(111,227,161,.5)}

    .tm-tasks{display:flex; flex-direction:column; gap:6px}
    .tm-task{
      display:flex; flex-direction:column; align-items:stretch; gap:6px; padding:7px 9px; border-radius:10px; cursor:pointer;
      background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
    }
    .tm-task:hover{border-color:rgba(111,227,161,.55)}
    .tm-tt{flex:none; min-width:0}
    .tm-tt b{display:block; font-size:12px; color:#eef2fb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
    .tm-tt small{display:block; margin-top:1px; font-size:11px; color:#8995ad}
    .tm-tt small.late{color:#ff9fb7}
    .tm-btn{
      display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:6px 10px; border-radius:8px; border:0; cursor:pointer;
      font-size:11.5px; font-weight:700; color:#fff; white-space:nowrap;
      background:linear-gradient(180deg,#2fb86d,#1d8a52); box-shadow:0 4px 12px rgba(37,160,93,.35);
    }
    .tm-btn:hover{filter:brightness(1.12)}
    .tm-btn svg{width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round}
    .tm-btn.soft{background:rgba(37,160,93,.16); border:1px solid rgba(111,227,161,.6); color:#c9f7dd; box-shadow:none}
    .tm-free{margin:0; font-size:12px; color:#7ff0b0}
    .tm-more{
      align-self:flex-start; padding:0; border:0; background:none; cursor:pointer;
      font-size:12px; font-weight:700; color:#6fe3a1; text-decoration:underline; text-align:left;
    }

    /* Administrador / cuentas sin horario: TODAS las materias, en fichas pequeñas */
    #homeSubjects.hm-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px}
    .hm-chip{
      display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:12px; min-width:0; cursor:pointer; text-align:left;
      background:rgba(255,255,255,.04); border:1px solid rgba(80,200,130,.3); color:inherit;
    }
    .hm-chip:hover{border-color:rgba(111,227,161,.8)}
    .hm-chip .subj-ico{width:36px; height:36px; border-radius:10px}
    .hm-chip b{display:block; font-size:12.5px; line-height:1.2; color:#f2f6ff; overflow-wrap:anywhere}
    .hm-chip small{display:block; margin-top:1px; font-size:11px; color:#8995ad}

    /* Celular: dos columnas para que se vean todas sin tanto desplazamiento */
    @media(max-width:640px){
      #homeSubjects.tm-grid,#homeSubjects.hm-grid{grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px}
      .tm-card{padding:10px; gap:8px}
      .tm-head{grid-template-columns:1fr; gap:6px}
      .tm-head .subj-ico{width:36px; height:36px; border-radius:11px}
      .tm-badge{grid-column:auto}
      .hm-chip{padding:8px; gap:8px}
      .hm-chip .subj-ico{width:32px; height:32px}
      .hm-chip b{font-size:12px}
    }
  `;
  document.head.appendChild(st);
}

/* ---------- Próximo día de clases ----------
   Qué hace: Calcula mañana; si cae en fin de semana, salta al lunes.
   Por qué: No hay clases sábado ni domingo. */
// Próximo día de clases después de hoy (mañana; si cae en fin de semana, el lunes)
function nextSchoolDay(){
  const d = new Date();
  d.setDate(d.getDate() + 1);
  let rolled = false;
  while(d.getDay() === 0 || d.getDay() === 6){ d.setDate(d.getDate() + 1); rolled = true; }
  return {date:d, rolled:rolled};
}

/* ---------- Clases de un día ----------
   Qué hace: Saca las clases de ese día según el horario de la cuenta (su grupo o sus clases como profesor).
   Por qué: Cada persona tiene un horario distinto. */
// Clases de ese día para esta cuenta. Devuelve null si la cuenta no tiene horario propio.
function classesOfDay(dayName){

  const role = getRole();
  if(role === "admin") return null;

  const onDay = list => ((list || []).find(x => x.day === dayName) || {classes:[]}).classes;

  const hasGroups = typeof groupSchedules !== "undefined" && Object.keys(groupSchedules).length;

  if(hasGroups){
    if(role === "estudiante"){
      const mine = groupSchedules[studentGroup()];
      return mine ? onDay(mine).map(c => Object.assign({}, c)) : null;
    }
    if(role === "profesor" && teacherGroups()){
      const out = [];
      teacherGroups().forEach(g => {
        onDay(groupSchedules[g]).forEach(c => {
          if(c.teacher === currentUser.username) out.push(Object.assign({}, c, {group:g}));
        });
      });
      return out;
    }
  }

  // Cuentas antiguas: horario general
  if(typeof schedule !== "undefined" && Array.isArray(schedule)){
    const all = onDay(schedule);
    if(role === "profesor") return all.filter(c => teacherSubjects().some(s => ttClassIsOfSubject(c.subject, s)));
    return all.map(c => Object.assign({}, c));
  }
  return null;
}

/* ---------- Nombre completo ----------
   Qué hace: Convierte el nombre corto de la materia en el nombre completo.
   Por qué: Para mostrar nombres bien escritos. */
function subjectFullName(raw){
  return typeof ttSubjectName === "function" ? ttSubjectName(raw) : raw;
}

/* ---------- Día que se muestra en Inicio ----------
   Qué hace: Estudiantes: el próximo día de clases. Profesores: hoy si tienen clases; si no, el próximo día que sí tengan.
   Por qué: Al profesor le sirve ver sus clases de hoy, y al estudiante prepararse para mañana. */
// Día que se muestra en Inicio.
// Estudiantes: el próximo día de clases (como siempre).
// Profesores: si hoy tienen clases, las de hoy; si no, el próximo día en que sí tengan clases.
function homeTargetDay(names){

  const isSchool = d => d.getDay() !== 0 && d.getDay() !== 6;

  if(getRole() === "profesor"){
    const today = new Date();
    let first = null;
    try{ first = classesOfDay(names[today.getDay()]); }catch(e){ console.error(e); }

    if(first !== null){
      if(isSchool(today) && first.length) return {date:today, rolled:false, kind:"today", classes:first};

      for(let k = 1; k <= 14; k++){
        const d = new Date(); d.setDate(d.getDate() + k);
        if(!isSchool(d)) continue;
        const cl = classesOfDay(names[d.getDay()]) || [];
        if(cl.length) return {date:d, rolled:k > 1, kind:(k === 1 ? "tomorrow" : "day"), classes:cl};
      }
      return {date:new Date(), rolled:false, kind:"none", classes:[]};
    }
  }

  const nd = nextSchoolDay();
  let classes = null;
  try{ classes = classesOfDay(names[nd.date.getDay()]); }catch(e){ console.error(e); }
  return Object.assign(nd, {kind: nd.rolled ? "day" : "tomorrow", classes:classes});
}

/* ---------- Título del bloque ----------
   Qué hace: Cambia el título según el día ("Mis materias de hoy", "de mañana" o el nombre del día).
   Por qué: Para que la persona sepa qué día está viendo. */
// Pone el título "Mis materias de mañana" (o "Mis materias" como antes)
function setHomeSubjectsTitle(nd){
  let h = null;
  document.querySelectorAll("#inicio h3, #inicio h2").forEach(el => {
    if(!h && (el.dataset.tmTitle || normText(el.textContent).indexOf("mis materias") === 0)) h = el;
  });
  if(!h) return;
  h.dataset.tmTitle = "1";
  if(!nd){ h.textContent = "Mis materias"; return; }
  const dia = nd.date.toLocaleDateString("es-CO", {weekday:"long", day:"numeric", month:"long"});
  const weekday = escapeHtml(nd.date.toLocaleDateString("es-CO", {weekday:"long"}));
  const title = nd.kind === "today" ? "Mis materias de hoy"
              : nd.kind === "none"  ? "Mis materias"
              : (nd.rolled || nd.kind === "day") ? "Mis materias del " + weekday
              : "Mis materias de mañana";
  h.innerHTML = title +
    '<small class="tm-day">' + escapeHtml(dia.charAt(0).toUpperCase() + dia.slice(1)) + '</small>';
}

/* ---------- Ir a las actividades de una materia ----------
   Qué hace: Filtra las actividades por la materia elegida y abre esa página.
   Por qué: Es lo que pasa al hacer clic en una tarjeta de materia. */
function goToSubjectActivities(name){
  if(typeof ACT_FILTER !== "undefined"){
    ACT_FILTER.subject = name; ACT_FILTER.status = "all"; ACT_FILTER.q = ""; ACT_FILTER.date = "all"; ACT_FILTER.group = "";
    const q = $("actSearch"); if(q) q.value = "";
    const d = $("actDate"); if(d) d.value = "all";
  }
  if(typeof goHome === "function") goHome("actividades");
  if(typeof renderActivityList === "function") renderActivityList();
}

/* ---------- Icono de subir ----------
   Qué hace: Dibujo de flecha hacia arriba, para el botón de entregar.
   Por qué: Se guarda como texto y no se necesita una imagen aparte. */
const TM_UPLOAD = '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>';

/* ---------- Tarjeta de una materia de mañana ----------
   Qué hace: Arma la tarjeta con el nombre, horas, grupo o salón y las actividades pendientes (o entregas, para el profesor).
   Por qué: Desde la tarjeta se ve y se entrega la tarea sin cambiar de página. */
function tomorrowCard(item){

  const name = item.name;
  const key = normText(name);
  const student = getRole() === "estudiante";
  const times = item.times.join(" · ");
  const extra = [];
  if(item.groups.length) extra.push("Grupo " + item.groups.join(", "));
  else if(item.rooms.length) extra.push(item.rooms.join(", "));

  const mine = visibleActivities().filter(a => normText(a.subject) === key);
  let badge = "", body = "";

  if(student && !isGuardian()){
    const today = new Date(); today.setHours(0,0,0,0);
    const pend = mine.filter(a => activityStatus(a) === "pending")
      .sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
    const canSubmit = hasPermission("create","entrega");

    badge = pend.length
      ? '<span class="tm-badge">' + pend.length + (pend.length === 1 ? " pendiente" : " pendientes") + '</span>'
      : '<span class="tm-badge ok">Al día</span>';

    body = pend.length
      ? '<div class="tm-tasks">' + pend.slice(0, 1).map(a => {
          const i = activities.indexOf(a);
          const late = a.date && new Date(a.date + "T00:00:00") < today;
          return '<div class="tm-task" onclick="viewActivity(' + i + ')">' +
            '<div class="tm-tt"><b>' + escapeHtml(a.title) + '</b>' +
            '<small class="' + (late ? "late" : "") + '">Entrega: ' + formatDate(a.date) + '</small></div>' +
            (canSubmit ? '<button type="button" class="tm-btn" onclick="event.stopPropagation();submitWork(' + i + ')">' + TM_UPLOAD + 'Entregar</button>' : '') +
            '</div>';
        }).join("") + '</div>' +
        (pend.length > 1
          ? '<button type="button" class="tm-more" data-s="' + escapeHtml(name) + '" onclick="goToSubjectActivities(this.dataset.s)">Ver las ' + pend.length + ' tareas pendientes</button>'
          : '')
      : '<p class="tm-free">✓ No tienes tareas pendientes de esta materia.</p>';
  }else{
    const nSubs = mine.reduce((n, a) => n + (a.submissions ? Object.keys(a.submissions).length : 0), 0);
    badge = '<span class="tm-badge ok">' + mine.length + (mine.length === 1 ? " actividad" : " actividades") + '</span>';
    body = (isGuardian() ? '' : '<p class="tm-free" style="color:#9fb0cf">' + nSubs + (nSubs === 1 ? " entrega recibida" : " entregas recibidas") + '</p>') +
      '<button type="button" class="tm-btn soft" data-s="' + escapeHtml(name) + '" onclick="goToSubjectActivities(this.dataset.s)">Ver actividades</button>';
  }

  return '<div class="card tm-card">' +
    '<div class="tm-head">' + subjectIcon(name) +
      '<div class="tm-info"><h4>' + escapeHtml(name) + '</h4>' +
      '<small>' + escapeHtml(times) + '</small>' +
      (extra.length ? '<small>' + escapeHtml(extra.join(" · ")) + '</small>' : '') + '</div>' +
      badge +
    '</div>' + body + '</div>';
}

/* ---------- Ficha pequeña de materia ----------
   Qué hace: Botón pequeño con el icono, el nombre y cuántas actividades tiene la materia.
   Por qué: Se usa en cuentas sin horario propio. */
// Ficha pequeña de una materia (Inicio, cuentas sin horario): icono + nombre + cuántas actividades
function homeSubjectChip(s){
  const n = countActivities(s);
  return '<button type="button" class="hm-chip" data-s="' + escapeHtml(s) + '" onclick="goToSubjectActivities(this.dataset.s)">' +
    subjectIcon(s) +
    '<span style="min-width:0"><b>' + escapeHtml(s) + '</b><small>' + n + (n === 1 ? " actividad" : " actividades") + '</small></span>' +
    '</button>';
}

/* ---------- Dibujar las materias en Inicio ----------
   Qué hace: Decide qué día mostrar, junta las clases por materia, las ordena por hora y dibuja las tarjetas.
   Por qué: Si una materia está en varias horas, se junta en una sola tarjeta para no repetirla. */
function renderHomeSubjects(list, empty){

  const box = $("homeSubjects");
  if(!box) return;

  ensureTomorrowStyle();

  const names = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const nd = homeTargetDay(names);
  const classes = nd.classes;

  // Sin horario propio (administrador o cuenta sin grupo): se ven las materias de siempre
  if(classes === null){
    box.classList.remove("tm-grid");
    box.classList.add("hm-grid");
    setHomeSubjectsTitle(null);
    box.innerHTML = list.map(homeSubjectChip).join("") || empty;
    return;
  }

  setHomeSubjectsTitle(nd);
  box.classList.remove("hm-grid");
  box.classList.add("tm-grid");

  // Una tarjeta por materia (si la tiene en varias horas, se juntan)
  const bySubject = {};
  const order = [];
  classes.forEach(c => {
    const name = subjectFullName(c.subject);
    const k = normText(name);
    if(!bySubject[k]){ bySubject[k] = {name:name, times:[], rooms:[], groups:[], first:ttParseStart(c.time)}; order.push(k); }
    const it = bySubject[k];
    if(c.time && it.times.indexOf(c.time) === -1) it.times.push(c.time);
    if(c.room && it.rooms.indexOf(c.room) === -1) it.rooms.push(c.room);
    if(c.group && it.groups.indexOf(c.group) === -1) it.groups.push(c.group);
  });

  const items = order.map(k => bySubject[k]).sort((a, b) => a.first - b.first);

  box.innerHTML = items.length
    ? items.map(tomorrowCard).join("")
    : '<div class="card empty">' + (nd.kind === "none" ? "No tienes clases programadas en los próximos días." : (nd.rolled ? "El lunes no tienes clases." : "Mañana no tienes clases.")) + '</div>';
}

/* ---------- Hora de inicio en minutos ----------
   Qué hace: Convierte "6:52 - 7:45" en 412 minutos.
   Por qué: Con números es fácil ordenar las clases de la mañana a la tarde. */
// Minutos desde medianoche de la hora de inicio ("6:52 - 7:45" → 412) para ordenar
function ttParseStart(time){
  const m = String(time || "").match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
}
 
/* ---------- Pedir el nombre de una materia ----------
   Qué hace: Abre una ventana para escribir el nombre y revisa que no esté vacío ni repetido.
   Por qué: Evita materias sin nombre o duplicadas. */
// Pide un nombre en una ventana y valida que no esté vacío ni repetido. Devuelve null si se cancela.
async function askSubjectName(message, current = "", skipIndex = -1){
  const clean = await adePrompt(message, current, {
    title: current ? "Editar materia" : "Nueva materia", icon: "📚", placeholder: "Ej. Matemáticas", maxlength: 60,
    validate: v => v.length < 2 ? "El nombre debe tener al menos 2 letras."
      : (subjects.some((s, i) => i !== skipIndex && s.toLowerCase() === v.toLowerCase()) ? "Esa materia ya existe." : null)
  });
  return clean ? clean.trim() : null;
}

/* ---------- Guardando… ----------
   Qué hace: Marca si se está guardando una materia.
   Por qué: Evita guardar dos veces por clics seguidos. */
let materiaBusy = false;

/* ---------- Guardar en el servidor ----------
   Qué hace: Manda agregar, editar o borrar una materia y luego vuelve a leer la lista.
   Por qué: Así la pantalla muestra lo que realmente quedó guardado. */
// accion: "agregar" | "editar" | "borrar". Guarda en el servidor y vuelve a leer la lista.
async function guardarMateria(accion, actual, nombre){
  if(materiaBusy) return false;
  materiaBusy = true;
  const r = await apiPost("api/materia_guardar.php", {accion:accion, actual:actual || "", nombre:nombre || ""});
  materiaBusy = false;

  if(!r.ok){ alert(r.error || "No se pudo guardar la materia."); return false; }

  await cargarMateriasServidor();
  renderSubjects();
  return true;
}

/* ---------- Agregar materia ----------
   Qué hace: Revisa el permiso, pide el nombre y la crea.
   Por qué: Solo quien tiene permiso puede crear materias. */
async function addSubject(){
  if(!requirePermission("create","materia")) return;
  const name = await askSubjectName("Nombre de la nueva materia");
  if(!name) return;
  await guardarMateria("agregar", "", name);
}

/* ---------- Editar materia ----------
   Qué hace: Pide el nuevo nombre y lo guarda.
   Por qué: Para corregir errores de escritura. */
async function editSubject(i){
  if(!requirePermission("edit","materia")) return;
  const name = await askSubjectName("Nuevo nombre de la materia", subjects[i], i);
  if(!name) return;
  await guardarMateria("editar", subjects[i], name);
}

/* ---------- Borrar materia ----------
   Qué hace: Pide confirmación y borra la materia.
   Por qué: Es definitivo, por eso se pregunta antes. */
async function deleteSubject(i){
  if(!requirePermission("delete","materia")) return;
  if(!await adeConfirm(`Se borrará la materia "${subjects[i]}".`, {title:"Borrar materia", ok:"Sí, borrar", danger:true})) return;
  await guardarMateria("borrar", subjects[i], "");
}
 
/* ---------- Texto de la tarjeta ----------
   Qué hace: Escribe quién dicta la materia y en cuántos grupos está (distinto para estudiante, profesor y administrador).
   Por qué: Cada rol necesita un dato diferente. */
// Texto de debajo del nombre (antes decía "Materia escolar" en todas): quién la dicta y en cuántos grupos
function subjectInfo(subject){

  const same = (x, y) => normText(x) === normText(y) ||
    (typeof ttClassIsOfSubject === "function" && ttClassIsOfSubject(y, x));
  const teachers = users.filter(u => u && u.role === "profesor" && teacherSubjects(u).some(t => same(subject, t)));
  const names = teachers.map(u => u.name || u.username);
  const role = getRole();

  if(role === "profesor"){
    const mine = teacherSubjects().some(t => same(subject, t));
    const g = teacherGroups();
    return mine ? (g ? g.length + (g.length === 1 ? " grupo a tu cargo" : " grupos a tu cargo") : "La dictas") : "Materia del colegio";
  }

  if(role === "estudiante"){
    const g = studentGroup();
    const t = teachers.find(u => !teacherGroups(u) || teacherGroups(u).includes(g)) || teachers[0];
    return t ? "Prof. " + (t.name || t.username) : "Sin profesor asignado";
  }

  // Administrador: profesores y grupos que la tienen
  let groups = 0;
  if(window.ADE_CURRICULUM && Array.isArray(ADE_CURRICULUM.groups)){
    groups = ADE_CURRICULUM.groups.filter(g => ADE_CURRICULUM.subjectsOfGroup(g).some(x => same(subject, x))).length;
  }
  const who = names.length ? (names.length > 2 ? names.slice(0, 2).join(", ") + " +" + (names.length - 2) : names.join(", ")) : "Sin profesor";
  return who + (groups ? " · " + groups + (groups === 1 ? " grupo" : " grupos") : "");
}

/* ---------- Tarjeta de materia ----------
   Qué hace: Arma la tarjeta con icono, nombre, cantidad de actividades y botones de editar o borrar si hay permiso.
   Por qué: Es lo que se ve en la página Materias. */
function subjectCard(s){
  const i = subjects.indexOf(s);
  const canEdit = hasPermission("edit","materia");
  const canDelete = hasPermission("delete","materia");
  const n = countActivities(s);
  return `
    <div class="card subject">
      <div class="subj-head">
        ${subjectIcon(s)}
        <div>
          <h4>${escapeHtml(s)}</h4>
          <small>${escapeHtml(subjectInfo(s))}</small>
        </div>
      </div>
      <div class="subj-foot">
        <small>${n} ${n === 1 ? "actividad" : "actividades"}</small>
        ${(canEdit || canDelete) ? `
          <div class="ibtn-row">
            ${canEdit ? ibtn("edit", "Editar materia", `editSubject(${i})`) : ""}
            ${canDelete ? ibtn("trash", "Borrar materia", `deleteSubject(${i})`) : ""}
          </div>` : ""}
      </div>
    </div>
  `;
}
 
/* ---------- Contar actividades ----------
   Qué hace: Cuenta las actividades de la materia que le corresponden a la cuenta (su grupo, sus grupos o todas).
   Por qué: Para mostrar el número en cada tarjeta. */
// Actividades totales de la materia en el grupo de la cuenta
// (estudiante = su grupo · profesor = sus grupos · admin = todas), sin importar quién dicta la materia
function countActivities(subject){
  const role = getRole();
  const groups = role === "profesor" ? teacherGroups() : null;
  return activities.filter(a => {
    if(normText(a.subject) !== normText(subject)) return false;
    if(role === "admin") return true;
    if(role === "profesor") return !a.group || !groups || groups.includes(a.group);
    return !a.group || a.group === studentGroup();
  }).length;
}