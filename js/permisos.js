/* =========================================================
   PERMISOS Y VENTANAS PROPIAS
   Qué hace: Define qué puede hacer cada cargo (admin, profesor, estudiante, acudiente), las reglas de quién ve y gestiona qué, y las ventanas propias que reemplazan los cuadros feos del navegador.
   Por qué: Los demás archivos preguntan aquí "¿esta persona puede hacer esto?", así las reglas están en un solo lugar y son iguales en toda la agenda. Los datos reales viven en la base de datos, no aquí.
   ========================================================= */

/* ---------- Limpieza de datos viejos ----------
   Qué hace: Borra del navegador datos de prueba antiguos que ya no se usan.
   Por qué: Ahora todo vive en el servidor y esos datos viejos solo estorbarían. */
// Limpieza única: borra del navegador los datos viejos (de prueba) que ya no se usan
(function(){
  try{
    ["ade_activities","ade_notifications","ade_schedules_v3","ade_schedule_v2",
     "ade_calendar_events","ade_subjects","ade_seed_version"].forEach(function(k){ localStorage.removeItem(k); });
    Object.keys(localStorage).forEach(function(k){
      if(k.indexOf("ade_notif_read_") === 0) localStorage.removeItem(k);
    });
  }catch(e){}
})();


/* ---------- Permisos por cargo ----------
   Qué hace: Funciones que deciden quién puede hacer qué.
   Por qué: Para que cada rol solo vea y toque lo que le corresponde. */
 
/* ---------- Atajo $ ----------
   Qué hace: Forma corta de escribir document.getElementById.
   Por qué: Se usa en todos los archivos y evita escribir lo mismo muchas veces. */
const $ = id => document.getElementById(id);   // atajo usado en todos los archivos
 
/* ---------- Tabla de permisos ----------
   Qué hace: Lista, para cada cargo, qué puede crear, editar y borrar (ver, crear, editar, borrar sobre cada cosa).
   Por qué: Si se quiere dar o quitar un permiso, solo se cambia aquí. El acudiente solo mira. */
const ROLE_PERMISSIONS = {
  admin: {
    view:   ["inicio","actividades","materias","horario","calendario","perfil","admin"],
    create: ["actividad","usuario","materia","horario","calendario","aviso"],
    edit:   ["actividad","usuario","materia","horario","calendario","perfil"],
    delete: ["actividad","usuario","materia","horario","calendario"]
  },
  profesor: {
    view:   ["inicio","actividades","materias","horario","calendario","estudiantes","perfil"],
    // Calendario: el profesor puede publicar eventos, pero solo edita/borra los suyos (ver canManageEvent)
    create: ["actividad","calendario","aviso"],
    edit:   ["actividad","perfil","calendario"],
    delete: ["actividad","calendario"]
  },
  estudiante: {
    view:   ["inicio","actividades","materias","horario","calendario","perfil"],
    create: ["entrega"],          // solo el estudiante entrega trabajos
    edit:   ["perfil"],
    delete: []
  },
  acudiente: {                    // solo mira: no crea, no edita (salvo su perfil) y no borra
    view:   ["inicio","actividades","materias","horario","calendario","perfil"],
    create: [],
    edit:   ["perfil"],
    delete: []
  }
};
 
/* ---------- Nombres alternativos de cargos ----------
   Qué hace: Convierte nombres parecidos (teacher, docente, alumno…) al nombre oficial del cargo.
   Por qué: Para que el sistema entienda el cargo aunque venga escrito distinto. El acudiente ve lo mismo que un estudiante, pero sin poder hacer nada. */
const ROLE_ALIASES = {
  teacher:"profesor", docente:"profesor",
  student:"estudiante", alumno:"estudiante",
  administrator:"admin",
  acudiente:"estudiante"          // ve la agenda del grupo de su hijo, igual que un estudiante (pero sin poder hacer nada)
};
 
