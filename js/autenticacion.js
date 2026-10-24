/* =========================================================
   AUTENTICACIÓN
   ========================================================= */

let currentUser = JSON.parse(localStorage.getItem("ade_current_user") || "null");

// Refresca la sesión guardada con los datos actuales (por ejemplo, el correo nuevo)
if(currentUser){
  const fresh = users.find(u => u && String(u.username).toLowerCase() === String(currentUser.username).toLowerCase());
  if(fresh){
    currentUser = fresh;
    localStorage.setItem("ade_current_user", JSON.stringify(fresh));
  }
}

/* =========================================================
   AVISOS (arriba a la derecha)
   showToast("Título", "Texto", "ok" | "info", milisegundos, foto)   (foto es opcional)
   No hace falta tocar el HTML ni el CSS: se crea solo.
   ========================================================= */

function ensureToastStyle(){

  if(document.getElementById("toastStyle")) return;

  const st = document.createElement("style");
  st.id = "toastStyle";
  st.textContent = `
    #toastBox{
      position:fixed; top:84px; right:18px; z-index:2147482000;
      display:flex; flex-direction:column; gap:10px;
      width:min(360px, calc(100vw - 36px)); pointer-events:none;
    }
    .toast{
      pointer-events:auto; position:relative; overflow:hidden;
      display:flex; gap:12px; align-items:flex-start;
      padding:14px 38px 16px 14px; border-radius:13px;
      color:#eef4ff; font-family:Arial,Helvetica,sans-serif;
      background:linear-gradient(165deg,rgba(11,58,77,.97),rgba(4,14,34,.97));
      border:1px solid rgba(35,160,90,.65);
      box-shadow:0 12px 34px rgba(0,0,0,.5), 0 0 26px rgba(35,160,90,.22);
      animation:toastIn .45s cubic-bezier(.2,.9,.25,1.1) both;
    }
    .toast.out{animation:toastOut .35s ease forwards}
    .toast-icon{
      flex:none; width:34px; height:34px; border-radius:50%;
      display:grid; place-items:center; font-size:17px; font-weight:bold;
      background:#238b5b; color:#fff; box-shadow:0 0 14px rgba(46,230,160,.45);
    }
    .toast-icon.photo{
      width:44px; height:44px; background-size:cover; background-position:center;
      border:2px solid #23a05a; box-shadow:0 0 14px rgba(46,230,160,.45); font-size:0;
    }
    .toast.info .toast-icon{background:#1b5cd6;box-shadow:0 0 14px rgba(40,120,255,.5)}
    .toast.info{border-color:rgba(60,130,255,.65)}
    .toast b{display:block; font-size:15px; margin-bottom:3px}
    .toast span{display:block; font-size:13px; line-height:1.4; color:#b9cbe6}
    .toast-x{
      position:absolute; top:6px; right:8px; width:24px; height:24px;
      background:none; color:#8fa6c8; font-size:18px; line-height:1; border-radius:6px;
    }
    .toast-x:hover{color:#fff; background:rgba(255,255,255,.1)}
    .toast-bar{
      position:absolute; left:0; bottom:0; height:3px; width:100%;
      background:linear-gradient(90deg,#1b5cd6,#23a05a);
      transform-origin:left; animation:toastBar var(--t,4.5s) linear forwards;
    }
    @keyframes toastIn{from{opacity:0;transform:translateX(40px) scale(.96)}to{opacity:1;transform:none}}
    @keyframes toastOut{to{opacity:0;transform:translateX(40px)}}
    @keyframes toastBar{to{transform:scaleX(0)}}
    @media (prefers-reduced-motion:reduce){.toast,.toast.out{animation-duration:.01s}.toast-bar{animation:none}}
  `;
  document.head.appendChild(st);
}

function showToast(title, text, type = "ok", ms = 4500, photo = ""){

  ensureToastStyle();

  let box = document.getElementById("toastBox");
  if(!box){
    box = document.createElement("div");
    box.id = "toastBox";
    document.body.appendChild(box);
  }

  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.setAttribute("role", "status");
  toast.style.setProperty("--t", ms + "ms");

  const icon = document.createElement("div");
  icon.className = "toast-icon";
  if(photo){
    icon.classList.add("photo");
    icon.style.backgroundImage = "url(" + photo + ")";
  }else{
    icon.textContent = type === "ok" ? "✓" : "i";
  }

  const body = document.createElement("div");
  const b = document.createElement("b");
  b.textContent = title;
  const sp = document.createElement("span");
  sp.textContent = text || "";
  body.append(b, sp);

  const x = document.createElement("button");
  x.className = "toast-x";
  x.setAttribute("aria-label", "Cerrar aviso");
  x.textContent = "×";

  const bar = document.createElement("div");
  bar.className = "toast-bar";

  toast.append(icon, body, x, bar);
  box.appendChild(toast);

  let timer;
  const close = () => {
    clearTimeout(timer);
    toast.classList.add("out");
    setTimeout(() => toast.remove(), 380);
  };
  x.addEventListener("click", close);
  timer = setTimeout(close, ms);
}


