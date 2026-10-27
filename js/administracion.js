/* =========================================================
   ADMINISTRACIÓN DE USUARIOS
   Qué hace: Maneja la lista de usuarios: la tabla del administrador, la lista "Mis estudiantes" del profesor, eliminar cuentas y la ventana para editarlas.
   Por qué: Es el centro de las cuentas de la agenda; cada rol (admin, profesor, estudiante, acudiente) ve y puede hacer cosas distintas.
   ========================================================= */

/* ---------- Cuenta del administrador ----------
   Qué hace: Datos de la cuenta "admin" que siempre debe existir.
   Por qué: Sin un administrador nadie podría gestionar a los demás usuarios. */
const defaultAdmin = {
  id:"mx9p3j",
  name:"Administrador",
  username:"admin",
  email:"admin@gmail.com",
  password:"",
  grade:"11",
  role:"admin",
  createdAt:new Date().toLocaleString("es-CO")
};

/* ---------- Lista de usuarios ----------
   Qué hace: Lee los usuarios guardados en el navegador (localStorage); si no hay, empieza con una lista vacía.
   Por qué: Así la lista no se pierde al recargar la página. */
let users = JSON.parse(localStorage.getItem("ade_users") || "null");
if(!Array.isArray(users)) users = [];

/* ---------- Asegurar que exista el admin ----------
   Qué hace: Si no está el usuario "admin" en la lista, lo agrega al principio.
   Por qué: Para que siempre se pueda entrar como administrador sin borrar a los demás. */
// Se garantiza que la cuenta admin exista sin borrar las demás.
if(!users.some(u => String(u?.username || "").toLowerCase() === "admin")){
  users.unshift(defaultAdmin);
}

/* ---------- Nombres de los roles ----------
   Qué hace: Convierte el rol interno (profesor, estudiante…) en el nombre que se muestra.
   Por qué: Para que en la tabla se lea bien escrito. */
const ROLE_LABELS = {admin:"Admin", profesor:"Profesor", estudiante:"Estudiante", acudiente:"Acudiente"};

/* ---------- Guardar usuarios ----------
   Qué hace: Guarda la lista actual de usuarios en el navegador.
   Por qué: Se llama cada vez que la lista cambia para no perder los cambios. */
function saveUsers(){
  localStorage.setItem("ade_users", JSON.stringify(users));
}

/* ---------- Traer usuarios del servidor ----------
   Qué hace: Pide al servidor las cuentas que esta persona puede ver y reemplaza la lista local; también actualiza los datos de quien tiene la sesión abierta.
   Por qué: El servidor decide qué se puede ver (el admin ve todos, el profesor sus estudiantes, etc.), así nadie ve datos que no le tocan. */
// Trae del servidor (api/datos.php) las cuentas que este usuario puede ver:
// el administrador ve todas, el profesor ve a los estudiantes de sus grupos,
// el estudiante ve a los profesores de su grupo. Reemplaza la lista local.
async function cargarUsuariosServidor(){

  try{
    const resp = await fetch("api/datos.php", {credentials:"same-origin"});
    const d = await resp.json();
    if(!d || !d.ok || !Array.isArray(d.usuarios)) return false;

    users = d.usuarios.map(u => Object.assign({}, u, {password:""}));
    saveUsers();

    if(typeof currentUser !== "undefined" && currentUser){
      const me = users.find(u => String(u.username).toLowerCase() === String(currentUser.username).toLowerCase());
      if(me){
        currentUser = me;
        localStorage.setItem("ade_current_user", JSON.stringify(me));
      }
    }
    return true;

  }catch(e){
    return false;
  }
}


/* ---------- Revisar correos ----------
   Qué hace: Responde si un texto parece un correo válido (algo@algo.com).
   Por qué: Para avisar antes de guardar un correo mal escrito. */

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ---------- Lista de materias para elegir ----------
   Qué hace: Llena un desplegable con las materias; si la materia del usuario ya no está en la lista, también la muestra.
   Por qué: Así no se pierde la materia de un profesor aunque la hayan quitado de la lista. */

