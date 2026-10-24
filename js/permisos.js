/* =========================================================
   Aquí solo están los permisos por cargo y las reglas de quién ve y gestiona qué.
   Los datos (cuentas, materias, actividades, horarios, calendario y notificaciones)
   viven en la base de datos del servidor, no en este archivo.
   ========================================================= */

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


/* =========================================================
   PERMISOS POR CARGO
   ========================================================= */
 
const $ = id => document.getElementById(id);   // atajo usado en todos los archivos
 
const ROLE_PERMISSIONS = {
  admin: {
    view:   ["inicio","actividades","materias","horario","calendario","perfil","admin"],
    create: ["actividad","usuario","materia","horario","calendario","aviso"],
    edit:   ["actividad","usuario","materia","horario","calendario","perfil"],
    delete: ["actividad","usuario","materia","horario","calendario"]
  },
  profesor: {
    view:   ["inicio","actividades","materias","horario","calendario","perfil"],
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
  }
};
 
const ROLE_ALIASES = {
  teacher:"profesor", docente:"profesor",
  student:"estudiante", alumno:"estudiante",
  administrator:"admin"
};
 
function getRole(){
  if(!currentUser || !currentUser.role) return "estudiante";
  const role = String(currentUser.role).toLowerCase().trim();
  return ROLE_ALIASES[role] || role;
}
 
function hasPermission(action, resource){
  const permissions = ROLE_PERMISSIONS[getRole()] || ROLE_PERMISSIONS.estudiante;
  return permissions[action]?.includes(resource) || false;
}
 
function denyPermission(){
  alert("No tienes permisos para realizar esta acción con tu cargo.");
  return false;
}
 
function requirePermission(action, resource){
  return hasPermission(action, resource) || denyPermission();
}
 
function applyPermissions(){
 
  const isAdmin = getRole() === "admin";
  const show = (el, ok) => { if(el) el.style.display = ok ? "" : "none"; };
 
  // Administración: solo para el administrador (botón del menú y página).
  document.querySelectorAll(".nav button").forEach(btn => {
    if((btn.textContent || "").includes("Administración")) show(btn, isAdmin);
  });
 
  const adminPage = $("admin");
  show(adminPage, isAdmin);
  if(adminPage && !isAdmin) adminPage.classList.remove("active");
 
  // Nueva actividad: profesor y administrador.
  document.querySelectorAll('button[onclick="openModal()"], button[onclick="openModal();"]')
    .forEach(btn => show(btn, hasPermission("create","actividad")));
 
  show($("addSubjectBtn"),     hasPermission("create","materia"));
  // "Agregar día" ya no existe: la semana es fija (lunes a viernes)
  show($("addScheduleDayBtn"), false);
  if(typeof syncAdminNavLabel === "function") syncAdminNavLabel(isAdmin);
 
  // Guardar perfil
  show(document.querySelector('#perfil .actions .btn:not(.secondary)'), hasPermission("edit","perfil"));
 
  // Nuevo usuario: solo administrador
  show(document.querySelector('#admin .section-head .btn'), isAdmin);
 
  // Grado: el administrador no tiene grado
  document.querySelectorAll("#perfil .field").forEach(field => {
    const label = field.querySelector("label");
    if(label && label.textContent.trim() === "Grado") show(field, !isAdmin);
  });
}


/* ---------- Materias y grupos de cada cuenta ---------- */

function normText(t){
  return String(t == null ? "" : t).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Materias que dicta un profesor (puede ser más de una)
function teacherSubjects(u = currentUser){
  if(!u) return [];
  if(Array.isArray(u.subjects) && u.subjects.length) return u.subjects.map(String);
  return u.subject ? [String(u.subject)] : [];
}

// "Matemáticas", "Matemáticas y Física", "Matemáticas, Física y Química"
function teacherSubjectsText(u = currentUser){
  const l = teacherSubjects(u);
  return l.length < 2 ? (l[0] || "") : l.slice(0, -1).join(", ") + " y " + l[l.length - 1];
}

// Grupos que atiende un profesor. null = cuenta antigua sin grupos (no se limita por grupo)
function teacherGroups(u = currentUser){
  return (u && Array.isArray(u.groups) && u.groups.length) ? u.groups : null;
}

// Grupo del estudiante (ej. "7-1")
function studentGroup(u = currentUser){
  return u && u.grade ? String(u.grade) : "";
}

// ¿Puede el profesor trabajar con esa materia y ese grupo?
function teacherCanUse(subject, group){
  const okSubject = teacherSubjects().some(s => normText(s) === normText(subject));
  const groups = teacherGroups();
  return okSubject && (!group || !groups || groups.includes(group));
}

// ¿Esta actividad le corresponde a quien tiene la sesión iniciada?
function canSeeActivity(a){
  if(!a) return false;
  const role = getRole();
  if(role === "admin") return true;
  if(role === "profesor") return teacherCanUse(a.subject, a.group);
  return !a.group || a.group === studentGroup();      // estudiante: solo su grupo
}

// ¿Puede editarla o borrarla? (admin: todas; profesor: solo su materia y su grupo)
function canManageActivity(a){
  const role = getRole();
  if(role === "admin") return true;
  if(role === "profesor") return teacherCanUse(a?.subject, a?.group);
  return false;
}

// Eventos del calendario.
// Los que puso el administrador (formación, izada de bandera…) son solo suyos;
// cada profesor solo edita o borra los que él mismo publicó.
function canManageEvent(ev){
  const role = getRole();
  if(role === "admin") return true;
  if(role === "profesor") return !!ev && !!currentUser && ev.by === currentUser.username;
  return false;
}

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