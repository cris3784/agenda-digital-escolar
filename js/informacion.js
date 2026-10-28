/* =========================================================
   INFORMACIÓN DE LA PÁGINA PÚBLICA
   Qué hace: Maneja los botones de la izquierda de la página de inicio (Manual ADE, Soporte en línea, Nuestros programas, Biblioteca digital, Correo escolar y Guía ADE). Cada uno abre una ventana con información sacada de la propia aplicación.
   Por qué: Así quien aún no inicia sesión puede conocer la agenda y recibir ayuda, y la información siempre está al día porque sale de los datos reales (cargos, materias, archivos de actividades, etc.).
   Ajustes rápidos:
   - CORREO_URL     → a dónde lleva "Abrir mi correo".
   - CORREO_SOPORTE → correo al que escribe "Escribir al administrador"; si se deja vacío usa el correo de la cuenta admin.
   ========================================================= */

/* ---------- Envoltura del archivo ----------
   Qué hace: Encierra todo el código en una función que se ejecuta sola.
   Por qué: Así sus variables no se mezclan con las de otros archivos. Solo se comparten abrirInfo y cerrarInfo al final. */
(function(){

  /* ---------- Direcciones de correo ----------
     Qué hace: Guardan a dónde lleva "Abrir mi correo", el correo de soporte y un correo de respaldo.
     Por qué: Son los datos que más se cambian; están juntos arriba para encontrarlos fácil. */
  const CORREO_URL = "https://mail.google.com";
  const CORREO_SOPORTE = "";
  const CORREO_RESPALDO = "admin@gmail.com";

  /* ---------- Limpiar texto ----------
     Qué hace: Cambia símbolos especiales por versiones seguras.
     Por qué: Para que lo escrito no dañe la página. */
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));


  /* ---------- Iconos ----------
     Qué hace: Cada icono es un dibujo SVG que toma el color del texto. Para cambiar uno se edita ICONOS.
     Por qué: Se ven más ordenados y limpios que los emojis, y se ven igual en todos los equipos. */
  const ICONOS = {
    manual:       '<path d="M12 6.8C10 5.2 7.3 4.6 3.8 4.8v13.4c3.5-.2 6.2.4 8.2 2 2-1.6 4.7-2.2 8.2-2V4.8c-3.5-.2-6.2.4-8.2 2z"/><path d="M12 6.8v13.4"/><path d="M6.5 9.4h2.6M6.5 12.4h2.6M14.9 9.4h2.6M14.9 12.4h2.6"/>',
    soporte:      '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.8 12.5a9.5 9.5 0 0 1 12.4 0"/><path d="M9 15.8a5 5 0 0 1 6 0"/><path d="M12 19.3h.01" stroke-width="3.2"/>',
    programas:    '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><circle cx="16.5" cy="16.5" r="3.6"/>',
    biblioteca:   '<path d="M12 6.8C10 5.2 7.3 4.6 3.8 4.8v13.4c3.5-.2 6.2.4 8.2 2 2-1.6 4.7-2.2 8.2-2V4.8c-3.5-.2-6.2.4-8.2 2z"/><path d="M12 6.8v13.4"/>',
    correo:       '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.2 8.5 6.3 8.5-6.3"/>',
    guia:         '<path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',
    organizacion: '<circle cx="12" cy="7.6" r="3.2"/><circle cx="5.2" cy="10" r="2.4"/><circle cx="18.8" cy="10" r="2.4"/><path d="M6.6 19.5c.4-3 2.5-5 5.4-5s5 2 5.4 5z"/><path d="M1.8 18c.2-2.2 1.6-3.8 3.6-4.2M22.2 18c-.2-2.2-1.6-3.8-3.6-4.2"/>',
    materias:     '<path d="M12 6.8C10 5.2 7.3 4.6 3.8 4.8v13.4c3.5-.2 6.2.4 8.2 2 2-1.6 4.7-2.2 8.2-2V4.8c-3.5-.2-6.2.4-8.2 2z"/><path d="M12 6.8v13.4"/><path d="M6.5 9.4h2.6M6.5 12.4h2.6M14.9 9.4h2.6M14.9 12.4h2.6"/>',
    actividades:  '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4h6v3H9z"/><path d="m8.4 12 1 1 2-2M13.6 12.3H16M8.4 17l1 1 2-2M13.6 17.3H16"/>',
    horario:      '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 13.6h.01M12 13.6h.01M16 13.6h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="2.4"/>',
    calendario:   '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
    inicio:       '<path d="M3 11 12 3.5 21 11"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    perfil:       '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    admin:        '<path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6z"/><path d="m9 12 2.2 2.2L15 10"/>',
    clip:         '<path d="m20 11.5-8 8a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 17.5a2 2 0 0 1-3-3l7.5-7.5"/>',
    ir:           '<path d="m9 6 6 6-6 6"/>'
  };

  /* ---------- Dibujar un icono ----------
     Qué hace: Devuelve el icono listo para poner en el HTML, en tamaño normal, mediano o grande.
     Por qué: Atajo para no repetir el código del dibujo. */
  // Devuelve el icono listo para poner en el HTML. size: "" | "md" | "lg"
  function ico(nombre, size){
    return '<i class="ld-ico' + (size ? " " + size : "") + '" aria-hidden="true"><svg viewBox="0 0 24 24">' +
      (ICONOS[nombre] || ICONOS.manual) + '</svg></i>';
  }

  /* ---------- Estilos de las ventanas ----------
     Qué hace: Texto con los estilos (colores, tamaños y formas) de las ventanas de información.
     Por qué: Se agregan desde aquí para no tocar el archivo de estilos. */
  const css = `
    .ade-info{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;
      padding:18px;background:rgba(4,9,20,.78);backdrop-filter:blur(3px)}
    .ade-info.open{display:flex;animation:aiFade .2s ease}
    @keyframes aiFade{from{opacity:0}to{opacity:1}}
    @keyframes aiPop{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}

    .ade-info-box{width:min(760px,100%);max-height:min(86vh,820px);display:flex;flex-direction:column;
      background:#0f1830;color:#e8eef9;border:1px solid rgba(255,255,255,.09);border-radius:16px;
      box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;text-align:left;
      font:14.5px/1.55 Arimo,Arial,Helvetica,sans-serif;
      animation:aiPop .28s cubic-bezier(.2,.9,.3,1.1)}
    .ade-info-head{display:flex;align-items:center;gap:12px;padding:15px 20px;background:#0b1326;
      border-bottom:3px solid #25a05d}
    .ade-info-ico{width:40px;height:40px;flex:none;border-radius:12px;display:grid;place-items:center;color:#fff;
      background:linear-gradient(150deg,#2fb86d,#1b7d48);box-shadow:0 4px 12px rgba(37,160,93,.35)}
    .ade-info-ico .ld-ico{width:22px;height:22px;vertical-align:baseline}

    /* Iconos que reemplazan a los emojis */
    .ld-ico{display:inline-grid;place-items:center;width:1.15em;height:1.15em;vertical-align:-.2em;flex:none}
    .ld-ico svg{width:100%;height:100%;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .ld-ico.md{width:20px;height:20px;vertical-align:middle}
    .ld-ico.lg{width:28px;height:28px;vertical-align:middle;color:#fff}
    .ld-ico.inl{margin-right:.55em}
    .ld-holder{display:inline-grid !important;place-items:center}
    .ai-file > span{display:inline-flex;align-items:center;color:#6fe3a1}
    .ade-info summary .ld-ico{margin-right:.45em;color:#6fe3a1}
    .ai-btn .ld-ico{margin-right:.45em}
    .ade-info-head h2{margin:0;flex:1;font-size:20px;line-height:1.2;color:#fff}
    .ade-info-x{width:36px;height:36px;padding:0;margin:0;border:0;border-radius:50%;cursor:pointer;
      background:rgba(255,255,255,.08);color:#fff;font-size:22px;line-height:1}
    .ade-info-x:hover{background:rgba(255,255,255,.18)}
    .ade-info-x:focus-visible,.ai-btn:focus-visible,.ade-info summary:focus-visible,.ai-tab:focus-visible{
      outline:2px solid #6fe3a1;outline-offset:2px}
    .ade-info-body{padding:18px 20px 22px;overflow:auto}
    .ade-info-body p{margin:0 0 12px}
    .ade-info-body h3{margin:18px 0 8px;font-size:15px;color:#6fe3a1}
    .ade-info-body a{color:#6fe3a1}
    .ade-info-body small,.ai-muted{color:#9aa7c0}

    .ai-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
    .ai-btn{width:auto;margin:0;padding:9px 16px;border-radius:9px;border:1px solid #25a05d;background:#25a05d;
      color:#fff;font:600 13.5px Arimo,Arial,Helvetica,sans-serif;cursor:pointer;
      text-decoration:none;display:inline-block}
    .ai-btn:hover{background:#2cb86c}
    .ai-btn.alt{background:transparent;color:#cfe9da}
    .ai-btn.alt:hover{background:rgba(37,160,93,.16)}

    .ade-info details{border:1px solid rgba(255,255,255,.09);border-radius:11px;margin:0 0 9px;background:#121d38}
    .ade-info summary{cursor:pointer;padding:11px 14px;font-weight:600;list-style:none;display:flex;gap:10px;
      align-items:center;justify-content:space-between}
    .ade-info summary::-webkit-details-marker{display:none}
    .ade-info summary::after{content:"+";font-size:18px;color:#6fe3a1;flex:none}
    .ade-info details[open] summary::after{content:"–"}
    .ade-info details[open] summary{border-bottom:1px solid rgba(255,255,255,.07)}
    .ai-acc-b{padding:11px 14px 13px}
    .ai-acc-b p:last-child,.ai-acc-b ul:last-child{margin-bottom:0}
    .ade-info ul{margin:0 0 10px;padding-left:20px}
    .ade-info li{margin:3px 0}

    .ai-scroll{overflow-x:auto;margin:6px 0 4px}
    .ai-table{width:100%;border-collapse:collapse;font-size:13px;min-width:520px}
    .ai-table th,.ai-table td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:center}
    .ai-table th:first-child,.ai-table td:first-child{text-align:left}
    .ai-table th{color:#6fe3a1;font-weight:600}

    .ai-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:4px 0 6px}
    .ai-stat{background:#121d38;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:12px;text-align:center}
    .ai-stat b{display:block;font-size:26px;color:#6fe3a1;line-height:1.1}
    .ai-stat span{font-size:12px;color:#9aa7c0}
    .ai-chips{display:flex;flex-wrap:wrap;gap:8px}
    .ai-chip{padding:6px 12px;border-radius:999px;background:rgba(37,160,93,.16);border:1px solid rgba(37,160,93,.45);
      font-size:13px}

    .ai-tools{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
    .ai-tools input,.ai-tools select{flex:1 1 180px;min-width:0;margin:0;padding:9px 11px;border-radius:9px;
      border:1px solid rgba(255,255,255,.15);background:#0b1326;color:#e8eef9;font:14px Arimo,Arial,Helvetica,sans-serif}
    .ai-files{list-style:none;margin:0;padding:0}
    .ai-file{display:flex;gap:12px;align-items:center;padding:10px 12px;margin:0 0 8px;background:#121d38;
      border:1px solid rgba(255,255,255,.09);border-radius:11px}
    .ai-file>span{font-size:22px}
    .ai-file div{min-width:0}
    .ai-file a{font-weight:600;word-break:break-word}
    .ai-file small{display:block}
    .ai-empty{padding:22px 14px;text-align:center;border:1px dashed rgba(255,255,255,.18);border-radius:12px;color:#9aa7c0}

    .ai-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
    .ai-tab{width:auto;margin:0;padding:8px 15px;border-radius:999px;border:1px solid rgba(255,255,255,.18);
      background:transparent;color:#cfd8ea;font:600 13px Arimo,Arial,Helvetica,sans-serif;cursor:pointer}
    .ai-tab[aria-selected="true"]{background:#25a05d;border-color:#25a05d;color:#fff}
    .ai-steps{list-style:none;margin:0;padding:0;counter-reset:paso}
    .ai-steps li{counter-increment:paso;position:relative;margin:0 0 10px;padding:10px 12px 10px 52px;
      background:#121d38;border:1px solid rgba(255,255,255,.09);border-radius:11px}
    .ai-steps li::before{content:counter(paso);position:absolute;left:12px;top:50%;transform:translateY(-50%);
      width:28px;height:28px;border-radius:50%;background:#25a05d;color:#fff;font-weight:700;
      display:flex;align-items:center;justify-content:center}

    @media(max-width:560px){
      .ai-stats{grid-template-columns:1fr}
      .ade-info{padding:10px}
    }
    @media(prefers-reduced-motion:reduce){
      .ade-info.open,.ade-info-box{animation:none}
    }
  `;

  /* ---------- Datos que vienen de la aplicación ----------
     Qué hace: Funciones que consultan la lista de materias, el correo de soporte y el tamaño de los archivos.
     Por qué: Así el contenido de las ventanas siempre usa información real. */

  function listaMaterias(){
    return (typeof subjects !== "undefined" && Array.isArray(subjects)) ? subjects : [];
  }

  /* ---------- Correo de soporte ----------
     Qué hace: Devuelve el correo de soporte; si no hay uno, usa el del administrador o el de respaldo.
     Por qué: Para que "Escribir al administrador" siempre tenga a dónde ir. */
  function correoSoporte(){
    if(CORREO_SOPORTE) return CORREO_SOPORTE;
    try{
      const admin = (typeof users !== "undefined" ? users : []).find(u => u && u.role === "admin" && u.email);
      if(admin) return admin.email;
    }catch(e){}
    return CORREO_RESPALDO;
  }

  /* ---------- Enlace para escribir ----------
     Qué hace: Arma el enlace que abre el programa de correo con el mensaje listo.
     Por qué: Para escribir con un solo clic. */
  function mailtoSoporte(){
    return "mailto:" + encodeURIComponent(correoSoporte()).replace(/%40/g,"@") +
      "?subject=" + encodeURIComponent("Soporte A.D.E.") +
      "&body=" + encodeURIComponent("Hola, necesito ayuda con la Agenda Digital Escolar.\n\nMi usuario: \nMi problema: \n");
  }

  /* ---------- Tamaño legible ----------
     Qué hace: Convierte bytes en texto como "2 MB".
     Por qué: Es más fácil de leer que un número largo. */
  function tamano(bytes){
    if(!bytes && bytes !== 0) return "";
    if(bytes < 1024) return bytes + " B";
    if(bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  /* ---------- Sección desplegable ----------
     Qué hace: Arma una sección que se abre y se cierra (acordeón).
     Por qué: Para que las ventanas largas se lean ordenadas. */
  function acc(titulo, html, abierto){
    return '<details' + (abierto ? ' open' : '') + '><summary>' + titulo + '</summary><div class="ai-acc-b">' + html + '</div></details>';
  }

  /* ---------- Botones frecuentes ----------
     Qué hace: Botones listos de Iniciar sesión, Crear cuenta y Recuperar contraseña.
     Por qué: Se usan en varias ventanas; así no se repiten. */
  const BTN_LOGIN    = '<button class="ai-btn" data-act="login">Iniciar sesión</button>';
  const BTN_REGISTER = '<button class="ai-btn alt" data-act="register">Crear una cuenta</button>';
  const BTN_FORGOT   = '<button class="ai-btn alt" data-act="forgot">Recuperar mi contraseña</button>';


  /* ---------- Contenido de cada botón ----------
     Qué hace: Aquí está el texto de cada ventana: Manual, Soporte, Programas, Biblioteca, Correo y Guía.
     Por qué: Si se quiere cambiar lo que dice una ventana, se edita aquí. */

  const VISTAS = {

    /* ===== Manual ADE ===== */
    manual: {
      icono: "manual", titulo: "Manual ADE",
      html: () => `
        <p>La <b>Agenda Digital Escolar (A.D.E.)</b> reúne en un solo lugar tus actividades, materias, horario y calendario.
        Esto es lo que encuentras en cada sección.</p>
        ${acc(ico("inicio") + "Inicio", `<p>Resumen de tu día: cuántas actividades tienes pendientes y completadas, las próximas actividades y algunas materias.</p>`, true)}
        ${acc(ico("actividades") + "Actividades", `
          <ul>
            <li>Cada actividad muestra título, materia, fecha de entrega, descripción y archivo adjunto (si lo hay).</li>
            <li><b>Estudiantes:</b> pulsan <i>Entregar trabajo</i> y suben su archivo (cualquier tipo, hasta 10 MB). Pueden cambiarlo cuando quieran.</li>
            <li><b>Profesores y administrador:</b> crean, editan y borran actividades, adjuntan archivos (hasta 5 MB) y ven cuántas entregas han recibido.</li>
          </ul>`)}
        ${acc(ico("materias") + "Materias", `<p>Lista de las materias del colegio. Solo el administrador puede agregar, renombrar o borrar materias.</p>`)}
        ${acc(ico("horario") + "Horario", `<p>Horario semanal por días y horas. Las clases se dibujan según su hora real y el descanso aparece como una franja. Solo el administrador lo edita.</p>`)}
        ${acc(ico("calendario") + "Calendario", `<p>Haz clic en un día para ver sus eventos a la derecha (paros, izadas de bandera, reuniones, entregas…). El administrador puede añadir, editar y borrar eventos.</p>`)}
        ${acc(ico("perfil") + "Mi perfil", `<p>Muestra tu nombre, usuario, grado y cargo. Los profesores ven además la materia que dictan.</p>`)}
        ${acc(ico("admin") + "Administración (solo administrador)", `<p>Tabla con todas las cuentas. Permite editar nombre, usuario, correo, cargo, materia (profesores), grado y contraseña, o eliminar cuentas. La cuenta de administrador está protegida.</p>`)}
        <h3>¿Qué puede hacer cada cargo?</h3>
        <div class="ai-scroll"><table class="ai-table">
          <tr><th>Acción</th><th>Estudiante</th><th>Profesor</th><th>Admin</th></tr>
          <tr><td>Ver Inicio, Actividades, Materias, Horario y Calendario</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Entregar trabajos</td><td>✓</td><td>—</td><td>—</td></tr>
          <tr><td>Crear, editar y borrar actividades</td><td>—</td><td>✓</td><td>✓</td></tr>
          <tr><td>Editar su perfil</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Gestionar materias, horario y calendario</td><td>—</td><td>—</td><td>✓</td></tr>
          <tr><td>Administrar usuarios</td><td>—</td><td>—</td><td>✓</td></tr>
        </table></div>
        <div class="ai-actions">${BTN_LOGIN}${BTN_REGISTER}</div>`
    },

    /* ===== Soporte en línea ===== */
    soporte: {
      icono: "soporte", titulo: "Soporte en línea",
      html: () => `
        <p>Respuestas rápidas a los problemas más comunes. Si no encuentras la tuya, escríbele al administrador.</p>
        ${acc("No puedo iniciar sesión", `<p>Revisa que el usuario esté bien escrito (no importan las mayúsculas) y que la contraseña sea exacta: ahí sí cuentan mayúsculas y minúsculas. Si no la recuerdas, recupérala.</p>`, true)}
        ${acc("Olvidé mi contraseña", `<p>Pulsa <i>¿Olvidaste tu contraseña?</i>, escribe tu usuario y el correo con el que te registraste y elige una contraseña nueva. La cuenta de administrador no se recupera desde ahí.</p>`)}
        ${acc("Dice que mi usuario o correo ya existe", `<p>Cada usuario y cada correo solo pueden usarse en una cuenta. Prueba con otro nombre de usuario o inicia sesión si ya te registraste.</p>`)}
        ${acc("No puedo subir un archivo", `<p>Las entregas de los estudiantes pueden pesar hasta 10 MB y los archivos que adjunta un profesor, hasta 5 MB. Si tu archivo es más grande, comprímelo o divídelo.</p>`)}
        ${acc("No veo el botón para crear actividades o la sección Administración", `<p>Cada cargo tiene permisos distintos: las actividades las crean profesores y administrador, y Administración es solo para el administrador.</p>`)}
        ${acc("Necesito cambiar mi grado, mi cargo o mi materia", `<p>Esos datos los cambia el administrador desde <i>Administración → Editar</i>.</p>`)}
        ${acc("No veo lo último que se publicó", `<p>Los datos están guardados en el servidor y se ven igual desde cualquier equipo. Si no aparece algo nuevo, recarga la página (F5) o revisa tu conexión a internet.</p>`)}
        <div class="ai-actions">
          <a class="ai-btn" href="${esc(mailtoSoporte())}">${ico("correo")}Escribir al administrador</a>
          ${BTN_FORGOT}${BTN_LOGIN}
        </div>`
    },

    /* ===== Nuestros programas ===== */
    programas: {
      icono: "programas", titulo: "Nuestros programas",
      html: () => {
        const materias = listaMaterias();
        return `
        <p>Lo que cubre la Agenda Digital Escolar para los estudiantes del colegio.</p>
        <div class="ai-stats">
          <div class="ai-stat"><b>${materias.length}</b><span>materias</span></div>
          <div class="ai-stat"><b>6° a 11°</b><span>grados</span></div>
          <div class="ai-stat"><b>54</b><span>grupos (6-1 hasta 11-9)</span></div>
        </div>
        <h3>Materias</h3>
        ${materias.length
          ? '<div class="ai-chips">' + materias.map(m => '<span class="ai-chip">' + esc(m) + '</span>').join("") + '</div>'
          : '<div class="ai-empty">Todavía no hay materias registradas.</div>'}
        <h3>Herramientas para organizarte</h3>
        <ul>
          <li><b>Organización:</b> un Inicio con lo pendiente y lo ya completado.</li>
          <li><b>Actividades:</b> tareas por materia con fecha de entrega, archivos y entrega de trabajos.</li>
          <li><b>Horario:</b> las clases de la semana con su hora y salón.</li>
          <li><b>Calendario:</b> eventos y fechas importantes del colegio.</li>
        </ul>
        <div class="ai-actions">${BTN_REGISTER}${BTN_LOGIN}</div>`;
      }
    },

    /* ===== Biblioteca digital ===== */
    biblioteca: {
      icono: "biblioteca", titulo: "Biblioteca digital",
      html: () => `
        <p>Aquí están los archivos que los profesores adjuntan a las actividades (guías, talleres, lecturas…). Búscalos y descárgalos.</p>
        <div class="ai-tools">
          <input id="aiLibBuscar" type="search" placeholder="Buscar por nombre, actividad o materia" aria-label="Buscar archivos">
          <select id="aiLibMateria" aria-label="Filtrar por materia"></select>
        </div>
        <ul class="ai-files" id="aiLibLista"></ul>
        <p class="ai-muted" style="margin-top:12px"><small>Las entregas de los estudiantes no aparecen aquí.</small></p>`,
      despues: cuerpo => {
        const todos = [];
        try{
          (typeof activities !== "undefined" ? activities : []).forEach(a => {
            if(a && a.attachment && a.attachment.data){
              todos.push({
                nombre: a.attachment.name || "Archivo",
                data: a.attachment.data,
                size: a.attachment.size,
                materia: a.subject || "",
                actividad: a.title || ""
              });
            }
          });
        }catch(e){}

        const buscar = cuerpo.querySelector("#aiLibBuscar");
        const sel = cuerpo.querySelector("#aiLibMateria");
        const lista = cuerpo.querySelector("#aiLibLista");

        const materias = [...new Set(todos.map(f => f.materia).filter(Boolean))].sort();
        sel.innerHTML = '<option value="">Todas las materias</option>' +
          materias.map(m => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join("");

        function pintar(){
          const q = buscar.value.trim().toLowerCase();
          const m = sel.value;
          const vistos = todos.filter(f =>
            (!m || f.materia === m) &&
            (!q || (f.nombre + " " + f.actividad + " " + f.materia).toLowerCase().indexOf(q) !== -1));

          if(!todos.length){
            lista.innerHTML = '<li class="ai-empty">Aún no hay archivos. Aparecerán cuando un profesor adjunte uno al crear una actividad.</li>';
          }else if(!vistos.length){
            lista.innerHTML = '<li class="ai-empty">No hay archivos que coincidan con tu búsqueda.</li>';
          }else{
            lista.innerHTML = vistos.map(f => `
              <li class="ai-file"><span>${ico("clip")}</span><div>
                <a href="${esc(f.data)}" download="${esc(f.nombre)}">${esc(f.nombre)}</a>
                <small>${esc(f.materia)}${f.actividad ? " · " + esc(f.actividad) : ""}${f.size ? " · " + tamano(f.size) : ""}</small>
              </div></li>`).join("");
          }
        }
        buscar.addEventListener("input", pintar);
        sel.addEventListener("change", pintar);
        pintar();
      }
    },

    /* ===== Correo escolar ===== */
    correo: {
      icono: "correo", titulo: "Correo escolar",
      html: () => `
        <p>Cada cuenta de la A.D.E. tiene un <b>correo electrónico</b> que registraste al crearla.</p>
        <h3>Para qué sirve</h3>
        <ul>
          <li>Recuperar tu contraseña: la A.D.E. te envía un código de 6 dígitos y con él eliges una nueva.</li>
          <li>Verificar que el correo es tuyo (botón <i>Verificar</i> en Mi perfil).</li>
          <li>Que el administrador pueda identificar tu cuenta.</li>
        </ul>
        <p>Los correos de la A.D.E. solo traen códigos de verificación. Para escribirle al
        administrador o a un profesor usa tu propio correo.</p>
        <div class="ai-actions">
          <a class="ai-btn" href="${esc(CORREO_URL)}" target="_blank" rel="noopener noreferrer">Abrir mi correo</a>
          <a class="ai-btn alt" href="${esc(mailtoSoporte())}">Escribir al administrador</a>
          ${BTN_FORGOT}
        </div>
        <p class="ai-muted" style="margin-top:14px"><small>¿Te equivocaste de correo al registrarte? El administrador puede corregirlo en Administración → Editar.</small></p>`
    },

    /* ===== Guía ADE ===== */
    guia: {
      icono: "guia", titulo: "Guía ADE",
      html: () => `
        <p>Paso a paso para empezar según tu cargo.</p>
        <div class="ai-tabs" role="tablist">
          <button class="ai-tab" role="tab" data-tab="estudiante" aria-selected="true">Estudiante</button>
          <button class="ai-tab" role="tab" data-tab="profesor" aria-selected="false">Profesor</button>
          <button class="ai-tab" role="tab" data-tab="admin" aria-selected="false">Administrador</button>
        </div>
        <ol class="ai-steps" id="aiGuiaPasos"></ol>
        <div class="ai-actions">${BTN_REGISTER}${BTN_LOGIN}</div>`,
      despues: cuerpo => {
        const PASOS = {
          estudiante: [
            "<b>Crea tu cuenta.</b> Pulsa <i>Registrarse</i>, elige el cargo <i>Estudiante</i> y completa nombre, usuario, correo, grado y contraseña.",
            "<b>Inicia sesión</b> con tu usuario y contraseña.",
            "<b>Mira el Inicio</b> para ver cuántas actividades tienes pendientes y cuáles ya completaste.",
            "<b>Entra a Actividades</b> y pulsa <i>Entregar trabajo</i> para subir tu archivo (hasta 10 MB). Puedes cambiarlo después.",
            "<b>Consulta el Horario y el Calendario</b> para saber tus clases y las fechas importantes.",
            "<b>Revisa Mi perfil</b> para confirmar que tu nombre y tu grado están bien."
          ],
          profesor: [
            "<b>Crea tu cuenta</b> con el cargo <i>Profesor</i> y elige la materia que dictas.",
            "<b>Inicia sesión.</b> Tu materia aparece en Mi perfil.",
            "<b>Ve a Actividades → Nueva actividad.</b> Escribe título, materia, fecha de entrega y descripción; si quieres, adjunta un archivo (hasta 5 MB).",
            "<b>Revisa las entregas.</b> Cada actividad muestra cuántos trabajos has recibido.",
            "<b>Edita, borra o marca como completada</b> una actividad con los botones de su tarjeta.",
            "<b>Consulta el Horario y el Calendario</b> para organizar tus clases."
          ],
          admin: [
            "<b>Inicia sesión</b> con la cuenta de administrador.",
            "<b>Abre Administración</b> para ver todas las cuentas. Con <i>Editar</i> cambias nombre, usuario, correo, cargo, materia, grado o contraseña.",
            "<b>Entra a Materias</b> para agregar, renombrar o borrar materias.",
            "<b>Arma el Horario:</b> agrega días y clases con su materia, hora y salón.",
            "<b>Llena el Calendario:</b> haz clic en un día y añade el evento con título y descripción.",
            "<b>Supervisa las Actividades</b> de los profesores: puedes crear, editar y borrar."
          ]
        };
        const lista = cuerpo.querySelector("#aiGuiaPasos");
        const tabs = cuerpo.querySelectorAll(".ai-tab");
        function mostrar(clave){
          lista.innerHTML = PASOS[clave].map(p => "<li>" + p + "</li>").join("");
          tabs.forEach(t => t.setAttribute("aria-selected", t.dataset.tab === clave ? "true" : "false"));
        }
        tabs.forEach(t => t.addEventListener("click", () => mostrar(t.dataset.tab)));
        mostrar("estudiante");
      }
    }
  };


  /* ---------- La ventana ----------
     Qué hace: Crea la ventana de información, la abre con el contenido elegido y la cierra.
     Por qué: Es una sola ventana que cambia de contenido según el botón. */

  /* ---------- Variables de la ventana ----------
     Qué hace: Guardan la ventana, su cuerpo y el botón que la abrió.
     Por qué: Para devolver el cursor al botón al cerrar y que se pueda usar con teclado. */
  let ventana = null;
  let cuerpoEl = null;
  let abridor = null;

  /* ---------- Crear la ventana ----------
     Qué hace: Arma la ventana y conecta sus botones, el cierre con Escape y el clic afuera.
     Por qué: Se crea solo una vez y se reutiliza. */
  function crearVentana(){
    if(ventana) return;

    const style = document.createElement("style");
    style.id = "adeInfoStyle";
    style.textContent = css;
    document.head.appendChild(style);

    ventana = document.createElement("div");
    ventana.className = "ade-info";
    ventana.id = "adeInfo";
    ventana.innerHTML = `
      <div class="ade-info-box" role="dialog" aria-modal="true" aria-labelledby="adeInfoTitulo">
        <div class="ade-info-head">
          <span class="ade-info-ico" id="adeInfoIcono" aria-hidden="true"></span>
          <h2 id="adeInfoTitulo"></h2>
          <button class="ade-info-x" type="button" aria-label="Cerrar" data-act="close">×</button>
        </div>
        <div class="ade-info-body" id="adeInfoCuerpo"></div>
      </div>`;
    document.body.appendChild(ventana);
    cuerpoEl = ventana.querySelector("#adeInfoCuerpo");

    // Clic fuera de la ventana o en un botón con data-act
    ventana.addEventListener("click", e => {
      if(e.target === ventana) return cerrar();
      const b = e.target.closest("[data-act]");
      if(!b) return;
      const accion = b.dataset.act;
      if(accion === "close") return cerrar();
      cerrar(true);
      if(typeof openAuth === "function") openAuth(accion);   // login | register | forgot
    });

    document.addEventListener("keydown", e => {
      if(e.key === "Escape" && ventana.classList.contains("open")) cerrar();
    });
  }

  /* ---------- Abrir una ventana ----------
     Qué hace: Pone en la ventana el contenido de la clave pedida y la muestra.
     Por qué: Es lo que ocurre al hacer clic en cada botón de la izquierda. */
  function abrir(clave){
    const vista = VISTAS[clave];
    if(!vista) return;
    crearVentana();

    abridor = document.activeElement;
    ventana.querySelector("#adeInfoIcono").innerHTML = ico(vista.icono);
    ventana.querySelector("#adeInfoTitulo").textContent = vista.titulo;
    cuerpoEl.innerHTML = vista.html();
    if(vista.despues) vista.despues(cuerpoEl);
    cuerpoEl.scrollTop = 0;

    ventana.classList.add("open");
    document.documentElement.style.overflow = "hidden";
    ventana.querySelector(".ade-info-x").focus();
  }

  /* ---------- Cerrar la ventana ----------
     Qué hace: Oculta la ventana y devuelve el cursor al botón.
     Por qué: Para que quien usa teclado no se pierda. */
  function cerrar(sinDevolverFoco){
    if(!ventana) return;
    ventana.classList.remove("open");
    document.documentElement.style.overflow = "";
    if(!sinDevolverFoco && abridor && abridor.focus) abridor.focus();
  }


  /* ---------- Página pública: botones y tarjetas ----------
     Qué hace: Cambia los 6 botones de la izquierda por cuadritos verdes con icono y nombre, y cambia el emoji de las 4 tarjetas (Organización, Materias, Actividades, Horario) por un icono.
     Por qué: Se hace solo desde aquí, sin tocar el HTML. */

  /* ---------- Nombres de los botones ----------
     Qué hace: Relaciona el texto de cada botón con su ventana.
     Por qué: Así el código sabe qué ventana abrir. */
  const ETIQUETAS = {
    "manual ade":"manual", "soporte en linea":"soporte", "nuestros programas":"programas",
    "biblioteca digital":"biblioteca", "correo escolar":"correo", "guia ade":"guia",
    "organizacion":"organizacion", "materias":"materias", "actividades":"actividades", "horario":"horario"
  };

  /* ---------- Cuáles son tarjetas ----------
     Qué hace: Marca cuáles elementos son tarjetas y no botones.
     Por qué: Las tarjetas se tratan distinto (solo cambia el emoji). */
  const ES_TARJETA = {organizacion:1, materias:1, actividades:1, horario:1};

  /* ---------- Reconocer emojis ----------
     Qué hace: Expresiones para detectar si un texto tiene emojis.
     Por qué: Para saber qué hay que reemplazar por un icono. */
  const EMOJI_TEST = /\p{Extended_Pictographic}/u;
  const EMOJI_ALL = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

  /* ---------- Normalizar texto ----------
     Qué hace: Pasa el texto a minúsculas y sin tildes.
     Por qué: Para encontrar los botones aunque cambien mayúsculas o tildes. */
  function normaliza(t){
    return String(t || "").replace(EMOJI_ALL, "").replace(/\s+/g, " ").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* ---------- Estilos de la página pública ----------
     Qué hace: Estilos de los botones y tarjetas nuevos.
     Por qué: Se agregan desde aquí para no tocar el archivo de estilos. */
  const cssPublica = `
    .ld-ico{display:inline-grid;place-items:center;width:1.15em;height:1.15em;vertical-align:-.2em;flex:none;font-style:normal}
    .ld-ico svg{width:100%;height:100%;display:block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .ld-ico.md{width:20px;height:20px;vertical-align:middle}
    .ld-ico.lg{width:28px;height:28px;vertical-align:middle;color:#fff}
    .ld-ico.inl{margin-right:.55em}

    /* Botones de la izquierda */
    #landingScreen .lp-item{
      position:relative; display:flex !important; align-items:center !important; justify-content:flex-start !important;
      gap:14px !important; width:100% !important; height:auto !important; min-height:0 !important;
      margin:0 !important; padding:8px 10px !important; box-sizing:border-box !important;
      background:transparent !important; border:0 !important; border-radius:14px !important; box-shadow:none !important;
      color:#fff !important; font:600 15px/1.25 Arimo,Arial,Helvetica,sans-serif !important; text-align:left !important;
      cursor:pointer; transform:none !important; text-decoration:none !important;
      transition:background .15s;
    }
    #landingScreen .lp-item::after{
      content:""; position:absolute; left:64px; right:8px; bottom:0; height:1px; background:rgba(111,227,161,.18);
    }
    #landingScreen .lp-item:hover{background:rgba(37,160,93,.2) !important}
    #landingScreen .lp-item:focus-visible{outline:2px solid #6fe3a1; outline-offset:1px}
    .lp-tile{
      flex:none; width:42px; height:42px; border-radius:12px; display:grid; place-items:center; color:#fff;
      background:linear-gradient(160deg,#2fb86d,#1d8a52); border:1px solid rgba(111,227,161,.55);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.22), 0 4px 10px rgba(0,0,0,.3);
      transition:filter .15s;
    }
    .lp-tile .ld-ico{width:22px; height:22px; vertical-align:baseline}
    #landingScreen .lp-item:hover .lp-tile{filter:brightness(1.15)}
    .lp-label{min-width:0; overflow-wrap:anywhere}
  `;

  /* ---------- Buscar el botón ----------
     Qué hace: Desde el texto "Manual ADE" sube hasta el botón o tarjeta que lo contiene.
     Por qué: Hay que saber qué elemento cambiar sin editar el HTML. */
  // Del texto "Manual ADE" sube hasta el botón/tarjeta que lo contiene (el más grande que sigue diciendo solo eso)
  function contenedorDe(nodo, raiz, clave){
    let el = nodo.parentElement, mejor = el;
    while(el && el !== raiz){
      if(ETIQUETAS[normaliza(el.textContent)] !== clave) break;
      mejor = el;
      el = el.parentElement;
    }
    return mejor;
  }

  /* ---------- HTML a elemento ----------
     Qué hace: Convierte un texto HTML en un elemento de la página.
     Por qué: Para poder insertar el icono. */
  function nodoHtml(html){
    const t = document.createElement("div");
    t.innerHTML = html;
    return t.firstChild;
  }

  /* ---------- Cambiar el emoji de una tarjeta ----------
     Qué hace: Cambia solo el emoji (o imagen) por el icono; lo demás queda como estaba.
     Por qué: Así la tarjeta conserva su círculo verde y su texto. */
  // Tarjeta: se cambia solo el emoji (o la imagen) por el icono; lo demás queda como estaba
  function cambiarEmojiTarjeta(caja, clave){

    const recorrido = document.createTreeWalker(caja, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while(recorrido.nextNode()) nodos.push(recorrido.currentNode);

    nodos.forEach(function(nodo){
      if(!EMOJI_TEST.test(nodo.nodeValue)) return;
      const padre = nodo.parentElement;
      const resto = nodo.nodeValue.replace(EMOJI_ALL, "").trim();

      if(!resto){
        if(padre && padre !== caja && padre.childNodes.length === 1) padre.innerHTML = ico(clave, "lg");
        else nodo.replaceWith(nodoHtml(ico(clave, "lg")));
      }else{
        nodo.nodeValue = resto;
        nodo.parentNode.insertBefore(nodoHtml(ico(clave, "md inl")), nodo);
      }
    });

    caja.querySelectorAll("img").forEach(function(img){
      img.replaceWith(nodoHtml(ico(clave, "lg")));
    });
  }

  /* ---------- Arreglar la página pública ----------
     Qué hace: Aplica los estilos, convierte los botones y tarjetas y conecta los clics para abrir las ventanas.
     Por qué: Es la función que deja todo funcionando. */
  function paginaPublica(){

    const raiz = document.getElementById("landingScreen");
    if(!raiz) return;

    if(!document.getElementById("landingIconStyle")){
      const st = document.createElement("style");
      st.id = "landingIconStyle";
      st.textContent = cssPublica;
      document.head.appendChild(st);
    }

    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while(recorrido.nextNode()) nodos.push(recorrido.currentNode);

    nodos.forEach(function(nodo){

      const padre = nodo.parentElement;
      if(!padre || padre.closest("[data-lp], .ade-info, .auth-card, form") || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/.test(padre.tagName)) return;

      const clave = ETIQUETAS[normaliza(nodo.nodeValue)];
      if(!clave) return;

      const caja = contenedorDe(nodo, raiz, clave);
      if(!caja || caja === raiz || caja.dataset.lp) return;
      caja.dataset.lp = "1";

      // Tarjetas de abajo: solo el icono nuevo
      if(ES_TARJETA[clave]){
        cambiarEmojiTarjeta(caja, clave);
        return;
      }

      // Botones de la izquierda: cuadrito verde + nombre (se conserva su acción)
      const texto = nodo.nodeValue.replace(EMOJI_ALL, "").trim();

      let onclick = caja.getAttribute("onclick");
      if(!onclick){
        const dentro = caja.querySelector("[onclick]");
        if(dentro) onclick = dentro.getAttribute("onclick");
      }
      if(onclick) caja.setAttribute("onclick", onclick);

      caja.classList.add("lp-item");
      if(caja.tagName === "BUTTON") caja.type = "button";
      caja.innerHTML =
        '<span class="lp-tile">' + ico(clave) + '</span>' +
        '<span class="lp-label">' + esc(texto) + '</span>';

      // Si el botón no traía acción propia, abre su ventana de información
      if(!onclick && !caja.hasAttribute("data-act")){
        caja.addEventListener("click", function(){ abrir(clave); });
        caja.setAttribute("role", "button");
        caja.setAttribute("tabindex", "0");
      }
    });
  }

  /* ---------- Arrancar ----------
     Qué hace: Ejecuta la función de arriba.
     Por qué: Se llama más de una vez por si la página se dibuja tarde. */
  function arrancarPublica(){
    try{ paginaPublica(); }catch(e){ console.error(e); }
  }

  /* ---------- Cuándo arrancar ----------
     Qué hace: Espera a que la página cargue; si ya cargó, arranca de una vez. Además lo intenta otra vez a los 400 ms.
     Por qué: Por si algo de la página se dibuja un poco después. */
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancarPublica);
  else arrancarPublica();
  setTimeout(arrancarPublica, 400);      // por si algo de la página se dibuja un poco después

  /* ---------- Compartir con otros archivos ----------
     Qué hace: Hace que abrirInfo y cerrarInfo se puedan usar desde fuera.
     Por qué: Otros archivos (como el HTML) necesitan abrir esas ventanas. */
  window.abrirInfo = abrir;
  window.cerrarInfo = cerrar;

})();