// Llena un <select> con las materias; si la materia del usuario ya no está en la lista, también se muestra.
// optional=true: la materia es opcional, así que se ofrece "Ninguna" como opción elegible.
// optional=false: "Selecciona" es solo una pista; no se puede volver a elegir una vez abierta la lista.
function fillSubjectSelect(select, selected, optional){
  if(!select) return;
  const list = (typeof subjects !== "undefined" && Array.isArray(subjects)) ? [...subjects] : [];
  if(selected && !list.includes(selected)) list.push(selected);
  select.innerHTML = (optional
      ? '<option value="">Ninguna</option>'
      : '<option value="" hidden disabled>Selecciona</option>') +
    list.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  select.value = selected || "";
}


/* ---------- Tabla de usuarios (admin) ----------
   Qué hace: Dibuja una fila por usuario con nombre, rol, materia, grado, último acceso y botones de editar o eliminar.
   Por qué: Es la pantalla principal del administrador. El admin está protegido (no se elimina) y el acudiente se edita desde su perfil. */

function renderAdminUsers(){

  const body = $("adminUsersBody");
  if(getRole() !== "admin" || !body) return;

  // data-label = nombre de la columna (en celular cada usuario se ve como una tarjeta)
  body.innerHTML = users.map((u, i) => `
    <tr>
      <td data-label="#">${i + 1}</td>
      <td data-label="Nombre">${escapeHtml(u.name || "")}</td>
      <td data-label="Usuario">${escapeHtml(u.username || "")}</td>
      <td data-label="Correo">${u.role === "admin" ? "—" : escapeHtml(u.email || "")}</td>
      <td data-label="Rol">${ROLE_LABELS[u.role] || "Estudiante"}</td>
      <td data-label="Materia">${u.role === "profesor" ? escapeHtml(teacherSubjectsText(u) || "Sin materia") : "—"}</td>
      <td data-label="Grado">${u.role === "admin" ? "—" : escapeHtml((u.role === "profesor" && teacherGroups(u) ? teacherGroups(u).join(", ") : u.grade) || "")}</td>
      <td data-label="Creado">${escapeHtml(u.createdAt || "")}</td>
      <td data-label="Último acceso">${escapeHtml(u.lastLogin || "Nunca")}</td>
      <td>
        <div class="ibtn-row">
          ${u.role === "acudiente" ? ibtn("lock", "Se edita desde su perfil", "") : ibtn("edit", "Editar usuario", `openUserEditor(${i})`)}
          ${u.role === "admin"
            ? ibtn("lock", "Cuenta protegida", "")
            : ibtn("trash", "Eliminar usuario", `deleteRegisteredUser(${i})`)}
        </div>
      </td>
    </tr>
  `).join("");
}

/* ---------- Refrescar la tabla ----------
   Qué hace: Vuelve a pedir las cuentas al servidor y redibuja la tabla.
   Por qué: Para ver datos actualizados, como la hora del último acceso. */
// Vuelve a pedir las cuentas al servidor (para ver la hora de acceso más reciente) y redibuja la tabla
async function refreshAdminUsers(){
  if(getRole() !== "admin") return;
  if(await cargarUsuariosServidor()) renderAdminUsers();
}


/* ---------- Mis estudiantes (solo profesor) ----------
   Qué hace: Muestra los estudiantes de los grupos del profesor en orden alfabético, con un selector para ver un grupo a la vez.
   Por qué: El profesor solo necesita ver a sus propios estudiantes, y ordenados es más fácil encontrar a alguien. */