// Llena la lista de grados (6-1 ... 11-9) para no repetir 54 <option> en el HTML.
(function(){
  const select = $("regGrade");
  if(!select) return;
  for(let g = 6; g <= 11; g++){
    for(let c = 1; c <= 9; c++) select.add(new Option(g + "-" + c, g + "-" + c));
  }
})();

// "Selecciona" es solo una pista: se ve al inicio, pero no se puede volver a elegir en la lista.
(function(){
  ["regRole","regGrade"].forEach(id => {
    const sel = $(id);
    const first = sel && sel.options[0];
    if(first && first.value === ""){ first.hidden = true; first.disabled = true; }
  });
})();


/* ---------- Ojito para ver / ocultar contraseñas (todos los campos) ---------- */

(function(){

  const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  const style = document.createElement("style");
  style.textContent = `
    .pw-wrap{position:relative;display:block;width:100%}
    .pw-wrap > input{width:100%;box-sizing:border-box;padding-right:42px !important}
    .pw-eye{
      position:absolute;
      top:50%;
      right:8px;
      transform:translateY(-50%);
      display:flex;
      align-items:center;
      justify-content:center;
      width:30px;
      height:30px;
      padding:0;
      margin:0;
      border:0;
      border-radius:6px;
      background:transparent;
      color:#7e8aa5;
      cursor:pointer;
    }
    .pw-eye:hover{color:#4f8cff;background:rgba(127,127,127,.15)}
  `;
  document.head.appendChild(style);

  document.querySelectorAll('input[type="password"]').forEach(input => {

    // El wrapper toma los márgenes del campo para que el diseño no cambie
    const margin = getComputedStyle(input).margin;
    const wrap = document.createElement("div");
    wrap.className = "pw-wrap";
    wrap.style.margin = margin;
    input.style.margin = "0";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";                       // no envía formularios
    btn.className = "pw-eye";
    btn.title = "Mostrar contraseña";
    btn.setAttribute("aria-label", "Mostrar contraseña");
    btn.innerHTML = EYE;

    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.title = show ? "Ocultar contraseña" : "Mostrar contraseña";
      btn.setAttribute("aria-label", btn.title);
      input.focus();
    });

    wrap.appendChild(btn);
  });

})();


// Logo A.D.E. con las letras en Arial MAYÚSCULAS (el diseño es el mismo; solo cambian las letras).
// Va dentro de este archivo, así que no hay que subir ninguna imagen. Se usa en el encabezado,
// el login y la barra lateral. (La animación de entrada ya trae el mismo logo.)
const ADE_LOGO_ARIAL = "data:image/jpeg;base64,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";

(function(){
  function aplicarLogo(){
    document.querySelectorAll(".brand-logo, .auth-logo-img, .sidebar-logo-img").forEach(img => {
      if(img.src !== ADE_LOGO_ARIAL) img.src = ADE_LOGO_ARIAL;      // el logo redondo del colegio NO se toca
    });
  }
  aplicarLogo();
  setTimeout(aplicarLogo, 400);       // por si algún logo se dibuja un poco después
})();


/* ---------- Pantalla de login / registro ---------- */

function showForm(mode){

  const forms = {
    login:    $("loginForm"),
    register: $("registerForm"),
    forgot:   $("forgotForm")
  };
  Object.keys(forms).forEach(key => {
    if(forms[key]) forms[key].style.display = (key === mode) ? "block" : "none";
  });

  const message = $({login:"loginMessage", register:"registerMessage", forgot:"forgotMessage"}[mode]);
  if(message) message.textContent = "";

  const card = document.querySelector("#authScreen .auth-card");
  if(card) card.classList.add("wide");          // ingreso, registro y recuperar usan la misma tarjeta (mismo tamaño)
  ensureAuthStyle();

  if(mode === "forgot") resetForgotForm();
  if(mode === "register"){
    fillSubjectSelect($("regSubject"), "");   // las materias pueden haber cambiado
    resetRegSubjects();
    toggleRegSubject();
  }
}

