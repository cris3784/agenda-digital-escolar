<?php
/* =========================================================
   CERRAR SESIÓN
   Qué hace: Cierra la sesión de la persona: borra sus datos de la sesión y la cookie que la identificaba.
   Por qué: Para que nadie más pueda usar la cuenta desde ese navegador después de salir.
   ========================================================= */

/* ---------- Cargar las herramientas y exigir POST ----------
   Qué hace: Trae util.php y acepta solo peticiones POST.
   Por qué: Así una dirección cualquiera no puede cerrar la sesión de alguien sin que lo pida. */
require __DIR__ . '/util.php';
solo_post();

/* ---------- Borrar la sesión ----------
   Qué hace: Vacía los datos de la sesión, hace que el navegador borre su cookie (poniéndole una fecha ya pasada) y destruye la sesión en el servidor.
   Por qué: Hay que quitar la sesión en los dos lados: el servidor y el navegador. */
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $c = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $c['path'], $c['domain'], $c['secure'], $c['httponly']);
}
session_destroy();

/* ---------- Responder ----------
   Qué hace: Avisa que todo salió bien. */
responder(['ok' => true]);