function renderMyStudents(){

  const body = $("myStudentsBody");
  if(!body || getRole() !== "profesor") return;

  const all = users.filter(u => u && u.role === "estudiante");

  // Lista de grupos que dicta el profesor (si no tiene grupos fijos, los de sus estudiantes)
  const mine = teacherGroups();
  const groups = typeof adeSortGroups === "function"
    ? adeSortGroups(mine ? mine.slice() : Array.from(new Set(all.map(u => String(u.grade || "")).filter(Boolean))))
    : (mine || []);

  const pick = $("myStudentsGroup");
  let group = "";
  if(pick){
    const keep = pick.value;
    pick.innerHTML = groups.map(g => `<option value="${escapeHtml(g)}">Grupo ${escapeHtml(g)}</option>`).join("");
    group = groups.indexOf(keep) !== -1 ? keep : (groups[0] || "");      // un grupo a la vez: por defecto el primero
    pick.value = group;
    pick.style.display = groups.length ? "" : "none";
  }

  const list = all
    .filter(u => !group || String(u.grade || "") === group)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es", {sensitivity:"base"}));

  const count = $("myStudentsCount");
  if(count) count.textContent = list.length + (list.length === 1 ? " estudiante" : " estudiantes");

  body.innerHTML = list.length
    ? list.map((u, i) => `
      <tr>
        <td data-label="#">${i + 1}</td>
        <td data-label="Nombre">${escapeHtml(u.name || "")}</td>
        <td data-label="Grado">${escapeHtml(u.grade || "")}</td>
        <td data-label="Último acceso">${escapeHtml(u.lastLogin || "Nunca")}</td>
      </tr>`).join("")
    : '<tr><td colspan="4" style="text-align:center;color:#7e8aa5">Todavía no hay estudiantes en este grupo.</td></tr>';
}

/* ---------- Refrescar Mis estudiantes ----------
   Qué hace: Pide los datos al servidor y vuelve a dibujar la lista del profesor.
   Por qué: Para que el "último acceso" esté al día. */
async function refreshMyStudents(){
  if(getRole() !== "profesor") return;
  if(await cargarUsuariosServidor()) renderMyStudents();
}

/* ---------- Eliminar un usuario ----------
   Qué hace: Revisa el permiso, pide confirmación, borra la cuenta en el servidor y la quita de la tabla.
   Por qué: Borrar es definitivo, por eso se confirma antes y el admin nunca se puede borrar. */
async function deleteRegisteredUser(index){

  if(!requirePermission("delete","usuario")) return;

  const user = users[index];
  if(!user || user.role === "admin") return;
  if(!user.codigo) return alert("Esta cuenta no viene del servidor. Recarga la página (F5) e intenta de nuevo.");
  if(!await adeConfirm(`Se eliminará la cuenta de ${user.name || user.username}. Esta acción no se puede deshacer.`, {title:"Eliminar cuenta", ok:"Sí, eliminar", danger:true})) return;

  const r = await apiPost("api/usuario_borrar.php", {rol:user.role, codigo:user.codigo});
  if(!r.ok) return alert(r.error || "No se pudo eliminar la cuenta.");

  const pos = users.indexOf(user);
  if(pos >= 0) users.splice(pos, 1);
  saveUsers();
  renderAdminUsers();
}

/* ---------- Botón "Nuevo usuario" ----------
   Qué hace: Revisa si la persona tiene permiso para crear usuarios.
   Por qué: No todos los roles pueden crear cuentas. */
// Botón "Nuevo usuario" del panel de administración
function createUserAction(){
  return requirePermission("create","usuario");
}


/* ---------- Editar usuarios (solo administrador) ----------
   Qué hace: Todo lo necesario para editar una cuenta: la ventana, abrirla, cerrarla y guardar.
   Por qué: Este archivo crea su propia ventana, así no hace falta tocar el HTML. */

/* ---------- Usuario que se está editando ----------
   Qué hace: Guarda la posición en la lista del usuario que está abierto en la ventana.
   Por qué: Así, al guardar, se sabe a quién corresponden los cambios. */
let editingUserIndex = null;

/* ---------- Crear la ventana de editar ----------
   Qué hace: Arma la ventana con los campos: nombre, usuario, correo, rol, materias, grupos, grado y contraseña nueva.
   Por qué: Se crea una sola vez y se reutiliza para cualquier usuario. */