// Al elegir "Profesor" aparece la lista de materias (con "Añadir otra materia") y los grupos
const REG_MAX_SUBJECTS = 6;

function ensureRegTeacherUI(){
  const field = $("regSubjectField");
  if(!field || $("regSubjectExtra")) return;

  if(!$("regSubjStyle")){
    const st = document.createElement("style");
    st.id = "regSubjStyle";
    st.textContent = `
      #regSubjectExtra{display:flex;flex-direction:column;gap:8px;margin-top:8px}
      #regSubjectExtra:empty{display:none}
      .reg-subj-row{display:flex;gap:8px;align-items:center}
      .reg-subj-row select{flex:1;min-width:0;width:100%;background:#0b1020;color:#fff;border:1px solid #303b57;border-radius:9px;padding:12px;outline:none}
      .reg-subj-del{
        flex:none;width:42px;height:42px;border-radius:9px;cursor:pointer;
        background:#0b1020;color:#ff9aa8;border:1px solid #303b57;font-size:18px;line-height:1}
      .reg-subj-del:hover{border-color:#ff9aa8}
      .reg-subj-add{
        align-self:flex-start;background:rgba(34,197,94,.12);color:#9ff0c4;
        border:1px dashed rgba(34,197,94,.6);border-radius:9px;padding:8px 14px;
        font:700 12px Arial,Helvetica,sans-serif;cursor:pointer}
      .reg-subj-add:hover{background:rgba(34,197,94,.24)}
      .reg-subj-add[disabled]{opacity:.45;cursor:default}
    `;
    document.head.appendChild(st);
  }

  const extra = document.createElement("div");
  extra.id = "regSubjectExtra";
  const add = document.createElement("button");
  add.type = "button";
  add.id = "regSubjectAdd";
  add.className = "reg-subj-add";
  add.textContent = "+ Añadir otra materia";
  add.onclick = addRegSubject;
  field.appendChild(extra);
  field.appendChild(add);

  // Grupos que atiende (el horario y las actividades del profesor dependen de esto)
  const groups = document.createElement("div");
  groups.className = "auth-field full";
  groups.id = "regGroupsField";
  groups.style.display = "none";
  groups.innerHTML = '<label>Grupos que atiendes (ej. 6-1, 7-2)</label>' +
                     '<input id="regGroups" type="text" placeholder="Escribe tus grupos separados por coma">';
  field.insertAdjacentElement("afterend", groups);
}

function regSubjectsList(){
  const vals = [$("regSubject")].concat([...document.querySelectorAll(".reg-subj-extra")])
    .map(s => s ? s.value : "").filter(Boolean);
  return vals.filter((v, i) => vals.findIndex(x => normText(x) === normText(v)) === i);
}

function addRegSubject(){
  const box = $("regSubjectExtra");
  if(!box) return;
  if(box.children.length + 1 >= REG_MAX_SUBJECTS) return;
  const row = document.createElement("div");
  row.className = "reg-subj-row";
  row.innerHTML = '<select class="reg-subj-extra"></select>' +
                  '<button type="button" class="reg-subj-del" title="Quitar esta materia">×</button>';
  fillSubjectSelect(row.querySelector("select"), "");
  row.querySelector("button").onclick = () => { row.remove(); refreshRegSubjectAdd(); };
  box.appendChild(row);
  refreshRegSubjectAdd();
}

function refreshRegSubjectAdd(){
  const box = $("regSubjectExtra"), add = $("regSubjectAdd");
  if(box && add) add.disabled = box.children.length + 1 >= REG_MAX_SUBJECTS;
}

function resetRegSubjects(){
  ensureRegTeacherUI();
  const box = $("regSubjectExtra");
  if(box) box.innerHTML = "";
  if($("regGroups")) $("regGroups").value = "";
  refreshRegSubjectAdd();
}

function toggleRegSubject(){
  const field = $("regSubjectField");
  const role = $("regRole");
  if(!field || !role) return;
  ensureRegTeacherUI();
  const isTeacher = role.value === "profesor";
  field.style.display = isTeacher ? "block" : "none";
  if($("regGroupsField")) $("regGroupsField").style.display = isTeacher ? "" : "none";
  const gradeBox = $("regGrade") && $("regGrade").closest(".auth-field");
  if(gradeBox) gradeBox.style.display = isTeacher ? "none" : "";   // el profesor usa "Grupos"
}

function showLogin(){ showForm("login"); }
function showRegister(){ showForm("register"); }
function showForgot(){ showForm("forgot"); }

