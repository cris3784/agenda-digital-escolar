<?php
// Descarga de archivos de actividades (t=act) y de entregas (t=ent), solo para quien tiene permiso.
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

$c = contexto($conexion);
$tipo = (string)($_GET['t'] ?? '');
$id = (int)($_GET['id'] ?? 0);

$ruta = '';
$nombre = '';

if ($tipo === 'act') {
    $a = cargar_actividad_fila($conexion, $id);
    if ($a && puede_ver($c, $a)) {
        $ruta = (string)$a['act_archivo_ruta'];
        $nombre = (string)$a['act_archivo_nombre'];
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
    exit;
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . rawurlencode($nombre) . '"; filename*=UTF-8\'\'' . rawurlencode($nombre));
header('Content-Length: ' . filesize($real));
header('Cache-Control: private, max-age=0');
header('X-Content-Type-Options: nosniff');
readfile($real);