function ensureUserEditModal(){

  if($("userEditModal")) return;

  const gradeOptions = [];
  for(let g = 6; g <= 11; g++){
    for(let c = 1; c <= 9; c++) gradeOptions.push(`<option value="${g}-${c}">${g}-${c}</option>`);
  }

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "userEditModal";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <h2>Editar usuario</h2>
        <button class="close" onclick="closeUserEditor()">×</button>
      </div>
      <div class="form-grid">
        <div class="field full">
          <label>Nombre completo</label>
          <input id="editUserName" type="text">
        </div>
        <div class="field">
          <label>Usuario</label>
          <input id="editUserUsername" type="text">
        </div>
        <div class="field">
          <label>Correo</label>
          <input id="editUserEmail" type="email" placeholder="correo@gmail.com">
        </div>
        <div class="field">
          <label>Rol</label>
          <select id="editUserRole"></select>
        </div>
        <div class="field" id="editUserSubjectField" style="display:none">
          <label>Materia que dicta</label>
          <select id="editUserSubject"></select>
        </div>
        <div class="field" id="editUserSubject2Field" style="display:none">
          <label>Segunda materia (opcional)</label>
          <select id="editUserSubject2"></select>
        </div>
        <div class="field" id="editUserGroupsField" style="display:none">
          <label>Grupos que atiende (ej. 7-1, 7-2)</label>
          <input id="editUserGroups" type="text" placeholder="Vacío = sin límite de grupo">
        </div>
        <div class="field" id="editUserGradeField">
          <label>Grado</label>
          <select id="editUserGrade">${gradeOptions.join("")}</select>
        </div>
        <div class="field full">
          <label>Nueva contraseña</label>
          <input id="editUserPass" type="password" placeholder="Déjala vacía para no cambiarla">
        </div>
      </div>
      <p id="editUserMessage" class="auth-message" style="min-height:18px"></p>
      <div class="actions">
        <button class="btn" onclick="saveEditedUser()">Guardar cambios</button>
        <button class="btn secondary" onclick="closeUserEditor()">Cancelar</button>
      </div>
    </div>
  `;
  modal.addEventListener("click", e => { if(e.target === modal) closeUserEditor(); });
  document.body.appendChild(modal);
  $("editUserRole").addEventListener("change", toggleEditSubject);
}

/* ---------- Mostrar campos de profesor ----------
   Qué hace: Muestra materia y grupos solo cuando el rol es Profesor.
   Por qué: A estudiantes y otros roles esos campos no les sirven. */
// Muestra la materia solo cuando el rol es Profesor
function toggleEditSubject(){
  const t = $("editUserRole").value === "profesor" ? "" : "none";
  $("editUserSubjectField").style.display = t;
  $("editUserSubject2Field").style.display = t;
  $("editUserGroupsField").style.display = t;
}

/* ---------- Crear la ventana al cargar ----------
   Qué hace: Llama a la función de arriba para que la ventana ya exista.
   Por qué: Así está lista cuando se hace clic en "Editar". */
ensureUserEditModal();

/* ---------- Abrir la ventana de editar ----------
   Qué hace: Llena los campos con los datos del usuario y muestra la ventana.
   Por qué: El tipo de cuenta no se puede cambiar porque cada tipo vive en su propia tabla del servidor. */
function openUserEditor(index){

  if(!requirePermission("edit","usuario")) return;

  const u = users[index];
  if(!u) return;

  editingUserIndex = index;
  const isAdminAcc = u.role === "admin";

  $("editUserName").value = (u.firstName !== undefined ? u.firstName : u.name) || "";   // los apellidos los cambia cada persona en Mi perfil
  $("editUserUsername").value = u.username || "";
  $("editUserUsername").disabled = isAdminAcc;          // el usuario "admin" no cambia
  $("editUserEmail").value = u.email || "";
  const emailField = $("editUserEmail").closest(".field");
  if(emailField) emailField.style.display = isAdminAcc ? "none" : "";      // el administrador no necesita correo
  $("editUserPass").value = "";
  $("editUserMessage").textContent = "";

  // El tipo de cuenta no se cambia desde aquí (cada tipo vive en su propia tabla del servidor)
  const roleSelect = $("editUserRole");
  const roleValue = u.role || "estudiante";
  roleSelect.innerHTML = `<option value="${roleValue}">${ROLE_LABELS[roleValue] || "Estudiante"}</option>`;
  roleSelect.value = roleValue;
  roleSelect.disabled = true;

  fillSubjectSelect($("editUserSubject"), teacherSubjects(u)[0] || "");
  fillSubjectSelect($("editUserSubject2"), teacherSubjects(u)[1] || "", true);
  $("editUserGroups").value = (teacherGroups(u) || []).join(", ");
  toggleEditSubject();

  // Solo el estudiante tiene grado (el profesor usa "Grupos que atiende")
  $("editUserGradeField").style.display = u.role === "estudiante" ? "" : "none";
  const gradeSelect = $("editUserGrade");
  if(u.grade && ![...gradeSelect.options].some(o => o.value === u.grade)){
    gradeSelect.add(new Option(u.grade, u.grade));
  }
  gradeSelect.value = u.grade || "6-1";

  $("userEditModal").classList.add("show");
}

/* ---------- Cerrar la ventana de editar ----------
   Qué hace: Oculta la ventana y olvida a quién se estaba editando.
   Por qué: Para no guardar cambios en la cuenta equivocada después. */
function closeUserEditor(){
  $("userEditModal").classList.remove("show");
  editingUserIndex = null;
}

/* ---------- Guardando… ----------
   Qué hace: Marca si ya se está guardando un usuario.
   Por qué: Evita guardar dos veces por clics seguidos. */
let savingUser = false;

/* ---------- Guardar los cambios ----------
   Qué hace: Revisa que los datos estén completos y bien escritos, los manda al servidor y actualiza la tabla.
   Por qué: Se revisa antes para avisar errores (correo mal escrito, contraseña corta). Si el admin se edita a sí mismo, también se actualiza su sesión. */
async function saveEditedUser(){

  if(!requirePermission("edit","usuario")) return;

  const user = users[editingUserIndex];
  if(!user || savingUser) return;

  const say = text => { $("editUserMessage").textContent = text; };
  const isAdminAcc = user.role === "admin";
  const role = user.role;                                   // el tipo de cuenta no cambia

  const name = $("editUserName").value.trim();
  const username = isAdminAcc ? user.username : $("editUserUsername").value.trim();
  const email = isAdminAcc ? String(user.email || "") : $("editUserEmail").value.trim();
  const grade = role === "estudiante" ? $("editUserGrade").value : "";
  const pass = $("editUserPass").value;
  const subject = role === "profesor" ? $("editUserSubject").value : "";

  if(!user.codigo) return say("Esta cuenta no viene del servidor. Recarga la página (F5) e intenta de nuevo.");
  if(!name || !username || (!isAdminAcc && !email)) return say("Nombre, usuario y correo son obligatorios.");
  if(!isAdminAcc && !isValidEmail(email)) return say("Escribe un correo válido (ej. nombre@gmail.com).");
  if(role === "profesor" && !subject) return say("Elige la materia que dicta el profesor.");
  if(pass && pass.length < 6) return say("La contraseña nueva debe tener mínimo 6 caracteres.");

  let materias = [], grupos = [];
  if(role === "profesor"){
    const second = $("editUserSubject2").value;
    const extras = teacherSubjects(user).slice(2);          // materias 3, 4… (se conservan)
    materias = [subject].concat(second && second !== subject ? [second] : [])
      .concat(extras.filter(x => x !== subject && x !== second));
    grupos = $("editUserGroups").value.split(/[,;\s]+/).map(g => g.trim()).filter(Boolean);
  }

  const oldUsername = user.username;

  savingUser = true;
  const r = await apiPost("api/usuario_guardar.php", {
    codigo: user.codigo, rol: role, nombre: name, usuario: username, correo: email,
    clave: pass, grupo: grade, materias: materias, grupos: grupos
  });
  savingUser = false;

  if(!r.ok) return say(r.error || "No se pudieron guardar los cambios.");

  // La cuenta ya quedó guardada en el servidor: se actualiza la copia local con lo que devolvió
  const saved = Object.assign({}, r.usuario, {password:""});
  const pos = users.indexOf(user);
  if(pos >= 0) users[pos] = saved;

  // Las entregas están ligadas a la cuenta en la base de datos: solo se vuelven a pedir
  if(typeof recargarActividades === "function") recargarActividades();

  saveUsers();

  // Si el administrador se editó a sí mismo, se actualiza su sesión
  const editingSelf = currentUser && String(currentUser.username).toLowerCase() === oldUsername.toLowerCase();
  if(editingSelf){
    currentUser = saved;
    localStorage.setItem("ade_current_user", JSON.stringify(saved));
  }

  closeUserEditor();
  renderAdminUsers();
  if(editingSelf) enterApp();
}