function openAuth(type){
  const authScreen = $("authScreen");
  if(!authScreen) return;
  authScreen.classList.add("show");
  showForm(type === "register" || type === "forgot" ? type : "login");
}

function closeAuth(){
  const authScreen = $("authScreen");
  if(authScreen) authScreen.classList.remove("show");
}


/* ---------- Banner de la portada: "¡Regístrate ahora!" abre el registro ----------
   El botón forma parte de la imagen del banner, así que se detecta el clic en esa zona
   (abajo a la izquierda de la imagen grande). Si en el HTML la imagen tiene data-action="register",
   se abre el registro con un clic en cualquier parte de ella. */

function bannerRegisterHit(e){

  const land = $("landingScreen");
  if(!land || !land.contains(e.target)) return null;

  let el = e.target;
  while(el && el !== land){
    const big = el.getBoundingClientRect();
    const isPicture = el.tagName === "IMG" || /url\(/.test(getComputedStyle(el).backgroundImage || "");
    if(isPicture && big.width > 480 && big.height > 180 && big.width / big.height > 1.5){
      if(el.dataset && el.dataset.action === "register") return el;
      const x = (e.clientX - big.left) / big.width;
      const y = (e.clientY - big.top) / big.height;
      return (x >= 0.04 && x <= 0.50 && y >= 0.70 && y <= 0.93) ? el : null;
    }
    el = el.parentElement;
  }
  return null;
}

(function(){
  const land = $("landingScreen");
  if(!land) return;

  land.addEventListener("click", e => {
    if(bannerRegisterHit(e)) openAuth("register");
  });

  // El cursor cambia a "manita" solo encima del botón "¡Regístrate ahora!"
  let ticking = false;
  land.addEventListener("pointermove", e => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const hit = bannerRegisterHit(e);
      land.style.cursor = hit ? "pointer" : "";
    });
  });
})();


/* ---------- Iniciar sesión (formulario principal y login rápido) ---------- */

// Llama a un archivo PHP del servidor y devuelve su respuesta {ok, error, ...}
async function apiPost(url, datos){

  let r;
  try{
    r = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(datos || {})
    });
  }catch(e){
    return {ok:false, error:"No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."};
  }

  try{
    return await r.json();
  }catch(e){
    return {ok:false, error:"El servidor no respondió bien. Recarga la página (F5) e intenta otra vez."};
  }
}

// La cuenta que llega del servidor se guarda también en la lista local "users",
// porque el resto de la app (todavía) busca ahí los datos del usuario. Nunca se guarda su contraseña.
function guardarUsuarioLocal(datos){

  const copia = Object.assign({}, datos, {password:""});
  const i = users.findIndex(u => u && String(u.username).toLowerCase() === String(datos.username).toLowerCase());

  if(i >= 0){
    users[i] = copia;
  }else{
    users.push(copia);
  }

  saveUsers();
  return copia;
}

let loginBusy = false;

// fail(texto) decide cómo mostrar el error (alert o mensaje en pantalla)
async function doLogin(userId, passId, fail){

  if(loginBusy) return;

  const userInput = $(userId);
  const passInput = $(passId);

  if(!userInput || !passInput) return fail("No se encontraron los campos de inicio de sesión.");

  const username = userInput.value.trim();
  const password = passInput.value;

  if(!username || !password) return fail("Ingresa tu usuario o correo y tu contraseña.");

  loginBusy = true;
  const r = await apiPost("api/login.php", {usuario:username, clave:password});
  loginBusy = false;

  if(!r.ok) return fail(r.error || "No se pudo iniciar sesión.");

  const user = guardarUsuarioLocal(r.usuario);

  currentUser = user;
  localStorage.setItem("ade_current_user", JSON.stringify(user));
  await cargarUsuariosServidor();      // trae del servidor las cuentas que este usuario puede ver
  enterApp();

  const roleName = (typeof ROLE_LABELS !== "undefined" && ROLE_LABELS[user.role]) || "Estudiante";
  showToast("¡Bienvenido, " + (user.name || user.username) + "!", "Iniciaste sesión como " + roleName.toLowerCase() + ".", "ok", 4500, user.photo || "");
}

function quickLogin(){
  doLogin("quickLoginUser", "quickLoginPass", text => alert(text));
}

function login(){
  const message = $("loginMessage");
  doLogin("loginUser", "loginPass", text => { if(message) message.textContent = text; });
}


/* ---------- Tarjeta única: ingreso, registro y recuperar contraseña ----------
   Las tres pantallas comparten la misma tarjeta compacta (letras y campos del tamaño de la portada).
   Detrás se ve el mismo fondo animado (neblina y brasas) de la portada.
   Si el formulario es más largo (ej. profesor con varias materias) se desplaza dentro de la tarjeta. */
