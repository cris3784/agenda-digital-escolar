/* =========================================================
   CAMBIAR MI CORREO (MI PERFIL)
   Qué hace: Agrega un botón "Cambiar" junto al correo en Mi perfil para que la persona pueda poner otro correo.
   Por qué: Así el cambio es seguro: se pide la contraseña y se manda un código al correo NUEVO; el correo solo cambia cuando se escribe ese código.
   Cargar DESPUÉS de perfil.js:
   <script src="js/correo_cambiar.js"></script>
   ========================================================= */

(function(){

  /* ---------- Variables del archivo ----------
     Qué hace: Guardan si hay un envío en curso (busy), en qué paso va la ventana (paso) y el correo/clave escritos (datos).
     Por qué: busy evita que se mande dos veces si se da clic seguido; datos sirve para poder "Reenviar código" sin pedir todo otra vez. */
  let busy = false;
  let paso = 1;
  let datos = {correo:"", clave:""};   // se guardan solo mientras la ventana está abierta (para "Reenviar código")

  /* ---------- Atajo $id ----------
     Qué hace: Es una forma corta de escribir document.getElementById.
     Por qué: Se usa muchas veces y así el código queda más corto y fácil de leer. */
  const $id = id => document.getElementById(id);

  /* ---------- Botón "Cambiar" junto al correo ----------
     Qué hace: Crea el botón "Cambiar" al lado del botón "Verificar" y lo oculta si el usuario es administrador.
     Por qué: El administrador no cambia su correo desde aquí, y se agrupan los dos botones para que la fila del perfil no se mueva. */

  function asegurarBoton(){

    const verificar = $id("pfVerifyBtn");
    if(!verificar) return;

    const esAdmin = typeof currentUser !== "undefined" && currentUser && currentUser.role === "admin";

    let cambiar = $id("pfChangeMailBtn");
    if(!cambiar){
      // Se agrupan los dos botones para no mover el resto de la fila
      const grupo = document.createElement("span");
      grupo.id = "pfMailBtns";
      grupo.style.cssText = "display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end";
      verificar.parentNode.insertBefore(grupo, verificar);

      cambiar = document.createElement("button");
      cambiar.type = "button";
      cambiar.id = "pfChangeMailBtn";
      cambiar.className = "pf-verify";
      cambiar.textContent = "Cambiar";
      cambiar.title = "Cambiar mi correo";
      cambiar.addEventListener("click", abrir);

      grupo.appendChild(cambiar);
      grupo.appendChild(verificar);       // el botón de verificar conserva su función
    }
    cambiar.style.display = esAdmin ? "none" : "";
  }

  // Cada vez que perfil.js actualiza el botón "Verificar", se revisa que "Cambiar" esté puesto

  /* ---------- Mantener el botón puesto ----------
     Qué hace: Cada vez que perfil.js actualiza el botón "Verificar", este código revisa que "Cambiar" siga en su lugar.
     Por qué: perfil.js redibuja el botón y podría borrar el nuestro; así siempre vuelve a aparecer. */
  const original = window.updateOwnEmailButton;
  if(typeof original === "function"){
    window.updateOwnEmailButton = function(){
      const r = original.apply(this, arguments);
      asegurarBoton();
      return r;
    };
  }
  document.addEventListener("DOMContentLoaded", asegurarBoton);

  /* ---------- Crear la ventana (modal) ----------
     Qué hace: Arma la ventana emergente con dos pasos: (1) escribir correo nuevo y contraseña, (2) escribir el código de 6 dígitos.
     Por qué: Se crea desde JavaScript para no tener que modificar el index.html. */

  function crearVentana(){

    if($id("mailChangeModal")) return;

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "mailChangeModal";
    modal.innerHTML = `
      <div class="modal-box pwd-modal">
        <div class="modal-head">
          <h3>Cambiar mi correo</h3>
          <button type="button" class="pwd-x" id="mcClose" aria-label="Cerrar">✕</button>
        </div>

        <div id="mcStep1">
          <p class="gd-info">Escribe tu correo nuevo y tu contraseña actual. Te mandaremos un código de 6 dígitos al correo nuevo para confirmar que es tuyo.</p>
          <div class="field">
            <label>Correo nuevo</label>
            <input id="mcMail" type="email" maxlength="120" placeholder="correo@gmail.com" autocomplete="off">
          </div>
          <div class="field">
            <label>Tu contraseña actual</label>
            <input id="mcPass" type="password" autocomplete="current-password">
          </div>
          <p class="pwd-msg" id="mcMsg1"></p>
          <button type="button" class="btn pwd-submit" id="mcSend">Enviar código</button>
        </div>

        <div id="mcStep2" style="display:none">
          <p class="gd-info">Enviamos un código de 6 dígitos a <b id="mcTarget"></b>. Escríbelo aquí para terminar el cambio. Hasta entonces sigues usando tu correo actual.</p>
          <div class="field">
            <label>Código de verificación</label>
            <input id="mcCode" class="gd-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
          </div>
          <p class="pwd-msg" id="mcMsg2"></p>
          <button type="button" class="btn pwd-submit" id="mcOk">Confirmar cambio</button>
          <p class="gd-links"><button type="button" id="mcResend">Reenviar código</button> · <button type="button" id="mcBack">Corregir el correo</button></p>
        </div>
      </div>`;
    document.body.appendChild(modal);

    /* ---------- Acciones de la ventana ----------
       Qué hace: Conecta los botones y teclas: cerrar con ✕, clic afuera o Escape; Enter para avanzar; el código solo acepta números.
       Por qué: Hace que la ventana sea cómoda de usar y evita que se escriban letras en el código. */
    $id("mcClose").addEventListener("click", cerrar);
    modal.addEventListener("click", e => { if(e.target === modal) cerrar(); });
    document.addEventListener("keydown", e => { if(e.key === "Escape") cerrar(); });

    $id("mcSend").addEventListener("click", enviar);
    $id("mcPass").addEventListener("keydown", e => { if(e.key === "Enter") enviar(); });
    $id("mcMail").addEventListener("keydown", e => { if(e.key === "Enter") $id("mcPass").focus(); });

    $id("mcOk").addEventListener("click", confirmar);
    $id("mcCode").addEventListener("keydown", e => { if(e.key === "Enter") confirmar(); });
    $id("mcCode").addEventListener("input", () => { $id("mcCode").value = $id("mcCode").value.replace(/\D/g, "").slice(0, 6); });
    $id("mcResend").addEventListener("click", () => enviar(true));
    $id("mcBack").addEventListener("click", () => mostrarPaso(1));
  }

  /* ---------- Mostrar mensajes ----------
     Qué hace: Escribe un texto de error (o de éxito) debajo del paso 1 o del paso 2.
     Por qué: Así la persona sabe qué falló sin salirse de la ventana. */
  function mensaje(n, texto, ok){
    const m = $id("mcMsg" + n);
    if(!m) return;
    m.textContent = texto || "";
    m.classList.toggle("ok", !!ok);
  }

  /* ---------- Cambiar de paso ----------
     Qué hace: Muestra el paso 1 o el paso 2, limpia los mensajes y pone el cursor en el campo correcto.
     Por qué: Es una sola ventana con dos pantallas, y esto decide cuál se ve. */
  function mostrarPaso(n){
    paso = n;
    $id("mcStep1").style.display = n === 1 ? "" : "none";
    $id("mcStep2").style.display = n === 2 ? "" : "none";
    mensaje(1, ""); mensaje(2, "");
    setTimeout(() => { const el = $id(n === 1 ? "mcMail" : "mcCode"); if(el) el.focus(); }, 50);
  }

  /* ---------- Abrir la ventana ----------
     Qué hace: Limpia los campos y muestra la ventana en el paso 1.
     Por qué: Así no quedan datos viejos de una vez anterior. No abre si es administrador. */
  function abrir(){
    if(typeof currentUser === "undefined" || !currentUser || currentUser.role === "admin") return;
    crearVentana();
    datos = {correo:"", clave:""};
    $id("mcMail").value = "";
    $id("mcPass").value = "";
    $id("mcCode").value = "";
    mostrarPaso(1);
    $id("mailChangeModal").classList.add("show");
  }

  /* ---------- Cerrar la ventana ----------
     Qué hace: Oculta la ventana y borra el correo y la contraseña guardados.
     Por qué: Por seguridad la contraseña no debe quedarse guardada en memoria. */
  function cerrar(){
    const m = $id("mailChangeModal");
    if(m) m.classList.remove("show");
    datos = {correo:"", clave:""};      // no se guarda la contraseña
    if($id("mcPass")) $id("mcPass").value = "";
  }

  /* ---------- Paso 1: enviar el código ----------
     Qué hace: Revisa que el correo sea válido, que haya contraseña y que no sea el mismo correo actual; luego le pide al servidor que mande el código.
     Por qué: Se valida antes en el navegador para no gastar envíos de correo en datos mal escritos. También sirve para "Reenviar código". */

  async function enviar(esReenvio){

    if(busy) return;

    let correo, clave;
    if(esReenvio === true){
      correo = datos.correo; clave = datos.clave;
    }else{
      correo = $id("mcMail").value.trim();
      clave = $id("mcPass").value;
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return mensaje(1, "Escribe un correo válido (ej. nombre@gmail.com).");
      if(!clave) return mensaje(1, "Escribe tu contraseña actual.");
      if(currentUser && String(currentUser.email || "").toLowerCase() === correo.toLowerCase()) return mensaje(1, "Ese ya es tu correo actual.");
    }

    busy = true;
    const btn = $id("mcSend");
    if(btn){ btn.disabled = true; btn.textContent = "Enviando…"; }

    const r = await apiPost("api/correo_cambiar.php", {paso:"enviar", correo, clave});

    busy = false;
    if(btn){ btn.disabled = false; btn.textContent = "Enviar código"; }

    if(!r.ok) return mensaje(esReenvio === true ? 2 : 1, r.error || "No se pudo enviar el código.");

    datos = {correo, clave};
    $id("mcTarget").textContent = correo;
    $id("mcCode").value = "";
    mostrarPaso(2);
    if(esReenvio === true) mensaje(2, "Te enviamos un código nuevo.", true);
  }

  /* ---------- Paso 2: confirmar el código ----------
     Qué hace: Manda el código al servidor; si es correcto, actualiza el correo en pantalla, cierra la ventana y muestra un aviso.
     Por qué: El correo solo cambia cuando se demuestra que el correo nuevo es de la persona (porque le llegó el código). */
  async function confirmar(){

    if(busy) return;

    const code = $id("mcCode").value.trim();
    if(!/^\d{6}$/.test(code)) return mensaje(2, "Escribe los 6 dígitos del código.");

    busy = true;
    const r = await apiPost("api/correo_cambiar.php", {paso:"verificar", codigo:code});
    busy = false;

    if(!r.ok) return mensaje(2, r.error || "No se pudo confirmar el código.");

    // Se actualiza la cuenta en pantalla con lo que devolvió el servidor

    /* ---------- Actualizar lo que se ve ----------
       Qué hace: Guarda la cuenta que devolvió el servidor y cambia el correo mostrado en el perfil.
       Por qué: Así la pantalla muestra el correo nuevo sin tener que recargar la página. */
    if(typeof guardarCuentaDevuelta === "function") guardarCuentaDevuelta(r.usuario);

    const pf = $id("pfEmail");
    if(pf && r.usuario) pf.textContent = r.usuario.email || "";
    try{ mailPendingAt = 0; }catch(e){}
    if(typeof updateOwnEmailButton === "function") updateOwnEmailButton();

    cerrar();
    if(typeof showToast === "function") showToast("Correo cambiado", "Tu correo nuevo quedó verificado.", "ok", 4000);
  }

})();