/* ---------- Cargo de la persona ----------
   Qué hace: Devuelve el cargo oficial de quien inició sesión (por defecto estudiante).
   Por qué: Es la base para todas las demás reglas. */
function getRole(){
  if(!currentUser || !currentUser.role) return "estudiante";
  const role = String(currentUser.role).toLowerCase().trim();
  return ROLE_ALIASES[role] || role;
}
 
/* ---------- ¿Es acudiente? ----------
   Qué hace: Responde si la cuenta es de un acudiente.
   Por qué: Porque el acudiente se trata como estudiante pero con limitaciones. */
function isGuardian(){
  return !!(currentUser && String(currentUser.role || "").toLowerCase().trim() === "acudiente");
}

/* ---------- ¿Tiene permiso? ----------
   Qué hace: Responde sí o no si el cargo puede hacer esa acción sobre ese recurso (ej. crear una actividad).
   Por qué: Se usa para mostrar u ocultar botones y para bloquear acciones. */
function hasPermission(action, resource){
  const own = currentUser ? ROLE_PERMISSIONS[String(currentUser.role || "").toLowerCase().trim()] : null;
  const permissions = own || ROLE_PERMISSIONS[getRole()] || ROLE_PERMISSIONS.estudiante;
  return permissions[action]?.includes(resource) || false;
}
 
/* ---------- Negar el permiso ----------
   Qué hace: Muestra el aviso "No tienes permisos…".
   Por qué: Para que la persona entienda por qué no pasó nada. */
function denyPermission(){
  alert("No tienes permisos para realizar esta acción con tu cargo.");
  return false;
}
 
/* ---------- Exigir permiso ----------
   Qué hace: Si tiene permiso devuelve verdadero; si no, muestra el aviso.
   Por qué: Se pone al inicio de cada acción para protegerla en una sola línea. */
function requirePermission(action, resource){
  return hasPermission(action, resource) || denyPermission();
}
 
/* ---------- Aplicar permisos a la pantalla ----------
   Qué hace: Muestra u oculta botones, menús y páginas según el cargo (Administración solo admin, Mis estudiantes solo profesor, etc.).
   Por qué: Así cada persona ve solo lo que puede usar. */
function applyPermissions(){
 
  const isAdmin = getRole() === "admin";
  const show = (el, ok) => { if(el) el.style.display = ok ? "" : "none"; };
 
  // Administración: solo para el administrador (botón del menú y página).
  document.querySelectorAll(".nav button").forEach(btn => {
    if((btn.textContent || "").includes("Administración")) show(btn, isAdmin);
  });
 
  // Mis estudiantes: solo profesor
  document.querySelectorAll('.nav button[onclick*="\'estudiantes\'"]')
    .forEach(btn => show(btn, hasPermission("view","estudiantes")));

  const adminPage = $("admin");
  show(adminPage, isAdmin);
  if(adminPage && !isAdmin) adminPage.classList.remove("active");
 
  // Nueva actividad: profesor y administrador.
  document.querySelectorAll('button[onclick="openModal()"], button[onclick="openModal();"]')
    .forEach(btn => show(btn, hasPermission("create","actividad")));
 
  show($("addSubjectBtn"),     hasPermission("create","materia"));
  if(typeof syncAdminNavLabel === "function") syncAdminNavLabel(isAdmin);
 
  // Guardar perfil
  show(document.querySelector('#perfil .actions .btn:not(.secondary)'), hasPermission("edit","perfil"));
 
  // Nuevo usuario: solo administrador
  show(document.querySelector('#admin .section-head .btn'), isAdmin);
 }


/* ---------- Materias y grupos de cada cuenta ----------
   Qué hace: Funciones para saber qué materias y grupos tiene cada profesor o estudiante.
   Por qué: Con eso se decide qué actividades y eventos ve cada uno. */

/* ---------- Normalizar texto ----------
   Qué hace: Pasa el texto a minúsculas y sin tildes.
   Por qué: Para comparar nombres aunque estén escritos distinto. */