function ensureAuthStyle(){
  if(document.getElementById("authSameSizeStyle")) return;
  const st = document.createElement("style");
  st.id = "authSameSizeStyle";
  st.textContent = `
    /* fondo: transparente para que se vea la neblina y las brasas; la portada se oculta mientras está abierto */
    #authScreen.auth-screen{background:transparent;padding:clamp(10px,1.4vw,24px)}
    body.auth-open #landingScreen{visibility:hidden}

    /* Tarjeta compacta: se ajusta al contenido (como el panel de ingreso de la portada), sin tamaños gigantes */
    #authScreen .auth-card.wide{
      display:grid !important;
      grid-template-columns:clamp(220px,28%,320px) minmax(0,1fr);
      grid-template-rows:auto;
      column-gap:clamp(22px,2.6vw,44px);
      align-items:center;
      width:100% !important;
      max-width:1020px !important;
      height:auto !important;
      max-height:94vh !important; max-height:94dvh !important;
      padding:clamp(20px,2vw,32px);
      border-radius:20px;
      overflow:hidden;
    }
    #authScreen .auth-card.wide .auth-close{top:14px;right:18px;font-size:26px}
    #authScreen .auth-card.wide > .auth-logo{grid-column:1;grid-row:1;align-self:stretch;border-radius:16px;min-height:300px}
    #authScreen .auth-card.wide .auth-logo-img{height:clamp(80px,7vw,120px);margin-bottom:16px;border-radius:14px}
    #authScreen .auth-card.wide .auth-logo h1{font-size:clamp(18px,1.5vw,24px)}
    #authScreen .auth-card.wide .auth-logo p{font-size:14px}

    #authScreen .auth-card.wide > #loginForm,
    #authScreen .auth-card.wide > #forgotForm,
    #authScreen .auth-card.wide > #registerForm{
      grid-column:2;grid-row:1;align-self:center;
      width:100%;max-height:calc(94vh - 90px);max-height:calc(94dvh - 90px);overflow-y:auto;padding:4px 6px 4px 2px;box-sizing:border-box;margin:0 auto;
    }
    #authScreen .auth-card.wide > #loginForm,
    #authScreen .auth-card.wide > #forgotForm{max-width:440px}
    #authScreen .auth-card.wide > #registerForm{max-width:660px}

    /* letras y campos: del tamaño de los de la portada */
    #authScreen .auth-card.wide h2{font-size:clamp(22px,1.8vw,28px);margin-bottom:4px}
    #authScreen .auth-card.wide .auth-subtitle{font-size:14px;margin-bottom:14px}
    #authScreen .auth-card.wide .auth-field{gap:6px;margin-bottom:12px}
    #authScreen .auth-card.wide .reg-grid{gap:12px 14px;margin:10px 0 12px}
    #authScreen .auth-card.wide .reg-grid .auth-field{margin:0}
    /* Usuario y correo van lado a lado (antes ocupaban una fila cada uno) */
    #authScreen .auth-card.wide .reg-grid .auth-field.full:has(#regUser),
    #authScreen .auth-card.wide .reg-grid .auth-field.full:has(#regEmail){grid-column:auto}
    #authScreen .auth-card.wide .auth-field label{font-size:13px}
    #authScreen .auth-card.wide .auth-field input,
    #authScreen .auth-card.wide .auth-field select{font-size:14px;padding:11px 14px;border-radius:10px}
    #authScreen .auth-card.wide .auth-btn{font-size:14px;padding:12px;border-radius:10px;margin-top:4px}
    #authScreen .auth-card.wide .switch-auth{font-size:13px;margin-top:12px}
    #authScreen .auth-card.wide .auth-message{font-size:13px;margin-top:6px;min-height:0}
    #authScreen .auth-card.wide .reg-subj-row select{padding:11px 14px}
    #authScreen .auth-card.wide .reg-subj-add{font-size:12px;padding:8px 14px}

    /* pantallas bajitas (laptops pequeñas): un poco más compacto todavía */
    @media(min-width:761px) and (max-height:700px){
      #authScreen .auth-card.wide{padding:16px 24px}
      #authScreen .auth-card.wide .auth-subtitle{margin-bottom:8px}
      #authScreen .auth-card.wide .auth-field{margin-bottom:8px;gap:4px}
      #authScreen .auth-card.wide .reg-grid{gap:8px 14px;margin:6px 0 8px}
      #authScreen .auth-card.wide .auth-field input,
      #authScreen .auth-card.wide .auth-field select{padding:9px 12px}
      #authScreen .auth-card.wide .auth-btn{padding:10px}
      #authScreen .auth-card.wide .switch-auth{margin-top:8px}
    }

    @media(max-width:760px){
      #authScreen .auth-card.wide{
        display:flex !important;flex-direction:column;
        grid-template-columns:none;
        height:auto !important;max-height:96vh !important;max-height:96dvh !important;
        overflow-y:auto;
      }
      #authScreen .auth-card.wide > .auth-logo{flex:none;margin-top:auto}
      #authScreen .auth-card.wide .auth-logo-img{height:64px;margin-bottom:10px}
      #authScreen .auth-card.wide > #loginForm,
      #authScreen .auth-card.wide > #forgotForm,
      #authScreen .auth-card.wide > #registerForm{flex:none;max-height:none;overflow:visible;margin-bottom:auto;padding:0;max-width:none}
    }
  `;
  document.head.appendChild(st);

  // Marca <body> mientras la pantalla de ingreso/registro está abierta (aunque otro código la cierre)
  const screen = document.getElementById("authScreen");
  if(screen){
    const sync = () => document.body.classList.toggle("auth-open", screen.classList.contains("show"));
    new MutationObserver(sync).observe(screen, {attributes:true, attributeFilter:["class"]});
    sync();
  }
}

