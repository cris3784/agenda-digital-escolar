/* =========================================================
   MI PERFIL: guardar el nombre y la foto de perfil
   ========================================================= */


/* ---------- Foto de perfil ----------
   La foto se recorta en cuadrado y se reduce a 256 px en tu navegador; luego se sube al
   servidor (api/perfil_guardar.php). Así se ve igual desde cualquier computador o celular.
   Se ve en: Mi perfil, el menú lateral y el aviso de bienvenida. */

const PHOTO_SIZE = 256;

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

function pickPhoto(){
  if(!requirePermission("edit","perfil")) return;
  const input = document.getElementById("photoInput");
  if(input){ input.value = ""; input.click(); }
}

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

async function removePhoto(){
  if(!requirePermission("edit","perfil")) return;
  if(!currentUser || !currentUser.photo) return;
  if(!confirm("¿Quitar tu foto de perfil?")) return;

  const r = await guardarPerfilServidor({quitar_foto:"1"});
  if(!r.ok) return alert(r.error);
  applyProfilePhoto();
}

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

let perfilBusy = false;

async function saveProfile(){

  if(!requirePermission("edit","perfil")) return;
  if(!currentUser || perfilBusy) return;

  const inputs = document.querySelectorAll("#perfil .profile .field input");
  const name = inputs[0] ? inputs[0].value.trim() : "";

  if(!name) return alert("El nombre no puede estar vacío.");

  perfilBusy = true;
  const r = await guardarPerfilServidor({nombre: name});
  perfilBusy = false;

  if(!r.ok) return alert(r.error);

  const user = currentUser;                       // ya trae el nombre guardado en el servidor

  // El nombre en las entregas viene de la base de datos: solo se vuelven a pedir
  if(typeof recargarActividades === "function") recargarActividades();

  // Actualizar lo que se ve en pantalla (sin repetir la animación de entrada)
  const mini = document.querySelector(".sidebar-bottom .user-mini span");
  if(mini) mini.innerHTML = escapeHtml(user.name) + "<br><small style='color:#7e8aa5'>" + escapeHtml(typeof userRoleLabel === "function" ? userRoleLabel(user) : user.username) + "</small>";
  applyProfilePhoto();    // muestra la foto, o la inicial si no hay foto
  const h2 = document.querySelector(".profile-top h2");
  if(h2) h2.textContent = user.name;

  renderAdminUsers();
  alert("Perfil actualizado.");
}

/* ---------- Cambiar contraseña ---------- */

function ensurePwdStyle(){
  if(document.getElementById("pwdStyle")) return;
  const st = document.createElement("style");
  st.id = "pwdStyle";
  st.textContent = `
    /* Perfil y cambio de contraseña van en la misma fila: el cuadro pequeño queda a la derecha */
    .perfil-row{display:grid; grid-template-columns:repeat(2,minmax(0,430px)); gap:16px; align-items:stretch}
    .perfil-row > .profile{width:auto; max-width:none; margin:0}
    .pwd-card{
      display:flex; flex-direction:column; width:auto; max-width:none; padding:18px 20px 20px; border-radius:16px;
      background:linear-gradient(165deg,rgba(12,26,62,.62),rgba(6,15,38,.68));
      border:1px solid rgba(80,200,130,.38);
    }
    .pwd-card h3{margin:0 0 3px; font-size:16px}
    .pwd-sub{margin:0 0 12px; font-size:12px; line-height:1.4; color:#8fe3b3}
    .pwd-grid{display:grid; grid-template-columns:1fr; gap:12px}
    .pwd-msg{min-height:16px; margin:10px 0 8px; font-size:12px; line-height:1.35; color:#ffb3c6}
    .pwd-msg.ok{color:#6fe3a1}
    .pwd-card .btn{margin-top:auto; width:100%}
    @media(max-width:1000px){ .perfil-row{grid-template-columns:minmax(0,430px)} }
  `;
  document.head.appendChild(st);
}

function setupPasswordBox(){

  const profile = document.querySelector("#perfil .profile");
  if(!profile || document.getElementById("pwdBox")) return;

  ensurePwdStyle();

  const box = document.createElement("div");
  box.id = "pwdBox";
  box.className = "pwd-card";
  box.innerHTML = `
    <h3>Cambiar contraseña</h3>
    <p class="pwd-sub">Mínimo 6 caracteres.</p>
    <div class="pwd-grid">
      <div class="field"><label>Contraseña actual</label><input id="pwdOld" type="password" autocomplete="current-password"></div>
      <div class="field"><label>Nueva contraseña</label><input id="pwdNew" type="password" autocomplete="new-password"></div>
      <div class="field"><label>Confirmar nueva contraseña</label><input id="pwdNew2" type="password" autocomplete="new-password"></div>
    </div>
    <p class="pwd-msg" id="pwdMsg"></p>
    <button type="button" class="btn" id="pwdSaveBtn">Cambiar contraseña</button>`;
  // Se pone en la misma fila que el perfil, a su derecha
  let row = profile.parentElement;
  if(!row.classList.contains("perfil-row")){
    row = document.createElement("div");
    row.className = "perfil-row";
    profile.parentElement.insertBefore(row, profile);
    row.appendChild(profile);
  }
  row.appendChild(box);

  document.getElementById("pwdSaveBtn").addEventListener("click", changePassword);
}

let pwdBusy = false;

async function changePassword(){

  if(!requirePermission("edit","perfil")) return;
  if(!currentUser || pwdBusy) return;

  const msg = document.getElementById("pwdMsg");
  const say = (text, ok) => { msg.textContent = text; msg.classList.toggle("ok", !!ok); };

  const oldPass = document.getElementById("pwdOld").value;
  const pass1 = document.getElementById("pwdNew").value;
  const pass2 = document.getElementById("pwdNew2").value;

  if(!oldPass || !pass1 || !pass2) return say("Completa los tres campos.");
  if(pass1.length < 6) return say("La nueva contraseña debe tener mínimo 6 caracteres.");
  if(pass1 === oldPass) return say("La nueva contraseña debe ser distinta a la actual.");
  if(pass1 !== pass2) return say("Las contraseñas nuevas no coinciden.");

  pwdBusy = true;
  const r = await apiPost("api/cambiar_clave.php", {actual: oldPass, nueva: pass1});
  pwdBusy = false;

  if(!r.ok) return say(r.error || "No se pudo cambiar la contraseña.");

  ["pwdOld","pwdNew","pwdNew2"].forEach(id => { document.getElementById(id).value = ""; });
  say("Contraseña actualizada.", true);
  if(typeof showToast === "function") showToast("Contraseña actualizada", "Úsala la próxima vez que inicies sesión.", "ok", 3500);
}

(function(){
  setupPasswordBox();
  setupPhotoControls();
  applyProfilePhoto();

  const btn = document.querySelector("#perfil .actions .btn");
  if(btn) btn.addEventListener("click", saveProfile);

  // El grado lo cambia el administrador desde Administración → Editar
  const inputs = document.querySelectorAll("#perfil .profile .field input");
  if(inputs[2]) inputs[2].disabled = true;
})();