function normText(t){
  return String(t == null ? "" : t).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/* ---------- Materias del profesor ----------
   Qué hace: Devuelve la lista de materias que dicta (puede ser más de una).
   Por qué: Hay profesores con una sola materia y otros con varias. */
// Materias que dicta un profesor (puede ser más de una)
function teacherSubjects(u = currentUser){
  if(!u) return [];
  if(Array.isArray(u.subjects) && u.subjects.length) return u.subjects.map(String);
  return u.subject ? [String(u.subject)] : [];
}

/* ---------- Materias en texto ----------
   Qué hace: Junta las materias en una frase ("Matemáticas y Física").
   Por qué: Para mostrarlas bonito en pantalla. */
// "Matemáticas", "Matemáticas y Física", "Matemáticas, Física y Química"
function teacherSubjectsText(u = currentUser){
  const l = teacherSubjects(u);
  return l.length < 2 ? (l[0] || "") : l.slice(0, -1).join(", ") + " y " + l[l.length - 1];
}

/* ---------- Grupos del profesor ----------
   Qué hace: Devuelve los grupos que atiende; si no tiene (cuenta antigua), no se limita por grupo.
   Por qué: Para que un profesor solo trabaje con sus grupos. */
// Grupos que atiende un profesor. null = cuenta antigua sin grupos (no se limita por grupo)
function teacherGroups(u = currentUser){
  return (u && Array.isArray(u.groups) && u.groups.length) ? u.groups : null;
}

/* ---------- Grupo del estudiante ----------
   Qué hace: Devuelve el grupo del estudiante (ej. 7-1).
   Por qué: Se usa para mostrarle solo lo de su grupo. */
// Grupo del estudiante (ej. "7-1")
function studentGroup(u = currentUser){
  return u && u.grade ? String(u.grade) : "";
}

/* ---------- ¿Puede el profesor usar esa materia y grupo? ----------
   Qué hace: Revisa que la materia sea suya y el grupo uno de los suyos.
   Por qué: Evita que un profesor ponga actividades en materias o grupos ajenos. */
// ¿Puede el profesor trabajar con esa materia y ese grupo?
function teacherCanUse(subject, group){
  const okSubject = teacherSubjects().some(s => normText(s) === normText(subject));
  const groups = teacherGroups();
  return okSubject && (!group || !groups || groups.includes(group));
}

/* ---------- ¿Puede ver la actividad? ----------
   Qué hace: Admin: todas. Profesor: las de su materia y grupo. Estudiante: las de su grupo.
   Por qué: Cada quien debe ver solo lo suyo. */
// ¿Esta actividad le corresponde a quien tiene la sesión iniciada?
function canSeeActivity(a){
  if(!a) return false;
  const role = getRole();
  if(role === "admin") return true;
  if(role === "profesor") return teacherCanUse(a.subject, a.group);
  return !a.group || a.group === studentGroup();      // estudiante: solo su grupo
}

/* ---------- ¿Puede gestionar la actividad? ----------
   Qué hace: Admin: todas. Profesor: solo su materia y su grupo. Estudiante: ninguna.
   Por qué: Para que nadie modifique actividades que no le tocan. */
// ¿Puede editarla o borrarla? (admin: todas; profesor: solo su materia y su grupo)
function canManageActivity(a){
  const role = getRole();
  if(role === "admin") return true;
  if(role === "profesor") return teacherCanUse(a?.subject, a?.group);
  return false;
}

/* ---------- ¿Puede gestionar el evento? ----------
   Qué hace: Admin: todos. Profesor: solo los que él publicó. Los demás: ninguno.
   Por qué: Los eventos del administrador (formación, izada de bandera…) son solo suyos. */
// Eventos del calendario.
// Los que puso el administrador (formación, izada de bandera…) son solo suyos;
// cada profesor solo edita o borra los que él mismo publicó.
function canManageEvent(ev){
  const role = getRole();
  if(role === "admin") return true;
  if(role === "profesor") return !!ev && !!currentUser && ev.by === currentUser.username;
  return false;
}

/* ---------- ¿Puede ver el evento? ----------
   Qué hace: Sin grupos es para todos; con grupos, solo para esos grupos.
   Por qué: Así los avisos llegan solo a quienes les importan. */
// ¿Puede ver el evento? (sin grupos = para todos; con grupos = solo esos grupos)
function canSeeEvent(ev){
  if(!ev) return false;
  const role = getRole();
  if(role === "admin" || !Array.isArray(ev.groups) || !ev.groups.length) return true;
  if(role === "profesor"){
    if(canManageEvent(ev)) return true;
    const mine = teacherGroups();
    return !mine || ev.groups.some(g => mine.includes(g));
  }
  return ev.groups.includes(studentGroup());
}

/* ---------- Ventanas propias ----------
   Qué hace: Reemplazan los cuadros del navegador (alert, confirm, prompt) por ventanas bonitas: adeAlert, adeConfirm, adePrompt y adeForm. Tienen un tipo "groups" para elegir grupos.
   Por qué: Se ven mejor, son iguales en todo el programa y se pueden personalizar. */

/* ---------- Guardar el alert original ----------
   Qué hace: Guarda el alert() del navegador.
   Por qué: Por si hay que usarlo cuando la página aún no está lista. */
const adeNativeAlert = window.alert ? window.alert.bind(window) : null;

/* ---------- Fila de ventanas ----------
   Qué hace: Una promesa que lleva la cuenta de las ventanas pendientes.
   Por qué: Para que se muestre una ventana a la vez. */
let adeQueue = Promise.resolve();

/* ---------- Una ventana a la vez ----------
   Qué hace: Si se piden varias ventanas, salen una después de otra.
   Por qué: Evita ventanas encimadas. */
// Una ventana a la vez: si se piden varias, salen una después de otra
function adeEnqueue(fn){
  const p = adeQueue.then(fn);
  adeQueue = p.catch(() => {});
  return p;
}

/* ---------- Limpiar texto ----------
   Qué hace: Cambia símbolos especiales por versiones seguras.
   Por qué: Para que lo escrito no dañe la página. */
function adeEsc(t){
  return String(t == null ? "" : t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ---------- Estilos de las ventanas ----------
   Qué hace: Agrega los estilos de las ventanas, una sola vez.
   Por qué: Para no tocar el archivo de estilos. */
function ensureDialogStyle(){

  if(document.getElementById("adeDialogStyle")) return;

  const st = document.createElement("style");
  st.id = "adeDialogStyle";
  st.textContent = `
    .ade-dlg-back{position:fixed; inset:0; z-index:10000; display:grid; place-items:center; padding:16px; overflow:auto;
      background:rgba(2,8,20,.74); backdrop-filter:blur(3px); animation:adeFade .16s ease}
    .ade-dlg{width:min(460px,100%); max-height:calc(100vh - 32px); overflow:auto; box-sizing:border-box; color:#e8edf8;
      background:linear-gradient(180deg,#121c38 0%,#0d1730 100%); border:1px solid #26304a; border-radius:18px; padding:22px;
      box-shadow:0 24px 70px rgba(0,0,0,.55); font-family:Arial,Helvetica,sans-serif; animation:adePop .18s ease}
    @keyframes adeFade{from{opacity:0}to{opacity:1}}
    @keyframes adePop{from{opacity:0; transform:translateY(8px) scale(.98)}to{opacity:1; transform:none}}
    .ade-dlg-head{display:flex; align-items:center; gap:10px; margin-bottom:14px}
    .ade-dlg-head h3{margin:0; flex:1; font-size:18px; color:#fff}
    .ade-dlg-ico{flex:none; width:36px; height:36px; border-radius:11px; display:grid; place-items:center; font-size:18px;
      background:rgba(35,160,90,.18); border:1px solid #23a05a}
    .ade-dlg-ico.danger{background:rgba(239,68,68,.16); border-color:#ef4444}
    .ade-dlg-x{flex:none; background:none; border:0; color:#aeb8cc; font-size:17px; cursor:pointer; padding:4px 8px}
    .ade-dlg-x:hover{color:#fff}
    .ade-dlg-text{margin:0 0 14px; font-size:14px; line-height:1.55; color:#c9d3e6; white-space:pre-line}
    .ade-fields{display:grid; grid-template-columns:1fr 1fr; gap:12px 12px}
    .ade-field{grid-column:1 / -1; min-width:0}
    .ade-field.half{grid-column:auto}
    .ade-field label{display:block; margin:0 0 6px; font-size:12px; color:#9fb0cf}
    .ade-field input,.ade-field select,.ade-field textarea{width:100%; box-sizing:border-box; background:#0b1020; color:#fff;
      border:1px solid #303b57; border-radius:10px; padding:11px 12px; font:inherit; font-size:14px; outline:none; color-scheme:dark}
    .ade-field textarea{resize:vertical; min-height:70px}
    .ade-field input:focus,.ade-field select:focus,.ade-field textarea:focus{border-color:#4fbf8a; box-shadow:0 0 0 3px rgba(35,160,90,.18)}
    .ade-dlg-err{min-height:16px; margin:12px 0 0; font-size:12px; line-height:1.4; color:#ffb3c6}
    .ade-dlg-actions{display:flex; gap:10px; justify-content:flex-end; margin-top:14px}
    .ade-btn{border:0; border-radius:11px; padding:11px 20px; font:inherit; font-size:14px; font-weight:bold; cursor:pointer; color:#fff;
      background:linear-gradient(180deg,#2fb86d,#238b5b); box-shadow:0 6px 18px rgba(35,139,91,.32)}
    .ade-btn:hover{filter:brightness(1.08)}
    .ade-btn.ghost{background:#1a2544; color:#dfe5f1; box-shadow:none; border:1px solid #303b57}
    .ade-btn.danger{background:linear-gradient(180deg,#ef5350,#c62828); box-shadow:0 6px 18px rgba(198,40,40,.32)}
    .ade-groups{display:flex; flex-direction:column; gap:10px}
    .ade-g-scroll{max-height:250px; overflow:auto; padding-right:4px; display:flex; flex-direction:column; gap:10px}
    .ade-g-row{background:rgba(5,14,34,.55); border:1px solid #26304a; border-radius:12px; padding:10px 12px}
    .ade-g-head{display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:13px}
    .ade-g-chips{display:flex; flex-wrap:wrap; gap:6px}
    .ade-chip{background:#0b1020; color:#cdd6ea; border:1px solid #303b57; border-radius:999px; padding:6px 12px; font:inherit; font-size:12px; cursor:pointer}
    .ade-chip:hover{border-color:#4fbf8a}
    .ade-chip.on{background:#238b5b; border-color:#2fb86d; color:#fff; font-weight:bold}
    .ade-chip.big{align-self:flex-start; padding:9px 16px; font-size:13px}
    .ade-mini{background:none; border:1px solid #303b57; color:#8fe3b3; border-radius:8px; padding:4px 10px; font:inherit; font-size:11px; cursor:pointer}
    .ade-mini:hover{background:rgba(35,139,91,.18)}
    .ade-mini.on{background:#238b5b; border-color:#2fb86d; color:#fff}
    .ade-g-sum{margin:0; min-height:16px; font-size:12px; line-height:1.4; color:#8fe3b3}
    @media(max-width:480px){ .ade-fields{grid-template-columns:1fr} .ade-field.half{grid-column:1 / -1} }
  `;
  document.head.appendChild(st);
}

/* ---------- Lista de grupos ----------
   Qué hace: Devuelve los grupos del colegio (los del servidor o, si no llegaron, del 6-1 al 11-9).
   Por qué: Así siempre hay una lista para ofrecer. */
function adeGroupList(){
  if(window.ADE_CURRICULUM && Array.isArray(ADE_CURRICULUM.groups) && ADE_CURRICULUM.groups.length) return ADE_CURRICULUM.groups.slice();
  const l = [];
  for(let g = 6; g <= 11; g++) for(let c = 1; c <= 9; c++) l.push(g + "-" + c);
  return l;
}

/* ---------- Ordenar grupos ----------
   Qué hace: Ordena los grupos (6-1, 6-2… 7-1…).
   Por qué: Para que se vean en orden y no mezclados. */
function adeSortGroups(list){
  return list.slice().sort((a, b) => {
    const x = a.split("-").map(Number), y = b.split("-").map(Number);
    return (x[0] - y[0]) || ((x[1] || 0) - (y[1] || 0));
  });
}

/* ---------- Elegir grupos ----------
   Qué hace: Dibuja el selector de grupos: todo el colegio, un grado completo o solo algunos.
   Por qué: Es lo que se usa al publicar un evento o actividad para ciertos grupos. */
// Elegir grupos: "Todo el colegio", un grado completo (7-1 … 7-9) o solo algunos
function adeGroupsMount(box, f){

  const allowed = Array.isArray(f.allowed) && f.allowed.length ? new Set(f.allowed) : null;
  const list = adeGroupList().filter(g => !allowed || allowed.has(g));
  const byGrade = {};
  list.forEach(g => { const n = g.split("-")[0]; (byGrade[n] = byGrade[n] || []).push(g); });
  const grades = Object.keys(byGrade).sort((a, b) => a - b);

  const sel = new Set((f.value || []).filter(g => list.indexOf(g) !== -1));
  let allMode = !!f.allowAll && sel.size === 0;

  box.innerHTML =
    (f.allowAll ? '<button type="button" class="ade-chip big" data-all="1">🏫 Todo el colegio</button>' : '') +
    '<div class="ade-g-scroll">' + grades.map(n =>
      '<div class="ade-g-row"><div class="ade-g-head"><b>Grado ' + n + '</b>' +
      '<button type="button" class="ade-mini" data-grade="' + n + '">Todo el grado</button></div>' +
      '<div class="ade-g-chips">' + byGrade[n].map(g => '<button type="button" class="ade-chip" data-g="' + g + '">' + g + '</button>').join("") + '</div></div>'
    ).join("") + '</div><p class="ade-g-sum"></p>';

  function summary(){
    if(allMode) return "Se publicará para todo el colegio.";
    if(!sel.size) return "Elige al menos un grupo.";
    const parts = [];
    grades.forEach(n => {
      const gs = byGrade[n];
      const chosen = gs.filter(g => sel.has(g));
      if(!chosen.length) return;
      parts.push(chosen.length === gs.length && gs.length > 1 ? "Grado " + n + " completo" : chosen.join(", "));
    });
    return sel.size + (sel.size === 1 ? " grupo: " : " grupos: ") + parts.join(" · ");
  }

  function paint(){
    const all = box.querySelector("[data-all]");
    if(all) all.classList.toggle("on", allMode);
    box.querySelectorAll("[data-g]").forEach(b => b.classList.toggle("on", sel.has(b.dataset.g)));
    box.querySelectorAll("[data-grade]").forEach(b => {
      const gs = byGrade[b.dataset.grade];
      b.classList.toggle("on", gs.every(g => sel.has(g)));
    });
    box.querySelector(".ade-g-sum").textContent = summary();
  }

  box.addEventListener("click", e => {
    const b = e.target.closest("button");
    if(!b || !box.contains(b)) return;

    if(b.dataset.all){
      allMode = true;
      sel.clear();
    }else if(b.dataset.g){
      if(sel.has(b.dataset.g)) sel.delete(b.dataset.g); else sel.add(b.dataset.g);
      allMode = false;
    }else if(b.dataset.grade){
      const gs = byGrade[b.dataset.grade];
      if(gs.every(g => sel.has(g))) gs.forEach(g => sel.delete(g)); else gs.forEach(g => sel.add(g));
      allMode = false;
    }
    if(f.allowAll && !sel.size) allMode = true;     // si no queda ninguno, vuelve a "todo el colegio"
    paint();
  });

  paint();

  return {
    get: () => allMode ? [] : adeSortGroups(Array.from(sel)),
    valid: () => allMode || sel.size > 0
  };
}

/* ---------- Campo del formulario ----------
   Qué hace: Arma cada campo según su tipo (lista, texto largo, grupos o texto normal).
   Por qué: Así un mismo formulario puede tener distintos tipos de campos. */
function adeFieldHtml(f){

  const id = "adeF_" + f.id;
  let input;

  if(f.type === "select"){
    input = '<select id="' + id + '">' + (f.options || []).map(o => {
      const v = typeof o === "object" ? o.value : o;
      const l = typeof o === "object" ? o.label : o;
      return '<option value="' + adeEsc(v) + '"' + (String(v) === String(f.value) ? " selected" : "") + '>' + adeEsc(l) + '</option>';
    }).join("") + '</select>';
  }else if(f.type === "textarea"){
    input = '<textarea id="' + id + '" rows="3" maxlength="' + (f.maxlength || 500) + '" placeholder="' + adeEsc(f.placeholder || "") + '">' + adeEsc(f.value || "") + '</textarea>';
  }else if(f.type === "groups"){
    input = '<div class="ade-groups" id="' + id + '"></div>';
  }else{
    input = '<input id="' + id + '" type="' + (f.type || "text") + '" value="' + adeEsc(f.value || "") + '"' +
      (f.maxlength ? ' maxlength="' + f.maxlength + '"' : "") + ' placeholder="' + adeEsc(f.placeholder || "") + '" autocomplete="off">';
  }

  return '<div class="ade-field' + (f.half ? " half" : "") + '"><label' + (f.type === "groups" ? "" : ' for="' + id + '"') + '>' + adeEsc(f.label || "") + '</label>' + input + '</div>';
}

/* ---------- Mostrar una ventana ----------
   Qué hace: Arma y muestra la ventana con título, campos y botones; devuelve lo escrito, {} si no había campos, o null si se cancela.
   Por qué: Es la base de todas las ventanas; las demás funciones la reutilizan. */
// Muestra una ventana. Devuelve (como promesa) los valores escritos, {} si no tenía campos, o null si se canceló.
function adeShow(o){

  return adeEnqueue(() => new Promise(resolve => {

    if(!document.body){ resolve(null); return; }
    ensureDialogStyle();

    const fields = o.fields || [];
    const back = document.createElement("div");
    back.className = "ade-dlg-back";
    back.innerHTML =
      '<div class="ade-dlg" role="dialog" aria-modal="true">' +
        '<div class="ade-dlg-head">' +
          (o.icon ? '<span class="ade-dlg-ico' + (o.danger ? " danger" : "") + '">' + o.icon + '</span>' : "") +
          '<h3>' + adeEsc(o.title || "") + '</h3>' +
          '<button type="button" class="ade-dlg-x" aria-label="Cerrar">✕</button>' +
        '</div>' +
        (o.text ? '<p class="ade-dlg-text">' + adeEsc(o.text) + '</p>' : "") +
        (fields.length ? '<div class="ade-fields">' + fields.map(adeFieldHtml).join("") + '</div>' : "") +
        '<p class="ade-dlg-err" role="alert"></p>' +
        '<div class="ade-dlg-actions">' +
          (o.cancel === false ? "" : '<button type="button" class="ade-btn ghost" data-cancel>' + adeEsc(o.cancel || "Cancelar") + '</button>') +
          '<button type="button" class="ade-btn' + (o.danger ? " danger" : "") + '" data-ok>' + adeEsc(o.ok || "Aceptar") + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);

    const pickers = {};
    fields.forEach(f => {
      if(f.type === "groups") pickers[f.id] = adeGroupsMount(back.querySelector("#adeF_" + f.id), f);
    });

    const errBox = back.querySelector(".ade-dlg-err");
    const showErr = t => { errBox.textContent = t || ""; };

    function finish(result){
      document.removeEventListener("keydown", onKey, true);
      back.remove();
      resolve(result);
    }

    function submit(){
      const vals = {};
      for(const f of fields){
        if(f.type === "groups"){
          if(!pickers[f.id].valid()){ showErr("Elige al menos un grupo."); return; }
          vals[f.id] = pickers[f.id].get();
        }else{
          const el = back.querySelector("#adeF_" + f.id);
          const v = f.type === "select" ? el.value : String(el.value).trim();
          if(f.required && !v){ showErr("Completa: " + (f.label || f.id) + "."); el.focus(); return; }
          vals[f.id] = v;
        }
      }
      if(o.validate){
        const msg = o.validate(vals);
        if(msg){ showErr(msg); return; }
      }
      finish(vals);
    }

    function onKey(e){
      if(e.key === "Escape"){ e.stopPropagation(); finish(null); }
      else if(e.key === "Enter" && e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")){ e.preventDefault(); submit(); }
    }
    document.addEventListener("keydown", onKey, true);

    back.addEventListener("mousedown", e => { if(e.target === back) finish(null); });
    back.querySelector(".ade-dlg-x").addEventListener("click", () => finish(null));
    const cancel = back.querySelector("[data-cancel]");
    if(cancel) cancel.addEventListener("click", () => finish(null));
    back.querySelector("[data-ok]").addEventListener("click", submit);

    const first = back.querySelector(".ade-fields input, .ade-fields select, .ade-fields textarea");
    setTimeout(() => (first || back.querySelector("[data-ok]")).focus(), 30);
  }));
}

/* ---------- Formulario ----------
   Qué hace: Atajo para abrir una ventana con campos.
   Por qué: Nombre más claro para quien lo usa. */
function adeForm(o){ return adeShow(o); }

/* ---------- Aviso ----------
   Qué hace: Muestra un aviso con un solo botón "Entendido".
   Por qué: Para informar algo sin pedir respuesta. */
function adeAlert(text, title){
  return adeShow({title: title || "Aviso", icon: "ℹ️", text: String(text == null ? "" : text), ok: "Entendido", cancel: false}).then(() => undefined);
}

/* ---------- Pregunta Sí/No ----------
   Qué hace: Muestra una pregunta y devuelve true o false.
   Por qué: Se usa antes de acciones serias como borrar. */
// Pregunta Sí/No. Devuelve true o false.
function adeConfirm(text, o){
  o = o || {};
  return adeShow({
    title: o.title || "¿Estás seguro?", icon: o.icon || (o.danger ? "🗑️" : "❓"), text: text,
    ok: o.ok || "Aceptar", cancel: o.cancel || "Cancelar", danger: !!o.danger
  }).then(r => r !== null);
}

/* ---------- Pedir un texto ----------
   Qué hace: Pide que se escriba algo y lo devuelve (o null si se cancela).
   Por qué: Reemplaza al prompt() del navegador. */
// Pide un texto. Devuelve lo escrito o null si se canceló.
function adePrompt(label, value, o){
  o = o || {};
  return adeShow({
    title: o.title || "Escribe un dato", icon: o.icon || "✏️", ok: o.ok || "Guardar",
    fields: [{id:"v", label: label, type: "text", value: value || "", placeholder: o.placeholder || "", maxlength: o.maxlength || 100, required: true}],
    validate: o.validate ? (v => o.validate(v.v)) : null
  }).then(r => r ? r.v : null);
}

/* ---------- Reemplazar el alert ----------
   Qué hace: Hace que todos los alert() del programa usen la ventana bonita.
   Por qué: Así no hay que cambiar cada archivo uno por uno. */
// Los alert() de todo el programa salen con la ventana bonita (sin tocar cada archivo)
window.alert = function(msg){
  if(!document.body){ if(adeNativeAlert) adeNativeAlert(msg); return; }
  adeAlert(msg);
};