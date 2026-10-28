<?php
/* =========================================================
   FOTO DE PERFIL
   Qué hace: Entrega la foto de una cuenta: la propia o la de otra persona (con ?u=est12, pro3, adm1…).
   Por qué: Las fotos están guardadas en el servidor y solo se ven con la sesión iniciada; así no quedan abiertas al público.
   ========================================================= */

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php, que tiene lo que casi todos los archivos de api/ usan: conexión a la base de datos, sesión y funciones como filas(), responder() y fallar().
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Exigir sesión ----------
   Qué hace: Si la persona no inició sesión, se detiene aquí.
   Por qué: Una foto es un dato personal. */
exigir_sesion();

/* ---------- ¿De quién es la foto? ----------
   Qué hace: Por defecto es la foto de quien tiene la sesión.
   Por qué: Si no se pide otra, se entrega la propia. */
// Por defecto es tu propia foto; con ?u=est12 (o pro3, adm1) es la de esa cuenta
$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

/* ---------- Foto de otra cuenta ----------
   Qué hace: Lee ?u= (letras del rol + número), convierte el prefijo (adm, pro, est, acu) en un rol y toma el código.
   Por qué: Así otras pantallas (como la lista de profesores) pueden mostrar la foto de cada persona. */
$id = (string)($_GET['u'] ?? '');
if (preg_match('/^(adm|pro|est|acu)([0-9]+)$/', $id, $m)) {
    foreach (ROLES as $r => $info) {
        if ($info[1] === $m[1]) {
            $rol = $r;
            break;
        }
    }
    $codigo = (int)$m[2];
}

/* ---------- Buscar la foto ----------
   Qué hace: Mira en la tabla del rol cuál es el archivo de foto de esa cuenta.
   Por qué: Cada rol (admin, profesor, estudiante, acudiente) vive en su propia tabla. */
list($tabla, $p) = ROLES[$rol];
$f = filas($conexion, "SELECT {$p}_foto AS foto FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);

/* ---------- Ruta del archivo ----------
   Qué hace: Arma la ruta completa de la foto en el servidor.
   Por qué: Solo se guarda la ruta corta en la base de datos. */
$archivo = (!empty($f[0]['foto'])) ? dirname(__DIR__) . '/' . $f[0]['foto'] : '';

/* ---------- Si no hay foto ----------
   Qué hace: Responde 404 (no encontrada) y termina.
   Por qué: La página entonces muestra la inicial del nombre. */
if ($archivo === '' || !is_file($archivo)) {
    http_response_code(404);
    exit;
}

/* ---------- Enviar la imagen ----------
   Qué hace: Avisa que es una imagen JPEG, permite guardarla en el navegador 1 día (solo para esa persona) y la manda.
   Por qué: Así no se vuelve a descargar en cada pantalla. */
header('Content-Type: image/jpeg');
header('Cache-Control: private, max-age=86400');
header('X-Content-Type-Options: nosniff');
readfile($archivo);