ensureAuthStyle();


/* ---------- Registro ---------- */

let registerBusy = false;

async function registerUser(){

  const message = $("registerMessage");
  const say = text => { if(message) message.textContent = text; };

  const fields = ["regName","regRole","regUser","regEmail","regGrade","regPass","regPass2","regLastName","regBirth"].map($);
  if(fields.some(f => !f)) return say("Faltan campos del formulario de registro.");

  // Nombre, usuario y correo se limpian de espacios
  const [name, role, username, email, grade, pass, pass2, lastName, birth] =
    fields.map((f, i) => (i === 0 || i === 2 || i === 3 || i === 7) ? f.value.trim() : f.value);

  const isTeacher = role === "profesor";
  if(!lastName) return say("Escribe tus apellidos.");
  if(birth && birth > new Date().toISOString().slice(0, 10)) return say("La fecha de nacimiento no puede ser futura.");
  if(!name || !role || !username || !email || (!isTeacher && !grade) || !pass || !pass2) return say("Completa todos los campos.");
  if(!isValidEmail(email)) return say("Escribe un correo válido (ej. nombre@gmail.com).");
  if(pass !== pass2) return say("Las contraseñas no coinciden.");

  // Nadie se hace administrador por su cuenta; esas cuentas las crea el administrador.
  if(role !== "estudiante" && role !== "profesor") return say("Elige si eres estudiante o profesor.");

  // Profesor: una o más materias y los grupos que atiende
  let mySubjects = [], myGroups = [];
  if(isTeacher){
    mySubjects = regSubjectsList();
    if(!mySubjects.length) return say("Elige la materia que dictas.");
    const gi = $("regGroups");
    myGroups = (gi ? gi.value : "").split(/[,;\s]+/).map(g => g.trim()).filter(Boolean);
    myGroups = myGroups.filter((g, i) => myGroups.indexOf(g) === i);
    if(!myGroups.length) return say("Escribe los grupos que atiendes (ej. 6-1, 7-2).");
    const known = (window.ADE_CURRICULUM && Array.isArray(ADE_CURRICULUM.groups) && ADE_CURRICULUM.groups.length) ? ADE_CURRICULUM.groups : null;
    const bad = myGroups.find(g => !/^\d{1,2}-\d{1,2}$/.test(g) || (known && !known.includes(g)));
    if(bad) return say('El grupo "' + bad + '" no existe. Usa el formato 6-1.');
  }

  if(registerBusy) return;
  registerBusy = true;

  const r = await apiPost("api/registro.php", {
    nombre: name, apellidos: lastName, nacimiento: birth, tipo: role, usuario: username, correo: email, clave: pass,
    grupo: isTeacher ? "" : grade, materias: mySubjects, grupos: myGroups
  });

  registerBusy = false;
  if(!r.ok) return say(r.error || "No se pudo crear la cuenta.");

  if(message) message.style.color = "#dfe5f1";
  say("Cuenta creada correctamente. Ahora puedes iniciar sesión.");
  showToast("¡Cuenta creada!", "Ya estás registrado, " + name + ". Ahora inicia sesión.", "ok");

  setTimeout(() => {
    const loginUser = $("loginUser");
    if(loginUser) loginUser.value = username;
    if(message) message.style.color = "";
    showLogin();
  }, 1000);
}


