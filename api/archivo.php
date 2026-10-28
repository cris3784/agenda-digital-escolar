<?php
/* =========================================================
   DESCARGAR ARCHIVOS
   Qué hace: Entrega los archivos de actividades (t=act) y de entregas (t=ent), solo a quien tiene permiso.
   Por qué: Los archivos están en una carpeta cerrada al público; esta es la única puerta para verlos, y aquí se revisan los permisos.
   archivo.php?t=act&id=7 -> se descarga.
   archivo.php?t=act&id=7&ver=1 -> se abre en el navegador (PDF, imágenes y texto).
   ========================================================= */

// Archivos de actividades (t=act) y de entregas (t=ent), solo para quien tiene permiso.
//   archivo.php?t=act&id=7           -> se descarga
//   archivo.php?t=act&id=7&ver=1     -> se abre en el navegador (PDF, imágenes y texto)

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones comunes). */
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Saca el rol y los permisos de quien pide el archivo. */
$c = contexto($conexion);

/* ---------- Qué se pide ----------
   Qué hace: Lee el tipo (t), el número (id) y si se quiere abrir en el navegador (ver). */
$tipo = (string)($_GET['t'] ?? '');
$id = (int)($_GET['id'] ?? 0);
$ver = ($_GET['ver'] ?? '') === '1';

$ruta = '';
$nombre = '';

/* ---------- Archivo de una actividad ----------
   Qué hace: Lo entrega solo si la persona puede ver esa actividad.
   Por qué: Un estudiante no debe ver actividades de otro grupo. */
if ($tipo === 'act') {
    $a = cargar_actividad_fila($conexion, $id);
    if ($a && puede_ver($c, $a)) {
        $ruta = (string)($a['act_archivo_ruta'] ?? '');
        $nombre = (string)($a['act_archivo_nombre'] ?? '');
    }
} elseif ($tipo === 'ent') {

    /* ---------- Archivo de una entrega ----------
       Qué hace: Lo entrega solo al estudiante que lo subió o a quien gestiona la actividad (profesor o admin).
       Por qué: Los trabajos de los estudiantes son privados. */
    $f = filas($conexion, 'SELECT * FROM entregas WHERE ent_codigo = ?', 'i', [$id]);
    if ($f) {
        $e = $f[0];
        $a = cargar_actividad_fila($conexion, (int)$e['ent_act_actividad']);
        $esMia = $c['rol'] === 'estudiante' && (int)$e['ent_est_estudiante'] === $c['codigo'];
        if ($a && ($esMia || puede_gestionar($c, $a))) {
            $ruta = (string)$e['ent_archivo_ruta'];
            $nombre = (string)$e['ent_archivo_nombre'];
        }
    }
}

/* ---------- Revisar la ruta ----------
   Qué hace: Confirma que el archivo esté dentro de la carpeta de trabajos y exista; si no, responde 404.
   Por qué: Evita que alguien pida archivos de otros lugares del servidor. */
$base = realpath(dirname(__DIR__) . '/uploads/trabajos');
$real = $ruta !== '' ? realpath(dirname(__DIR__) . '/' . $ruta) : false;

if (!$base || !$real || strpos($real, $base . DIRECTORY_SEPARATOR) !== 0 || !is_file($real)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'No se encontró el archivo.';
    exit;
}

/* ---------- Qué se puede abrir ----------
   Qué hace: Lista de tipos que el navegador puede mostrar (PDF, imágenes y texto); lo demás se descarga.
   Por qué: Un archivo desconocido no debe ejecutarse en el navegador. */
// Solo estos tipos se pueden abrir en el navegador; lo demás (Word, etc.) se descarga
$abribles = [
    'pdf'  => 'application/pdf',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'txt'  => 'text/plain; charset=utf-8'
];

/* ---------- Nombre y extensión ----------
   Qué hace: Prepara el nombre del archivo para que se descargue con su nombre original, incluso con tildes. */
$ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
$codificado = rawurlencode($nombre);
$simple = preg_replace('/[^A-Za-z0-9._-]/', '_', $nombre);

/* ---------- Abrir o descargar ----------
   Qué hace: Si se pidió ver y el tipo lo permite, se abre en el navegador; si no, se descarga. */
if ($ver && isset($abribles[$ext])) {
    header('Content-Type: ' . $abribles[$ext]);
    header('Content-Disposition: inline; filename="' . $simple . '"; filename*=UTF-8\'\'' . $codificado);
} else {
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $simple . '"; filename*=UTF-8\'\'' . $codificado);
}

/* ---------- Seguridad de la respuesta ----------
   Qué hace: No se guarda copia en caches compartidas y se evita que el navegador adivine el tipo del archivo. */
header('Cache-Control: private, max-age=0');
header('X-Content-Type-Options: nosniff');

/* ---------- Enviar el archivo ----------
   Qué hace: Limpia lo que hubiera en la salida y manda el archivo.
   Por qué: Algunos servidores comprimen la respuesta y el tamaño ya no coincidiría. */
// Sin Content-Length: algunos servidores comprimen la respuesta y el tamaño ya no coincide
while (ob_get_level() > 0) {
    ob_end_clean();
}
readfile($real);