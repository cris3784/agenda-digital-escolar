<?php
// Archivos de actividades (t=act) y de entregas (t=ent), solo para quien tiene permiso.
//   archivo.php?t=act&id=7           -> se descarga
//   archivo.php?t=act&id=7&ver=1     -> se abre en el navegador (PDF, imágenes y texto)
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

$c = contexto($conexion);
$tipo = (string)($_GET['t'] ?? '');
$id = (int)($_GET['id'] ?? 0);
$ver = ($_GET['ver'] ?? '') === '1';

$ruta = '';
$nombre = '';

if ($tipo === 'act') {
    $a = cargar_actividad_fila($conexion, $id);
    if ($a && puede_ver($c, $a)) {
        $ruta = (string)($a['act_archivo_ruta'] ?? '');
        $nombre = (string)($a['act_archivo_nombre'] ?? '');
    }
} elseif ($tipo === 'ent') {
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

$base = realpath(dirname(__DIR__) . '/uploads/trabajos');
$real = $ruta !== '' ? realpath(dirname(__DIR__) . '/' . $ruta) : false;

if (!$base || !$real || strpos($real, $base . DIRECTORY_SEPARATOR) !== 0 || !is_file($real)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'No se encontró el archivo.';
    exit;
}

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
$ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
$codificado = rawurlencode($nombre);
$simple = preg_replace('/[^A-Za-z0-9._-]/', '_', $nombre);

if ($ver && isset($abribles[$ext])) {
    header('Content-Type: ' . $abribles[$ext]);
    header('Content-Disposition: inline; filename="' . $simple . '"; filename*=UTF-8\'\'' . $codificado);
} else {
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $simple . '"; filename*=UTF-8\'\'' . $codificado);
}
header('Cache-Control: private, max-age=0');
header('X-Content-Type-Options: nosniff');

// Sin Content-Length: algunos servidores comprimen la respuesta y el tamaño ya no coincide
while (ob_get_level() > 0) {
    ob_end_clean();
}
readfile($real);