/* ---------- Olvidé mi contraseña ----------
   Paso 1: se escribe el usuario y el correo; el servidor revisa que sean de la misma cuenta.
   Paso 2: se elige una contraseña nueva (el servidor deja 10 minutos para hacerlo).
   No se envía ningún correo. */

let forgotBusy = false;

function resetForgotForm(){
  forgotBusy = false;
  const fu = $("forgotUser");
  if(fu){
    fu.placeholder = "Tu usuario";
    const lab = fu.closest(".auth-field") && fu.closest(".auth-field").querySelector("label");
    if(lab) lab.textContent = "Usuario";
  }
  const sub = document.querySelector("#forgotForm .auth-subtitle");
  if(sub) sub.textContent = "Escribe tu usuario y el correo de tu cuenta";
  ["forgotUser","forgotEmail","forgotPass","forgotPass2"].forEach(id => { const el = $(id); if(el) el.value = ""; });
  const step1 = $("forgotStep1"), step2 = $("forgotStep2");
  if(step1) step1.style.display = "block";
  if(step2) step2.style.display = "none";
  const message = $("forgotMessage");
  if(message){ message.textContent = ""; message.style.color = ""; }
}

async function verifyForgot(){

  const message = $("forgotMessage");
  const say = text => { if(message){ message.style.color = ""; message.textContent = text; } };

  const username = $("forgotUser").value.trim();
  const email = $("forgotEmail").value.trim();

  if(!username || !email) return say("Escribe tu usuario y el correo de tu cuenta.");
  if(forgotBusy) return;

  forgotBusy = true;
  const r = await apiPost("api/recuperar.php", {paso:"verificar", usuario:username, correo:email});
  forgotBusy = false;

  if(!r.ok) return say(r.error || "No se pudo verificar la cuenta.");

  $("forgotStep1").style.display = "none";
  $("forgotStep2").style.display = "block";
  say("");
}

async function saveForgotPassword(){

  const message = $("forgotMessage");
  const say = text => { if(message){ message.style.color = ""; message.textContent = text; } };

  const pass = $("forgotPass").value;
  const pass2 = $("forgotPass2").value;

  if(!pass || !pass2) return say("Escribe la nueva contraseña dos veces.");
  if(pass.length < 6) return say("La nueva contraseña debe tener mínimo 6 caracteres.");
  if(pass !== pass2) return say("Las contraseñas no coinciden.");
  if(forgotBusy) return;

  const username = $("forgotUser").value.trim();

  forgotBusy = true;
  const r = await apiPost("api/recuperar.php", {paso:"cambiar", nueva:pass});
  forgotBusy = false;

  if(!r.ok) return say(r.error || "No se pudo cambiar la contraseña.");

  if(message){
    message.style.color = "#dfe5f1";
    message.textContent = "Contraseña cambiada. Ya puedes iniciar sesión.";
  }

  setTimeout(() => {
    showLogin();
    const loginUser = $("loginUser");
    if(loginUser) loginUser.value = username;
  }, 1200);
}


/* ---------- Animación de entrada de la aplicación ---------- */

let enterAnimTimer = null;

function playEnterAnimation(app){
  app.classList.remove("entrando");
  void app.offsetWidth;                 // reinicia la animación
  app.classList.add("entrando");
  clearTimeout(enterAnimTimer);
  // Se quita la clase al terminar para que no se repita al actualizar las tarjetas
  enterAnimTimer = setTimeout(() => app.classList.remove("entrando"), 2400);
}


/* ---------- Entrar a la aplicación ---------- */

