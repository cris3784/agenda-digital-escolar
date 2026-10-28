<?php
/* =========================================================
   CONEXIÓN A LA BASE DE DATOS
   Qué hace: Se conecta a MySQL: con datos de prueba si se abre en tu computador (localhost) y con los datos del hosting en internet.
   Por qué: Todos los archivos de api/ la necesitan para leer y guardar. Si falla, responde con un error en lugar de dejar la página rota.
   IMPORTANTE: aquí van la contraseña de la base de datos. No la subas a GitHub ni la compartas.
   (En esta copia comentada los datos del hosting están cambiados por texto de relleno: conserva los tuyos.)
   ========================================================= */

/* ---------- ¿Estamos en tu computador? ----------
   Qué hace: Revisa si el sitio se abrió desde localhost o 127.0.0.1.
   Por qué: Así el mismo código sirve para trabajar en casa y para internet. */
$esLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1']);

/* ---------- Datos de conexión ----------
   Qué hace: En tu computador usa root sin contraseña y la base "ade"; en internet usa los datos del hosting.
   Por qué: Cada lugar tiene su propia base de datos. */
if ($esLocal) {
    $host    = 'localhost';
    $usuario = 'root';
    $clave   = '';
    $base    = 'ade';
} else {
    $host    = 'sql302.infinityfree.com';
    $usuario = 'if0_43280978';
    $clave   = 'PON_AQUI_LA_CLAVE';
    $base    = 'if0_43280978_ade';
}

/* ---------- Sin errores en pantalla ----------
   Qué hace: Apaga los mensajes de error automáticos de MySQL.
   Por qué: Para no mostrar datos internos a los visitantes. */
mysqli_report(MYSQLI_REPORT_OFF);

/* ---------- Conectar ----------
   Qué hace: Abre la conexión con la base de datos. */
$conexion = new mysqli($host, $usuario, $clave, $base);

/* ---------- Si no conecta ----------
   Qué hace: Responde con error 500 en formato JSON y termina.
   Por qué: La página recibe un mensaje claro en lugar de quedarse en blanco. */
if ($conexion->connect_errno) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'No se pudo conectar a la base de datos']);
    exit;
}

/* ---------- Letras y tildes ----------
   Qué hace: Usa utf8mb4.
   Por qué: Para que las tildes, ñ y emojis se guarden bien. */
$conexion->set_charset('utf8mb4');