/* =========================================================
   VALIDACIÓN DE PROFESORES (SOLO ADMINISTRADOR)
   Qué hace: Agrega el botón "Validación" debajo de "Administración" en el menú lateral y una ventana para aprobar o rechazar profesores nuevos.
   Por qué: Los profesores que se registran no pueden entrar hasta que el administrador los apruebe; así nadie se hace pasar por profesor.
   Crea su propia ventana, no hace falta tocar el HTML.
   Cargar DESPUÉS de administracion.js y autenticacion.js:
   <script src="js/validacion.js"></script>
   ========================================================= */

(function(){

  /* ---------- Variable busy ----------
     Qué hace: Marca si ya se está guardando una decisión.
     Por qué: Evita que se apruebe o rechace dos veces por clics seguidos. */
  let busy = false;

  /* ---------- Nombres de los estados ----------
     Qué hace: Traduce el estado guardado (pendiente, rechazado) a la palabra que se muestra.
     Por qué: Para que en pantalla se lea bonito, con mayúscula. */
  const ESTADOS = {pendiente:"Pendiente", rechazado:"Rechazado"};

  /* ---------- ¿Es administrador? ----------
     Qué hace: Responde si la persona que inició sesión es admin.
     Por qué: Solo el administrador puede validar profesores; se revisa en varios lugares. */
  function esAdmin(){
    return typeof getRole === "function" && getRole() === "admin";
  }

  /* ---------- Limpiar textos (esc) ----------
     Qué hace: Convierte el texto para que no pueda meter código raro en la página.
     Por qué: Los datos vienen de lo que escribió cada persona al registrarse; limpiarlos protege la página. */
  function esc(t){
    return typeof escapeHtml === "function" ? escapeHtml(String(t == null ? "" : t)) : String(t == null ? "" : t);
  }

  /* ---------- Crear la ventana ----------
     Qué hace: Arma la ventana con la lista de profesores y los botones, solo si todavía no existe.
     Por qué: Se crea desde JavaScript para no tocar el index.html. */

  function asegurarVentana(){

    if(document.getElementById("validacionModal")) return;

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "validacionModal";
    modal.innerHTML = `
      <div class="modal-box" style="max-width:760px;width:94%">
        <div class="modal-head">
          <h2>Validación de profesores</h2>
          <button class="close" onclick="cerrarValidacion()">×</button>
        </div>
        <p style="opacity:.75;margin:0 0 12px">Los profesores que se registran no pueden entrar hasta que los apruebes.</p>
        <div id="validacionLista"></div>
        <p id="validacionMensaje" class="auth-message" style="min-height:18px"></p>
        <div class="actions">
          <button class="btn secondary" onclick="cerrarValidacion()">Cerrar</button>
        </div>
      </div>
    `;
    modal.addEventListener("click", e => { if(e.target === modal) cerrarValidacion(); });
    document.body.appendChild(modal);
  }

  /* ---------- Cerrar la ventana ----------
     Qué hace: Oculta la ventana de validación.
     Por qué: Se usa desde los botones "×" y "Cerrar" y al hacer clic afuera. */
  window.cerrarValidacion = function(){
    const m = document.getElementById("validacionModal");
    if(m) m.classList.remove("show");
  };

  /* ---------- Pedir la lista al servidor ----------
     Qué hace: Trae los profesores que están pendientes o rechazados.
     Por qué: La información real está en el servidor; aquí solo se consulta. */
  async function cargarLista(){
    const r = await apiPost("api/validacion.php", {accion:"listar"});
    if(!r.ok) return null;
    return r.profesores || [];
  }

  /* ---------- Dibujar la lista ----------
     Qué hace: Muestra una tarjeta por profesor con sus datos y los botones Aprobar y Rechazar.
     Por qué: Un rechazado solo puede aprobarse; uno pendiente puede aprobarse o rechazarse. */
  function pintar(lista){

    const cont = document.getElementById("validacionLista");
    if(!cont) return;

    if(!lista.length){
      cont.innerHTML = `<p style="padding:18px 4px;opacity:.8">No hay profesores esperando validación.</p>`;
      return;
    }

    cont.innerHTML = lista.map(p => `
      <div style="border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:12px;padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
          <strong>${esc(p.name)}</strong>
          <span style="font-size:12px;padding:2px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.25)">${ESTADOS[p.estado] || esc(p.estado)}</span>
        </div>
        <div style="font-size:13px;opacity:.85;margin-top:6px;line-height:1.6">
          Usuario: ${esc(p.username)} · Correo: ${esc(p.email)}<br>
          Materias: ${esc(p.subjects || "—")} · Grupos: ${esc(p.groups || "—")}<br>
          Se registró: ${esc(p.createdAt)}
        </div>
        <div class="actions" style="margin-top:10px">
          <button class="btn" onclick="decidirProfesor(${p.codigo}, 'aprobar')">Aprobar</button>
          ${p.estado === "pendiente" ? `<button class="btn secondary" onclick="decidirProfesor(${p.codigo}, 'rechazar')">Rechazar</button>` : ""}
        </div>
      </div>
    `).join("");
  }

  /* ---------- Numerito rojo del menú ----------
     Qué hace: Muestra en el botón del menú cuántos profesores esperan, y lo oculta si son cero.
     Por qué: Para que el admin vea de un vistazo que hay profesores por revisar. */
  function actualizarInsignia(n){
    const b = document.getElementById("navValidacionBadge");
    if(!b) return;
    b.textContent = n > 0 ? String(n) : "";
    b.style.display = n > 0 ? "" : "none";
  }

  /* ---------- Refrescar ----------
     Qué hace: Vuelve a pedir la lista, la dibuja y actualiza el numerito rojo.
     Por qué: Se usa después de cada cambio para que todo quede al día. */
  async function refrescar(){
    const lista = await cargarLista();
    if(lista === null) return;
    pintar(lista);
    actualizarInsignia(lista.filter(p => p.estado === "pendiente").length);
  }

  /* ---------- Abrir la ventana ----------
     Qué hace: Muestra la ventana con "Cargando…" y luego llena la lista.
     Por qué: Así la persona ve que algo está pasando mientras llegan los datos. */
  window.abrirValidacion = async function(){
    if(!esAdmin()) return;
    asegurarVentana();
    document.getElementById("validacionMensaje").textContent = "";
    document.getElementById("validacionLista").innerHTML = `<p style="padding:18px 4px;opacity:.8">Cargando…</p>`;
    document.getElementById("validacionModal").classList.add("show");
    await refrescar();
  };

  /* ---------- Aprobar o rechazar ----------
     Qué hace: Pide confirmación si es rechazar, manda la decisión al servidor y actualiza la lista y la tabla de usuarios.
     Por qué: Rechazar es una acción seria (el profesor no podrá entrar), por eso se pregunta antes. */
  window.decidirProfesor = async function(codigo, accion){

    if(!esAdmin() || busy) return;

    if(accion === "rechazar"){
      const ok = typeof adeConfirm === "function"
        ? await adeConfirm("El profesor no podrá entrar al sistema.", {title:"Rechazar profesor", ok:"Sí, rechazar", danger:true})
        : confirm("¿Rechazar a este profesor?");
      if(!ok) return;
    }

    busy = true;
    const r = await apiPost("api/validacion.php", {accion, codigo});
    busy = false;

    const msg = document.getElementById("validacionMensaje");
    if(!r.ok){
      if(msg) msg.textContent = r.error || "No se pudo guardar el cambio.";
      return;
    }
    if(msg) msg.textContent = accion === "aprobar" ? "Profesor aprobado." : "Profesor rechazado.";

    await refrescar();

    // La tabla de usuarios del admin muestra el estado actualizado
    if(typeof cargarUsuariosServidor === "function"){
      await cargarUsuariosServidor();
      if(typeof renderAdminUsers === "function") renderAdminUsers();
    }
  };

  /* ---------- Buscar el botón "Administración" ----------
     Qué hace: Recorre el menú buscando el elemento cuyo texto es exactamente "Administración".
     Por qué: Necesitamos saber dónde está para poner "Validación" justo debajo, sin editar el HTML. */

  // Busca el elemento más pequeño del menú cuyo texto sea exactamente "Administración"
  function buscarBotonAdministracion(){
    const candidatos = [...document.querySelectorAll("button, a, li, div, span")].filter(el => {
      if(el.id === "navValidacion") return false;
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      return t === "Administración";
    });
    if(!candidatos.length) return null;

    // el más profundo (la etiqueta) y luego se sube hasta el elemento que actúa como botón
    let el = candidatos[candidatos.length - 1];
    while(el.parentElement){
      const tag = el.tagName;
      const esBoton = tag === "BUTTON" || tag === "A" || tag === "LI" || el.hasAttribute("onclick") || el.hasAttribute("data-page");
      if(esBoton) break;
      el = el.parentElement;
    }
    return el;
  }

  /* ---------- Poner el botón "Validación" ----------
     Qué hace: Copia el botón de Administración, le cambia el texto a "Validación", le agrega el numerito rojo y lo coloca debajo.
     Por qué: Así se ve igual que los demás botones. Si el usuario no es admin, el botón se quita. */
  function insertarBoton(){

    if(!esAdmin()){
      const viejo = document.getElementById("navValidacion");
      if(viejo) viejo.remove();
      return;
    }
    if(document.getElementById("navValidacion")) return;

    const admin = buscarBotonAdministracion();
    if(!admin) return;

    const copia = admin.cloneNode(true);
    copia.id = "navValidacion";
    copia.classList.remove("active");
    copia.removeAttribute("onclick");
    copia.removeAttribute("data-page");
    copia.removeAttribute("href");

    // Cambia el texto "Administración" por "Validación"
    const walker = document.createTreeWalker(copia, NodeFilter.SHOW_TEXT);
    let nodo;
    while((nodo = walker.nextNode())){
      if(nodo.nodeValue.indexOf("Administración") !== -1){
        nodo.nodeValue = nodo.nodeValue.replace("Administración", "Validación");
        const insignia = document.createElement("span");
        insignia.id = "navValidacionBadge";
        insignia.style.cssText = "display:none;margin-left:8px;background:#e53935;color:#fff;border-radius:999px;font-size:11px;padding:1px 7px";
        nodo.parentNode.appendChild(insignia);
        break;
      }
    }

    copia.addEventListener("click", e => { e.preventDefault(); window.abrirValidacion(); });
    admin.parentNode.insertBefore(copia, admin.nextSibling);

    refrescar();   // pone el número de profesores pendientes
  }

  // El menú aparece después de iniciar sesión, así que se revisa cada 1,5 s (es una comprobación liviana, sin servidor)

  /* ---------- Revisar cada 1,5 segundos ----------
     Qué hace: Intenta poner el botón cada 1,5 segundos.
     Por qué: El menú aparece después de iniciar sesión y no sabemos justo cuándo; la revisión es liviana y no consulta al servidor. */
  setInterval(insertarBoton, 1500);
  document.addEventListener("DOMContentLoaded", insertarBoton);

})();