function enterApp(){

  if(!currentUser){
    console.error("No existe un usuario actual.");
    return;
  }

  const authScreen = $("authScreen");
  const landingScreen = $("landingScreen");
  const mainApp = $("mainApp");

  if(authScreen) authScreen.classList.remove("show");
  if(landingScreen) landingScreen.style.display = "none";
  if(mainApp){
    mainApp.style.display = "flex";
    playEnterAnimation(mainApp);
  }

  const n = currentUser.name || currentUser.username || "Usuario";
  const username = currentUser.username || "";
  const initial = n.charAt(0).toUpperCase();

  // Ejecuta fn con el elemento solo si existe
  const set = (selector, fn) => {
    const el = document.querySelector(selector);
    if(el) fn(el);
  };

  set(".sidebar-bottom .user-mini span", el =>
    el.innerHTML = escapeHtml(n) + "<br><small style='color:#7e8aa5'>" + escapeHtml(typeof userRoleLabel === "function" ? userRoleLabel(currentUser) : username) + "</small>");
  set(".sidebar-bottom .avatar", el => el.textContent = initial);
  set(".big-avatar", el => el.textContent = initial);
  set(".profile-top h2", el => el.textContent = n);
  set(".profile-top .muted", el => el.textContent = "@" + username);

  if(typeof renderProfile === "function") renderProfile();    // nombre, apellidos, correo, nacimiento y grado

  if(typeof applyProfilePhoto === "function") applyProfilePhoto();   // foto de perfil (si tiene)

  set("#profileRole", el => el.textContent =
    {profesor:"Profesor", admin:"Administrador"}[currentUser.role] || "Estudiante");

  // Materia del profesor en "Mi perfil"
  const isTeacher = currentUser.role === "profesor";
  set("#profileSubjectField", el => el.style.display = isTeacher ? "" : "none");
  set("#profileSubject", el => el.textContent = (typeof teacherSubjectsText === "function" ? teacherSubjectsText() : currentUser.subject) || "Sin materia asignada");
  set("#profileSubjectField .pf-label", el => el.textContent = (typeof teacherSubjects === "function" && teacherSubjects().length > 1) ? "Materias" : "Materia");

  applyPermissions();
  renderAdminUsers();
  render();

  // Se piden las notificaciones al servidor y, cuando llegan, un mensajito si hay sin leer
  if(typeof cargarNotificaciones === "function"){
    cargarNotificaciones().then(() => {
      if(typeof announceUnread === "function") setTimeout(announceUnread, 600);
    });
  }
  // Se piden las actividades al servidor y, cuando llegan, el estudiante recibe el aviso
  // de las que vencen hoy, mañana o en 2 días
  if(typeof recargarHorarios === "function") recargarHorarios();
  if(typeof recargarEventos === "function") recargarEventos();
  if(typeof recargarActividades === "function"){
    recargarActividades().then(() => {
      if(typeof announceDueSoon === "function") setTimeout(announceDueSoon, 1200);
    });
  }
}


/* ---------- Cerrar sesión ---------- */

function logout(){

  fetch("api/salir.php", {method:"POST", credentials:"same-origin"}).catch(() => {});
  localStorage.removeItem("ade_current_user");
  currentUser = null;
  users = [];                       // no se deja en este computador la lista de otras cuentas
  saveUsers();
  if(typeof activities !== "undefined") activities = [];   // ni las actividades de esta cuenta
  if(typeof groupSchedules !== "undefined"){ groupSchedules = {}; schedule = []; scheduleMode = "legacy"; }   // ni su horario
  if(typeof calendarEvents !== "undefined") calendarEvents = {};                                         // ni su calendario
  if(typeof notifList !== "undefined"){ notifList = []; notifSig = ""; }   // ni sus notificaciones

  const mainApp = $("mainApp");
  const landingScreen = $("landingScreen");

  if(mainApp) mainApp.style.display = "none";
  if(landingScreen) landingScreen.style.display = "block";
  closeAuth();

  // Volver siempre a Inicio, para que el próximo usuario no vea una página vacía
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const inicio = $("inicio");
  if(inicio) inicio.classList.add("active");
  document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
  const first = document.querySelector(".nav button");
  if(first) first.classList.add("active");
  const title = $("pageTitle");
  if(typeof setPageTitle === "function") setPageTitle("inicio");
  else if(title) title.textContent = "Inicio";

  ["loginUser","loginPass"].forEach(id => { const el = $(id); if(el) el.value = ""; });

  showLogin();
}


/* ---------- Al abrir la página: ¿el servidor todavía tiene la sesión abierta? ----------
   Si no la tiene (se cerró o venció), se vuelve a la portada. Si no hay internet, se deja como está. */

(async function verificarSesion(){
  try{
    const r = await fetch("api/sesion.php", {credentials:"same-origin"});
    const d = await r.json();

    if(d && d.ok){
      currentUser = guardarUsuarioLocal(d.usuario);
      localStorage.setItem("ade_current_user", JSON.stringify(currentUser));
      await cargarUsuariosServidor();
      // Se refresca lo que ya se ve en pantalla (foto, tabla de usuarios…) con los datos del servidor
      if(typeof applyProfilePhoto === "function") applyProfilePhoto();
      if(typeof renderAdminUsers === "function") renderAdminUsers();
      const app = $("mainApp");
      if(app && app.style.display === "flex" && typeof render === "function") render();
    }else if(currentUser){
      logout();
    }
  }catch(e){}
})();