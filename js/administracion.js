/* =========================================================
   USUARIOS
   ========================================================= */

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

let users = JSON.parse(localStorage.getItem("ade_users") || "null");
if(!Array.isArray(users)) users = [];

// Se garantiza que la cuenta admin exista sin borrar las demás.
if(!users.some(u => String(u?.username || "").toLowerCase() === "admin")){
  users.unshift(defaultAdmin);
}

const ROLE_LABELS = {admin:"Admin", profesor:"Profesor", estudiante:"Estudiante"};

function saveUsers(){
  localStorage.setItem("ade_users", JSON.stringify(users));
}

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


/* ---------- Correos ---------- */

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ¿Ya hay otra cuenta con ese correo? (skipIndex = cuenta que se está editando)
function emailTaken(email, skipIndex = -1){
  return users.some((u, i) => i !== skipIndex &&
    String(u?.email || "").toLowerCase() === email.toLowerCase());
}

// A las cuentas que no tienen correo se les crea uno básico: usuario@gmail.com
function ensureUserEmails(){

  let changed = false;

  users.forEach((u, i) => {
    if(!u || u.email) return;

    let base = String(u.username || "").toLowerCase().replace(/[^a-z0-9._-]/g, "") || ("usuario" + (i + 1));
    let email = base + "@gmail.com";
    let n = 2;
    while(emailTaken(email, i)) email = base + (n++) + "@gmail.com";

    u.email = email;
    changed = true;
  });

  if(changed) saveUsers();
}

ensureUserEmails();


/* ---------- Materia de los profesores ---------- */

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


/* ---------- Tabla de usuarios ---------- */

function renderAdminUsers(){

  const body = $("adminUsersBody");
  if(getRole() !== "admin" || !body) return;

  // data-label = nombre de la columna (en celular cada usuario se ve como una tarjeta)
  body.innerHTML = users.map((u, i) => `
    <tr>
      <td data-label="#">${i + 1}</td>
      <td data-label="Nombre">${escapeHtml(u.name || "")}</td>
      <td data-label="Usuario">${escapeHtml(u.username || "")}</td>
      <td data-label="Correo">${escapeHtml(u.email || "")}</td>
      <td data-label="Rol">${ROLE_LABELS[u.role] || "Estudiante"}</td>
      <td data-label="Materia">${u.role === "profesor" ? escapeHtml(teacherSubjectsText(u) || "Sin materia") : "—"}</td>
      <td data-label="Grado">${u.role === "admin" ? "—" : escapeHtml((u.role === "profesor" && teacherGroups(u) ? teacherGroups(u).join(", ") : u.grade) || "")}</td>
      <td data-label="Creado">${escapeHtml(u.createdAt || "")}</td>
      <td>
        <div class="ibtn-row">
          ${ibtn("edit", "Editar usuario", `openUserEditor(${i})`)}
          ${u.role === "admin"
            ? ibtn("lock", "Cuenta protegida", "")
            : ibtn("trash", "Eliminar usuario", `deleteRegisteredUser(${i})`)}
        </div>
      </td>
    </tr>
  `).join("");
}

async function deleteRegisteredUser(index){

  if(!requirePermission("delete","usuario")) return;

  const user = users[index];
  if(!user || user.role === "admin") return;
  if(!user.codigo) return alert("Esta cuenta no viene del servidor. Recarga la página (F5) e intenta de nuevo.");
  if(!confirm(`¿Eliminar la cuenta de ${user.name || user.username}?`)) return;

  const r = await apiPost("api/usuario_borrar.php", {rol:user.role, codigo:user.codigo});
  if(!r.ok) return alert(r.error || "No se pudo eliminar la cuenta.");

  const pos = users.indexOf(user);
  if(pos >= 0) users.splice(pos, 1);
  saveUsers();
  renderAdminUsers();
}

// Botón "Nuevo usuario" del panel de administración
function createUserAction(){
  return requirePermission("create","usuario");
}


/* =========================================================
   EDITAR USUARIOS (solo administrador)
   Este archivo crea su propia ventana, no hace falta tocar el HTML.
   ========================================================= */

let editingUserIndex = null;

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

// Muestra la materia solo cuando el rol es Profesor
function toggleEditSubject(){
  const t = $("editUserRole").value === "profesor" ? "" : "none";
  $("editUserSubjectField").style.display = t;
  $("editUserSubject2Field").style.display = t;
  $("editUserGroupsField").style.display = t;
}

ensureUserEditModal();

function openUserEditor(index){

  if(!requirePermission("edit","usuario")) return;

  const u = users[index];
  if(!u) return;

  editingUserIndex = index;
  const isAdminAcc = u.role === "admin";

  $("editUserName").value = u.name || "";
  $("editUserUsername").value = u.username || "";
  $("editUserUsername").disabled = isAdminAcc;          // el usuario "admin" no cambia
  $("editUserEmail").value = u.email || "";
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

function closeUserEditor(){
  $("userEditModal").classList.remove("show");
  editingUserIndex = null;
}

let savingUser = false;

async function saveEditedUser(){

  if(!requirePermission("edit","usuario")) return;

  const user = users[editingUserIndex];
  if(!user || savingUser) return;

  const say = text => { $("editUserMessage").textContent = text; };
  const isAdminAcc = user.role === "admin";
  const role = user.role;                                   // el tipo de cuenta no cambia

  const name = $("editUserName").value.trim();
  const username = isAdminAcc ? user.username : $("editUserUsername").value.trim();
  const email = $("editUserEmail").value.trim();
  const grade = role === "estudiante" ? $("editUserGrade").value : "";
  const pass = $("editUserPass").value;
  const subject = role === "profesor" ? $("editUserSubject").value : "";

  if(!user.codigo) return say("Esta cuenta no viene del servidor. Recarga la página (F5) e intenta de nuevo.");
  if(!name || !username || !email) return say("Nombre, usuario y correo son obligatorios.");
  if(!isValidEmail(email)) return say("Escribe un correo válido (ej. nombre@gmail.com).");
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