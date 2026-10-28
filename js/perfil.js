/* =========================================================
   MI PERFIL
   Qué hace: Maneja la pantalla Mi perfil: nombre, apellidos, fecha de nacimiento, foto, cambio de contraseña, verificación del correo y correo del acudiente.
   Por qué: Es donde cada persona cuida sus propios datos sin pedirle ayuda al administrador.
   ========================================================= */

/* ---------- Foto de perfil ----------
   Qué hace: La foto se recorta en cuadrado y se reduce a 256 px en el navegador; luego se sube al servidor.
   Por qué: Así la foto pesa poco y se ve igual en cualquier computador o celular (Mi perfil, menú lateral y bienvenida). */

const PHOTO_SIZE = 256;

/* ---------- Estilos de la foto ----------
   Qué hace: Agrega a la página los estilos de la foto y sus botones, una sola vez.
   Por qué: Para no tener que tocar el archivo de estilos. */
function ensurePhotoStyle(){

  if(document.getElementById("photoStyle")) return;

  const st = document.createElement("style");
  st.id = "photoStyle";
  st.textContent = `
    .avatar.has-photo,.big-avatar.has-photo{
      background-size:cover; background-position:center; background-repeat:no-repeat;
    }
    .big-avatar{position:relative}
    .big-avatar.can-edit{cursor:pointer}
    .big-avatar.can-edit::after{
      content:"📷"; position:absolute; right:-4px; bottom:-4px;
      width:24px; height:24px; border-radius:50%; font-size:12px;
      display:grid; place-items:center; background:#238b5b; border:2px solid #0b1020;
    }
    .photo-row{display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:10px 0 14px}
    .photo-row .btn{padding:7px 12px; font-size:12px; border-radius:8px}
    .photo-row small{color:#7e8aa5; font-size:11px}
  `;
  document.head.appendChild(st);
}

/* ---------- Mostrar la foto ----------
   Qué hace: Pone la foto en el menú lateral y en Mi perfil; si no hay foto, muestra la inicial del nombre.
   Por qué: Así siempre se ve algo en el círculo, aunque no se haya subido foto. */
// Pone la foto (o la inicial si no hay foto) en el menú lateral y en Mi perfil
function applyProfilePhoto(){

  if(typeof currentUser === "undefined" || !currentUser) return;

  const name = currentUser.name || currentUser.username || "U";
  const initial = name.charAt(0).toUpperCase();
  const photo = currentUser.photo || "";

  document.querySelectorAll(".sidebar-bottom .avatar, .big-avatar").forEach(el => {
    if(photo){
      el.classList.add("has-photo");
      el.style.backgroundImage = "url(" + photo + ")";
      el.textContent = "";
    }else{
      el.classList.remove("has-photo");
      el.style.backgroundImage = "";
      el.textContent = initial;
    }
  });

  const remove = document.getElementById("photoRemoveBtn");
  if(remove) remove.style.display = photo ? "" : "none";
}

/* ---------- Recortar la foto ----------
   Qué hace: Lee la imagen, la recorta en cuadrado y la convierte en un archivo JPEG pequeño.
   Por qué: Una foto de celular pesa mucho; reducirla hace la subida más rápida. */
