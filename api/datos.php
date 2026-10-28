<?php
/* =========================================================
   DATOS DE USUARIOS
   Qué hace: Devuelve la cuenta de quien tiene la sesión y la lista de otras cuentas que puede ver.
   Por qué: Cada persona recibe su cuenta completa, y de los demás solo la versión pública (sin fecha de nacimiento ni correos); solo el administrador recibe todo.
   ========================================================= */

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php (conexión, sesión y funciones como filas(), responder() y fallar()).
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Exigir sesión ----------
   Qué hace: Si no hay sesión iniciada, se detiene. */
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Toma el rol y el código de la sesión. */
$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

/* ---------- Mi cuenta ----------
   Qué hace: Carga la cuenta completa; si ya no existe o está desactivada, cierra la sesión y responde 401.
   Por qué: Una cuenta desactivada o borrada no debe seguir usando la agenda. */
// Cada persona recibe SU cuenta completa; las de los demás llegan en versión pública
// (sin fecha de nacimiento ni correos). Solo el administrador recibe todo.
$yo = cargar_usuario($conexion, $rol, $codigo);
if (!$yo || !cuenta_activa($yo)) {
    $_SESSION = [];
    session_destroy();
    fallar('Tu sesión ya no es válida.', 401);
}

/* ---------- Las otras cuentas ----------
   Qué hace: Admin: todas. Profesor: los estudiantes de sus grupos. Acudiente: ninguna. Estudiante: los profesores de su grupo.
   Por qué: Cada rol ve solo a las personas con las que trabaja. */
if ($rol === 'admin') {
    $otros = listar_todos($conexion);
} elseif ($rol === 'profesor') {
    $otros = listar_estudiantes_de_profesor($conexion, $yo);
} elseif ($rol === 'acudiente') {
    $otros = [];
} else {
    $otros = listar_profesores_de_grupo($conexion, $yo['grade']);
}

/* ---------- Armar la lista ----------
   Qué hace: Pone primero la cuenta propia y después las demás, sin repetirla. */
$usuarios = [$yo];
foreach ($otros as $u) {
    if ($u['id'] !== $yo['id']) {
        $usuarios[] = $u;
    }
}

/* ---------- Responder ----------
   Qué hace: Manda la lista en formato JSON. */
responder(['ok' => true, 'usuarios' => $usuarios]);