// Lee la imagen, la recorta en cuadrado y la devuelve como archivo (JPEG)
function resizePhoto(file){
  return new Promise((resolve, reject) => {

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";                       // fondo blanco por si la imagen es transparente
      ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("No se pudo preparar la imagen.")), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

/* ---------- Guardar el perfil en el servidor ----------
   Qué hace: Manda el nombre y/o la foto al servidor y, si sale bien, actualiza la copia local.
   Por qué: Todos los guardados del perfil pasan por aquí, así se hace igual en todos lados. */
// Envía al servidor el nombre y/o la foto. campos: {nombre, quitar_foto}; archivo: foto ya recortada.
// Devuelve la respuesta {ok, error, usuario}. Si sale bien, también deja actualizada la copia local.
async function guardarPerfilServidor(campos, archivo){

  const datos = new FormData();
  Object.keys(campos || {}).forEach(k => datos.append(k, campos[k]));
  if(archivo) datos.append("foto", archivo, "foto.jpg");

  let r;
  try{
    const resp = await fetch("api/perfil_guardar.php", {method:"POST", credentials:"same-origin", body:datos});
    r = await resp.json();
  }catch(e){
    return {ok:false, error:"No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."};
  }

  if(!r || !r.ok) return {ok:false, error:(r && r.error) || "No se pudo guardar."};

  const user = guardarUsuarioLocal(r.usuario);
  currentUser = user;
  localStorage.setItem("ade_current_user", JSON.stringify(user));
  return r;
}

/* ---------- Elegir foto ----------
   Qué hace: Revisa el permiso y abre el selector de archivos.
   Por qué: Es lo que pasa al hacer clic en el círculo o en el botón de foto. */
function pickPhoto(){
  if(!requirePermission("edit","perfil")) return;
  const input = document.getElementById("photoInput");
  if(input){ input.value = ""; input.click(); }
}

/* ---------- Foto elegida ----------
   Qué hace: Revisa que sea una imagen de menos de 15 MB, la recorta y la sube.
   Por qué: Para evitar archivos que no sean imágenes o que sean demasiado pesados. */
async function onPhotoChosen(e){

  const file = e.target.files && e.target.files[0];
  if(!file) return;

  if(!file.type.startsWith("image/")) return alert("Elige un archivo de imagen (JPG, PNG, WEBP…).");
  if(file.size > 15 * 1024 * 1024) return alert("La imagen es muy pesada. Elige una de menos de 15 MB.");

  try{
    const r = await guardarPerfilServidor({}, await resizePhoto(file));
    if(!r.ok) return alert(r.error);
    applyProfilePhoto();
    if(typeof showToast === "function") showToast("Foto actualizada", "Tu foto de perfil ya está lista.", "ok", 3500, currentUser.photo);
  }catch(err){
    alert(err.message || "No se pudo cargar la imagen.");
  }
}

/* ---------- Quitar la foto ----------
   Qué hace: Pide confirmación, borra la foto y vuelve a mostrar la inicial.
   Por qué: Es un cambio que se nota, por eso se pregunta antes. */
async function removePhoto(){
  if(!requirePermission("edit","perfil")) return;
  if(!currentUser || !currentUser.photo) return;
  if(!await adeConfirm("Tu foto se quitará y volverá a verse tu inicial.", {title:"Quitar foto", ok:"Sí, quitar", danger:true})) return;

  const r = await guardarPerfilServidor({quitar_foto:"1"});
  if(!r.ok) return alert(r.error);
  applyProfilePhoto();
}

/* ---------- Botones de la foto ----------
   Qué hace: Crea el botón de cambiar foto y el selector de archivo, y hace clicable el círculo.
   Por qué: Se crean desde aquí para no tocar el HTML. */
// Crea el botón y el selector de archivo (no hace falta tocar el HTML)
function setupPhotoControls(){

  const big = document.querySelector("#perfil .big-avatar");
  if(!big || document.getElementById("photoInput")) return;

  ensurePhotoStyle();

  const input = document.createElement("input");
  input.type = "file";
  input.id = "photoInput";
  input.accept = "image/*";
  input.style.display = "none";
  input.addEventListener("change", onPhotoChosen);

  const row = document.createElement("div");
  row.className = "photo-row";
  row.innerHTML = `
    <button type="button" class="btn secondary" id="photoPickBtn">📷 Cambiar foto</button>
    <button type="button" class="btn secondary" id="photoRemoveBtn" style="display:none">Quitar foto</button>
    <small>Se recorta en cuadrado automáticamente.</small>`;

  const top = big.closest(".profile-top") || big.parentElement;
  top.insertAdjacentElement("afterend", row);
  row.appendChild(input);

  document.getElementById("photoPickBtn").addEventListener("click", pickPhoto);
  document.getElementById("photoRemoveBtn").addEventListener("click", removePhoto);
  big.classList.add("can-edit");
  big.title = "Cambiar foto de perfil";
  big.addEventListener("click", pickPhoto);
}

/* ---------- Guardando… ----------
   Qué hace: Marca si se está guardando el perfil.
   Por qué: Evita guardar dos veces por clics seguidos. */
let perfilBusy = false;

/* ---------- Guardar nombre y fecha ----------
   Qué hace: Revisa que el nombre no esté vacío y que la fecha de nacimiento no sea futura; guarda y actualiza lo que se ve.
   Por qué: Avisa errores antes de molestar al servidor y deja la pantalla al día sin recargar. */
async function saveProfile(){

  if(!requirePermission("edit","perfil")) return;
  if(!currentUser || perfilBusy) return;

  const name = $("pfFirst").value.trim();
  const last = $("pfLast").value.trim();
  const birth = $("pfBirth").value;

  if(!name) return alert("El nombre no puede estar vacío.");
  if(birth && birth > new Date().toISOString().slice(0, 10)) return alert("La fecha de nacimiento no puede ser futura.");

  perfilBusy = true;
  const r = await guardarPerfilServidor({nombre: name, apellidos: last, nacimiento: birth});
  perfilBusy = false;

  if(!r.ok) return alert(r.error);

  const user = currentUser;                       // ya trae el nombre guardado en el servidor

  // El nombre en las entregas viene de la base de datos: solo se vuelven a pedir
  if(typeof recargarActividades === "function") recargarActividades();

  // Actualizar lo que se ve en pantalla (sin repetir la animación de entrada)
  const mini = document.querySelector(".sidebar-bottom .user-mini span");
  if(mini) mini.innerHTML = escapeHtml(user.name) + "<br><small style='color:#7e8aa5'>" + escapeHtml(typeof userRoleLabel === "function" ? userRoleLabel(user) : user.username) + "</small>";
  applyProfilePhoto();    // muestra la foto, o la inicial si no hay foto
  renderProfile();

  renderAdminUsers();
  alert("Perfil actualizado.");
}

/* ---------- Pantalla de Mi perfil ----------
   Qué hace: Estilos y función que llenan la pantalla con los datos de la cuenta.
   Por qué: Mantiene lo que se ve igual a lo que está guardado. */

/* ---------- Estilos de Mi perfil ----------
   Qué hace: Agrega los estilos de la pantalla de perfil, una sola vez.
   Por qué: Para no tocar el archivo de estilos. */
function ensureProfileStyle(){
  if(document.getElementById("profileStyle")) return;
  const st = document.createElement("style");
  st.id = "profileStyle";
  st.textContent = `
    #perfil .profile{max-width:760px}
    .pf-list{display:flex; flex-direction:column; border:1px solid #26304a; border-radius:12px; overflow:hidden; background:rgba(5,14,34,.55)}
    .pf-row{display:grid; grid-template-columns:190px minmax(0,1fr); gap:14px; align-items:center; padding:14px 18px; border-top:1px solid #26304a}
    .pf-row:first-child{border-top:0}
    .pf-label{font-size:13px; font-weight:bold; color:#aeb8cc}
    .pf-value{display:flex; align-items:center; gap:10px; min-width:0; color:#e8edf8; font-size:14px}
    .pf-value > span{overflow-wrap:anywhere}
    .pf-grow{flex:1; min-width:0}
    .pf-stack{flex-direction:column; align-items:stretch; gap:8px}
    .pf-value input{width:100%; background:#0b1020; color:#fff; border:1px solid #303b57; border-radius:9px; padding:10px 11px; outline:none; font:inherit}
    .pf-value input:focus{border-color:#7e8aa5}
    .pf-dots{letter-spacing:3px; color:#aeb8cc}
    .pf-verify{background:transparent; color:#8fe3b3; border:1.5px solid #238b5b; border-radius:8px; padding:6px 14px; font-size:12px; font-weight:bold; cursor:pointer; flex:none}
    .pf-verify:hover{background:rgba(35,139,91,.18)}
    .pf-verify.ok{background:#238b5b; color:#fff; cursor:default}
    .pf-edit{flex:none; width:34px; height:34px; border-radius:8px; border:1px solid #303b57; background:#0b1020; color:#dfe5f1; font-size:16px; cursor:pointer}
    .pf-edit:hover{background:#202a43}
    #perfil .actions{margin-top:18px}
    .pwd-modal{width:min(430px,100%)}
    .pwd-modal .modal-head{align-items:center; margin-bottom:14px}
    .pwd-modal .modal-head h3{margin:0; font-size:18px}
    .pwd-x{background:none; border:0; color:#aeb8cc; font-size:18px; cursor:pointer; padding:4px 8px}
    .pwd-x:hover{color:#fff}
    .pwd-grid{display:grid; grid-template-columns:1fr; gap:12px}
    .pwd-hint{margin:10px 0 0; font-size:12px; color:#8fe3b3}
    .pwd-msg{min-height:16px; margin:8px 0; font-size:12px; line-height:1.35; color:#ffb3c6}
    .pwd-msg.ok{color:#6fe3a1}
    .pwd-submit{width:100%}
    @media(max-width:640px){
      .pf-row{grid-template-columns:1fr; gap:6px; padding:12px 14px}
    }
  `;
  document.head.appendChild(st);
}

/* ---------- Llenar el perfil ----------
   Qué hace: Escribe nombre, usuario, correo, grado y fecha en la pantalla; oculta lo que no aplica (el admin no tiene correo ni grado).
   Por qué: Cada rol necesita ver campos distintos. */
// "Nombre Apellidos" -> cómo se ve en el encabezado del perfil
function renderProfile(){

  if(typeof currentUser === "undefined" || !currentUser || !$("pfFirst")) return;

  const u = currentUser;
  const first = u.firstName !== undefined ? u.firstName : (u.name || "");

  const h2 = document.querySelector(".profile-top h2");
  if(h2) h2.textContent = u.name || u.username || "";
  const muted = document.querySelector(".profile-top .muted");
  if(muted) muted.textContent = "@" + (u.username || "");

  $("pfUser").textContent = "@" + (u.username || "");
  $("pfFirst").value = first;
  $("pfLast").value = u.lastName || "";
  $("pfBirth").value = u.birthdate || "";
  $("pfBirth").max = new Date().toISOString().slice(0, 10);
  $("pfEmail").textContent = u.email || "Sin correo";
  const emailRow = $("pfEmail").closest(".pf-row");
  if(emailRow) emailRow.style.display = u.role === "admin" ? "none" : "";   // el administrador no necesita correo
  $("pfGrade").textContent = u.grade || "-";

  const noGrade = u.role === "admin";
  $("pfGradeRow").style.display = noGrade ? "none" : "";

  renderGuardianRow();     // correo del acudiente (solo estudiantes)
  updateOwnEmailButton();  // "Verificar" o "Verificado ✓"
}

/* ---------- Cambiar contraseña ----------
   Qué hace: Funciones de la ventana emergente para cambiar la contraseña.
   Por qué: La contraseña se cambia en una ventana aparte para no mezclarla con los otros datos. */

function openPwdModal(){
  if(!requirePermission("edit","perfil")) return;
  ["pwdOld","pwdNew","pwdNew2"].forEach(id => { $(id).value = ""; });
  const msg = $("pwdMsg"); msg.textContent = ""; msg.classList.remove("ok");
  $("pwdModal").classList.add("show");
  setTimeout(() => $("pwdOld").focus(), 50);
}

/* ---------- Cerrar la ventana de contraseña ----------
   Qué hace: Oculta la ventana.
   Por qué: Se usa con la ✕, con clic afuera y con Escape. */
function closePwdModal(){
  $("pwdModal").classList.remove("show");
}

/* ---------- Preparar la ventana de contraseña ----------
   Qué hace: Conecta los botones y las teclas (Enter y Escape) de la ventana, una sola vez.
   Por qué: Así la ventana responde bien y no se conecta dos veces. */
function setupPasswordModal(){

  if(!$("pwdModal") || $("pwdModal").dataset.ready) return;
  $("pwdModal").dataset.ready = "1";

  document.body.appendChild($("pwdModal"));      // fuera de la página para que cubra toda la pantalla

  $("pfPwdBtn").addEventListener("click", openPwdModal);
  $("pwdClose").addEventListener("click", closePwdModal);
  $("pwdSaveBtn").addEventListener("click", changePassword);
  $("pwdModal").addEventListener("click", e => { if(e.target === $("pwdModal")) closePwdModal(); });
  document.addEventListener("keydown", e => { if(e.key === "Escape") closePwdModal(); });
  ["pwdOld","pwdNew","pwdNew2"].forEach(id => $(id).addEventListener("keydown", e => { if(e.key === "Enter") changePassword(); }));
}

/* ---------- Guardando… ----------
   Qué hace: Marca si se está cambiando la contraseña.
   Por qué: Evita enviarla dos veces. */
let pwdBusy = false;

/* ---------- Cambiar la contraseña ----------
   Qué hace: Revisa que los campos estén llenos, que la nueva tenga mínimo 6 caracteres, sea distinta de la actual y coincida; luego la cambia en el servidor.
   Por qué: Se revisa antes para dar mensajes claros y evitar contraseñas débiles o escritas mal. */
async function changePassword(){

  if(!requirePermission("edit","perfil")) return;
  if(!currentUser || pwdBusy) return;

  const msg = $("pwdMsg");
  const say = (text, ok) => { msg.textContent = text; msg.classList.toggle("ok", !!ok); };

  const oldPass = $("pwdOld").value;
  const pass1 = $("pwdNew").value;
  const pass2 = $("pwdNew2").value;

  if(!oldPass || !pass1 || !pass2) return say("Completa los tres campos.");
  if(pass1.length < 6) return say("La nueva contraseña debe tener mínimo 6 caracteres.");
  if(pass1 === oldPass) return say("La nueva contraseña debe ser distinta a la actual.");
  if(pass1 !== pass2) return say("Las contraseñas nuevas no coinciden.");

  pwdBusy = true;
  const r = await apiPost("api/cambiar_clave.php", {actual: oldPass, nueva: pass1});
  pwdBusy = false;

  if(!r.ok) return say(r.error || "No se pudo cambiar la contraseña.");

  closePwdModal();
  if(typeof showToast === "function") showToast("Contraseña actualizada", "Úsala la próxima vez que inicies sesión.", "ok", 3500);
}

/* ---------- Verificar correo ----------
   Qué hace: Marca el inicio del bloque de verificación del correo. */

/* ---------- Verificar mi propio correo ----------
   Qué hace: El botón "Verificar" manda un código de 6 dígitos al correo de la cuenta; al escribirlo, el correo queda confirmado.
   Por qué: Así se sabe que el correo es de verdad de la persona. */

/* ---------- Variables de verificación ----------
   Qué hace: Guarda si hay un envío en curso (mailBusy) y cuándo se mandó el último código (mailPendingAt).
   Por qué: Evita mandar muchos códigos seguidos. */
let mailBusy = false;
let mailPendingAt = 0;

/* ---------- Botón Verificar ----------
   Qué hace: Cambia el texto del botón entre "Verificar" y "Verificado ✓".
   Por qué: Para que la persona vea si su correo ya está confirmado. */
function updateOwnEmailButton(){
  const b = $("pfVerifyBtn");
  if(!b || !currentUser) return;
  const ok = !!currentUser.emailVerified;
  b.textContent = ok ? "Verificado ✓" : "Verificar";
  b.classList.toggle("ok", ok);
}

/* ---------- Ventana del código ----------
   Qué hace: Crea la ventana donde se escribe el código y conecta sus botones.
   Por qué: Se crea desde aquí para no tocar el HTML. */
function ensureMailModal(){

  if($("mailModal")) return;
  ensureGuardianStyle();

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "mailModal";
  modal.innerHTML = `
    <div class="modal-box pwd-modal">
      <div class="modal-head">
        <h3>Verifica tu correo</h3>
        <button type="button" class="pwd-x" id="mvClose" aria-label="Cerrar">✕</button>
      </div>
      <p class="gd-info">Enviamos un código de 6 dígitos a <b id="mvMail"></b>. Escríbelo aquí para confirmar que el correo es tuyo.</p>
      <div class="field">
        <label>Código de verificación</label>
        <input id="mvCode" class="gd-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
      </div>
      <p class="pwd-msg" id="mvMsg"></p>
      <button type="button" class="btn pwd-submit" id="mvOk">Verificar</button>
      <p class="gd-links"><button type="button" id="mvResend">Reenviar código</button></p>
    </div>`;
  document.body.appendChild(modal);

  $("mvClose").addEventListener("click", closeMailModal);
  modal.addEventListener("click", e => { if(e.target === modal) closeMailModal(); });
  document.addEventListener("keydown", e => { if(e.key === "Escape") closeMailModal(); });
  $("mvOk").addEventListener("click", confirmMailCode);
  $("mvResend").addEventListener("click", resendMailCode);
  $("mvCode").addEventListener("keydown", e => { if(e.key === "Enter") confirmMailCode(); });
  $("mvCode").addEventListener("input", () => { $("mvCode").value = $("mvCode").value.replace(/\D/g, "").slice(0, 6); });
}

/* ---------- Abrir la ventana del código ----------
   Qué hace: Muestra el correo al que se mandó el código y deja el campo listo para escribir.
   Por qué: Para que la persona sepa a dónde mirar. */
function openMailModal(){
  ensureMailModal();
  $("mvMail").textContent = (currentUser && currentUser.email) || "";
  $("mvCode").value = "";
  const msg = $("mvMsg"); msg.textContent = ""; msg.classList.remove("ok");
  $("mailModal").classList.add("show");
  setTimeout(() => $("mvCode").focus(), 50);
}

/* ---------- Cerrar la ventana del código ----------
   Qué hace: Oculta la ventana.
   Por qué: Se usa al terminar o al cancelar. */
function closeMailModal(){
  const m = $("mailModal");
  if(m) m.classList.remove("show");
}

/* ---------- Mensajes de la ventana ----------
   Qué hace: Escribe un mensaje de error o de éxito en la ventana.
   Por qué: Para explicar qué pasó sin cerrarla. */
function mailMsg(text, ok){
  const msg = $("mvMsg");
  if(!msg) return;
  msg.textContent = text;
  msg.classList.toggle("ok", !!ok);
}

/* ---------- Empezar a verificar ----------
   Qué hace: Pide al servidor que mande el código; si ya se mandó hace poco, solo abre la ventana.
   Por qué: Evita llenar el correo de códigos si la persona hace clic varias veces. */
async function startMailVerify(){

  if(!currentUser || mailBusy) return;
  if(currentUser.emailVerified){
    if(typeof showToast === "function") showToast("Ya está verificado", "Tu correo ya estaba verificado.", "ok", 3500);
    return;
  }

  // Si el código se mandó hace poco, solo se vuelve a abrir la ventana
  if(Date.now() - mailPendingAt < 9 * 60 * 1000) return openMailModal();

  mailBusy = true;
  const b = $("pfVerifyBtn");
  if(b){ b.disabled = true; b.textContent = "Enviando…"; }

  const r = await apiPost("api/correo_verificar.php", {paso:"enviar"});

  mailBusy = false;
  if(b) b.disabled = false;
  updateOwnEmailButton();

  if(!r.ok) return alert(r.error || "No se pudo enviar el código.");

  if(r.yaVerificado){
    guardarCuentaDevuelta(r.usuario);
    updateOwnEmailButton();
    return;
  }

  mailPendingAt = Date.now();
  openMailModal();
}

/* ---------- Reenviar código ----------
   Qué hace: Pide un código nuevo.
   Por qué: Por si el primero no llegó. */
async function resendMailCode(){

  if(mailBusy) return;
  mailBusy = true;
  const r = await apiPost("api/correo_verificar.php", {paso:"enviar"});
  mailBusy = false;

  if(!r.ok) return mailMsg(r.error || "No se pudo enviar el código.");

  mailPendingAt = Date.now();
  mailMsg("Te enviamos un código nuevo.", true);
}

/* ---------- Confirmar el código ----------
   Qué hace: Revisa que sean 6 números y los manda al servidor; si es correcto, marca el correo como verificado.
   Por qué: Solo quien recibe el correo puede conocer el código. */
async function confirmMailCode(){

  if(mailBusy) return;

  const code = $("mvCode").value.trim();
  if(!/^\d{6}$/.test(code)) return mailMsg("Escribe los 6 dígitos del código.");

  mailBusy = true;
  const r = await apiPost("api/correo_verificar.php", {paso:"verificar", codigo:code});
  mailBusy = false;

  if(!r.ok) return mailMsg(r.error || "No se pudo verificar el código.");

  mailPendingAt = 0;
  guardarCuentaDevuelta(r.usuario);
  closeMailModal();
  updateOwnEmailButton();
  if(typeof showToast === "function") showToast("Correo verificado", "Tu correo quedó confirmado.", "ok", 3500);
}

/* ---------- Conectar el botón Verificar ----------
   Qué hace: Hace que el botón inicie la verificación.
   Por qué: Es la conexión entre el botón y la función. */
function setupVerifyButton(){
  const b = $("pfVerifyBtn");
  if(!b) return;
  b.addEventListener("click", startMailVerify);
}

/* ---------- Correo del acudiente (solo estudiantes) ----------
   Qué hace: El estudiante escribe el correo de su acudiente y pulsa "Verificar"; al acudiente le llega un código que le da al estudiante para escribirlo aquí.
   Por qué: Así el acudiente queda ligado a la agenda del estudiante y se confirma que el correo es real. */

/* ---------- Variables del acudiente ----------
   Qué hace: Guarda si hay un envío en curso y a qué correo ya se mandó un código.
   Por qué: Evita mandar códigos repetidos al mismo correo. */
let guardianBusy = false;
let guardianPending = null;      // {email, at}: ya se mandó un código a ese correo (no se pide otro enseguida)

/* ---------- Estilos del acudiente ----------
   Qué hace: Agrega los estilos de esta parte, una sola vez.
   Por qué: Para no tocar el archivo de estilos. */
function ensureGuardianStyle(){
  if($("guardianStyle")) return;
  const st = document.createElement("style");
  st.id = "guardianStyle";
  st.textContent = `
    #pfGuardianRow .gd-line{display:flex; align-items:center; gap:10px}
    #pfGuardianRow .gd-line input{flex:1; min-width:0; width:auto}
    #pfGuardianRow .gd-hint{color:#7e8aa5; font-size:11px; line-height:1.4}
    .gd-info{margin:0 0 14px; font-size:13px; color:#aeb8cc; line-height:1.5}
    .gd-info b{color:#e8edf8; overflow-wrap:anywhere}
    .gd-code{text-align:center; letter-spacing:10px; font-size:22px; font-weight:bold}
    .gd-links{margin:12px 0 0; text-align:center; font-size:12px; color:#7e8aa5}
    .gd-links button{background:none; border:0; color:#8fe3b3; cursor:pointer; font:inherit; text-decoration:underline}
  `;
  document.head.appendChild(st);
}

/* ---------- Guardar la cuenta devuelta ----------
   Qué hace: Guarda la cuenta que mandó el servidor y la deja como cuenta actual.
   Por qué: La usan también otros archivos (como correo_cambiar.js). */
// Guarda en pantalla la cuenta que devolvió el servidor
function guardarCuentaDevuelta(usuario){
  if(!usuario) return;
  const user = guardarUsuarioLocal(usuario);
  currentUser = user;
  localStorage.setItem("ade_current_user", JSON.stringify(user));
}

/* ---------- Correo escrito ----------
   Qué hace: Devuelve lo que se escribió en el campo del acudiente.
   Por qué: Atajo para no repetir el mismo código. */
function guardianEmailTyped(){
  const i = $("pfGuardianEmail");
  return i ? i.value.trim() : "";
}

/* ---------- ¿Acudiente verificado? ----------
   Qué hace: Responde si el correo del acudiente ya está confirmado y es el que está escrito.
   Por qué: Si se cambia el correo, hay que verificarlo otra vez. */
function guardianIsVerified(){
  const u = currentUser;
  return !!(u && u.guardianVerified && u.guardianEmail &&
    u.guardianEmail.toLowerCase() === guardianEmailTyped().toLowerCase());
}

/* ---------- Botón del acudiente ----------
   Qué hace: Cambia el botón entre "Verificar" y "Verificado ✓" y muestra u oculta el botón de quitar.
   Por qué: Para que la persona vea el estado de un vistazo. */
// Cambia el botón: "Verificar" o "Verificado" según lo que haya escrito
function updateGuardianButton(){
  const btn = $("pfGuardianBtn");
  const del = $("pfGuardianDel");
  const hint = $("pfGuardianHint");
  if(!btn) return;

  const u = currentUser || {};
  const ok = guardianIsVerified();

  btn.textContent = ok ? "Verificado ✓" : "Verificar";
  btn.classList.toggle("ok", ok);
  if(del) del.style.display = u.guardianEmail ? "" : "none";

  if(hint){
    if(ok) hint.textContent = "Tu acudiente ya puede ver la agenda de tu grupo.";
    else if(u.guardianEmail && guardianEmailTyped().toLowerCase() === u.guardianEmail.toLowerCase())
      hint.textContent = "Falta verificarlo: pulsa Verificar y escribe el código que le llegó a tu acudiente.";
    else hint.textContent = "Escribe el correo y pulsa Verificar: a tu acudiente le llegará un código de 6 dígitos.";
  }
}

/* ---------- Fila del acudiente ----------
   Qué hace: Crea la fila con el campo del correo del acudiente debajo del correo, una sola vez.
   Por qué: Se crea desde aquí para no tocar el HTML. */
function ensureGuardianRow(){

  if($("pfGuardianRow")) return $("pfGuardianRow");

  const emailRow = $("pfEmail") && $("pfEmail").closest(".pf-row");
  if(!emailRow) return null;

  ensureGuardianStyle();

  const row = document.createElement("div");
  row.className = "pf-row";
  row.id = "pfGuardianRow";
  row.style.display = "none";
  row.innerHTML = `
    <div class="pf-label">Correo del acudiente</div>
    <div class="pf-value pf-stack">
      <div class="gd-line">
        <input id="pfGuardianEmail" type="email" maxlength="120" placeholder="correo@gmail.com" autocomplete="off">
        <button type="button" class="pf-verify" id="pfGuardianBtn">Verificar</button>
        <button type="button" class="pf-edit" id="pfGuardianDel" title="Quitar correo" aria-label="Quitar correo del acudiente" style="display:none">✕</button>
      </div>
      <span class="gd-hint" id="pfGuardianHint"></span>
    </div>`;
  emailRow.insertAdjacentElement("afterend", row);

  $("pfGuardianEmail").addEventListener("input", updateGuardianButton);
  $("pfGuardianBtn").addEventListener("click", startGuardianVerify);
  $("pfGuardianDel").addEventListener("click", removeGuardian);

  return row;
}

/* ---------- Mostrar la fila del acudiente ----------
   Qué hace: La muestra solo si la cuenta es de un estudiante y llena el correo guardado.
   Por qué: Profesores y admin no tienen acudiente. */
function renderGuardianRow(){

  const u = currentUser;
  const row = ensureGuardianRow();
  if(!row || !u) return;

  const isStudent = u.role === "estudiante";
  row.style.display = isStudent ? "" : "none";
  if(!isStudent) return;

  const input = $("pfGuardianEmail");
  if(document.activeElement !== input) input.value = u.guardianEmail || "";
  updateGuardianButton();
}

/* ---------- Ventana del código del acudiente ----------
   Qué hace: Crea la ventana para escribir el código y conecta sus botones.
   Por qué: Igual que la del correo propio, pero para el acudiente. */
// Ventana donde se escribe el código
function ensureGuardianModal(){

  if($("guardianModal")) return;
  ensureGuardianStyle();

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "guardianModal";
  modal.innerHTML = `
    <div class="modal-box pwd-modal">
      <div class="modal-head">
        <h3>Verifica a tu acudiente</h3>
        <button type="button" class="pwd-x" id="gdClose" aria-label="Cerrar">✕</button>
      </div>
      <p class="gd-info">Enviamos un código de 6 dígitos a <b id="gdMail"></b>. Pídele ese código a tu acudiente y escríbelo aquí.</p>
      <div class="field">
        <label>Código de verificación</label>
        <input id="gdCode" class="gd-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
      </div>
      <p class="pwd-msg" id="gdMsg"></p>
      <button type="button" class="btn pwd-submit" id="gdOk">Verificar</button>
      <p class="gd-links"><button type="button" id="gdResend">Reenviar código</button></p>
    </div>`;
  document.body.appendChild(modal);

  $("gdClose").addEventListener("click", closeGuardianModal);
  modal.addEventListener("click", e => { if(e.target === modal) closeGuardianModal(); });
  document.addEventListener("keydown", e => { if(e.key === "Escape") closeGuardianModal(); });
  $("gdOk").addEventListener("click", confirmGuardianCode);
  $("gdResend").addEventListener("click", resendGuardianCode);
  $("gdCode").addEventListener("keydown", e => { if(e.key === "Enter") confirmGuardianCode(); });
  $("gdCode").addEventListener("input", () => { $("gdCode").value = $("gdCode").value.replace(/\D/g, "").slice(0, 6); });
}

/* ---------- Abrir la ventana del acudiente ----------
   Qué hace: Muestra a qué correo se mandó el código y la deja lista.
   Por qué: Para que sepa dónde buscar el código. */
function openGuardianModal(email){
  ensureGuardianModal();
  $("gdMail").textContent = email;
  $("gdCode").value = "";
  const msg = $("gdMsg"); msg.textContent = ""; msg.classList.remove("ok");
  $("guardianModal").classList.add("show");
  setTimeout(() => $("gdCode").focus(), 50);
}

/* ---------- Cerrar la ventana del acudiente ----------
   Qué hace: Oculta la ventana. */
function closeGuardianModal(){
  const m = $("guardianModal");
  if(m) m.classList.remove("show");
}

/* ---------- Mensajes del acudiente ----------
   Qué hace: Escribe un mensaje de error o éxito en la ventana.
   Por qué: Para explicar qué pasó sin cerrarla. */
function guardianMsg(text, ok){
  const msg = $("gdMsg");
  if(!msg) return;
  msg.textContent = text;
  msg.classList.toggle("ok", !!ok);
}

/* ---------- Verificar al acudiente ----------
   Qué hace: Revisa el correo escrito, lo guarda, manda el código y abre la ventana.
   Por qué: Si ya se mandó hace poco al mismo correo, solo abre la ventana para no repetir envíos. */
// Botón "Verificar" de la pantalla: guarda el correo, manda el código y abre la ventana
async function startGuardianVerify(){

  if(!requirePermission("edit","perfil")) return;
  if(guardianBusy || guardianIsVerified()) return;

  const email = guardianEmailTyped();
  const validEmail = typeof isValidEmail === "function" ? isValidEmail(email) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if(!email) return alert("Escribe el correo de tu acudiente.");
  if(!validEmail) return alert("Escribe un correo válido (ej. nombre@gmail.com).");

  // Si el código ya se mandó hace poco a este mismo correo, solo se vuelve a abrir la ventana
  if(guardianPending && guardianPending.email.toLowerCase() === email.toLowerCase() && Date.now() - guardianPending.at < 9 * 60 * 1000){
    return openGuardianModal(email);
  }

  guardianBusy = true;
  const btn = $("pfGuardianBtn");
  if(btn){ btn.disabled = true; btn.textContent = "Enviando…"; }

  const r = await apiPost("api/acudiente_correo.php", {paso:"enviar", correo:email});

  guardianBusy = false;
  if(btn) btn.disabled = false;

  if(!r.ok){
    updateGuardianButton();
    return alert(r.error || "No se pudo enviar el código.");
  }

  guardarCuentaDevuelta(r.usuario);
  updateGuardianButton();

  if(r.yaVerificado){
    if(typeof showToast === "function") showToast("Ya está verificado", "Ese correo ya estaba verificado.", "ok", 3500);
    return;
  }

  guardianPending = {email, at: Date.now()};
  openGuardianModal(email);
}

/* ---------- Reenviar código al acudiente ----------
   Qué hace: Pide un código nuevo para el correo guardado.
   Por qué: Por si el primero no llegó. */
async function resendGuardianCode(){

  if(guardianBusy || !currentUser || !currentUser.guardianEmail) return;

  guardianBusy = true;
  const r = await apiPost("api/acudiente_correo.php", {paso:"enviar", correo:currentUser.guardianEmail});
  guardianBusy = false;

  if(!r.ok) return guardianMsg(r.error || "No se pudo enviar el código.");

  guardianPending = {email:currentUser.guardianEmail, at: Date.now()};
  guardianMsg("Te enviamos un código nuevo.", true);
}

/* ---------- Confirmar código del acudiente ----------
   Qué hace: Revisa los 6 números, los manda al servidor y marca al acudiente como verificado.
   Por qué: Así se confirma que el correo es de él. */
async function confirmGuardianCode(){

  if(guardianBusy) return;

  const code = $("gdCode").value.trim();
  if(!/^\d{6}$/.test(code)) return guardianMsg("Escribe los 6 dígitos del código.");

  guardianBusy = true;
  const r = await apiPost("api/acudiente_correo.php", {paso:"verificar", codigo:code});
  guardianBusy = false;

  if(!r.ok) return guardianMsg(r.error || "No se pudo verificar el código.");

  guardianPending = null;
  guardarCuentaDevuelta(r.usuario);
  closeGuardianModal();
  renderGuardianRow();
  if(typeof showToast === "function") showToast("Acudiente verificado", "Su correo quedó confirmado.", "ok", 3500);
}

/* ---------- Quitar acudiente ----------
   Qué hace: Pide confirmación y borra el correo del acudiente.
   Por qué: Al quitarlo, el acudiente deja de ver la agenda del estudiante, por eso se pregunta. */
async function removeGuardian(){

  if(!requirePermission("edit","perfil")) return;
  if(guardianBusy || !currentUser || !currentUser.guardianEmail) return;
  if(!await adeConfirm("Tu acudiente dejará de ver tu agenda.", {title:"Quitar acudiente", ok:"Sí, quitar", danger:true})) return;

  guardianBusy = true;
  const r = await apiPost("api/acudiente_correo.php", {paso:"quitar"});
  guardianBusy = false;

  if(!r.ok) return alert(r.error || "No se pudo quitar el correo.");

  guardianPending = null;
  guardarCuentaDevuelta(r.usuario);
  $("pfGuardianEmail").value = "";
  renderGuardianRow();
}

/* ---------- Arranque ----------
   Qué hace: Al cargar el archivo prepara estilos, ventanas, botones y foto, llena el perfil y conecta el botón Guardar.
   Por qué: Deja la pantalla de Mi perfil lista desde el primer momento. */
(function(){
  ensureProfileStyle();
  setupPasswordModal();
  setupVerifyButton();
  setupPhotoControls();
  applyProfilePhoto();
  renderProfile();

  const btn = document.querySelector("#perfil .actions .btn");
  if(btn) btn.addEventListener("click", saveProfile);
})();