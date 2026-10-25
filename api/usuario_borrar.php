<?php
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

$d = entrada();
$rol    = (string)($d['rol'] ?? '');
$codigo = (int)($d['codigo'] ?? 0);

if (($rol !== 'estudiante' && $rol !== 'profesor' && $rol !== 'acudiente') || $codigo < 1) {
    fallar('Cuenta no válida.');
}

list($tabla, $p) = ROLES[$rol];

$f = filas($conexion, "SELECT {$p}_foto AS foto FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);
if (!$f) {
    fallar('Esa cuenta ya no existe.', 404);
}

// Antes de borrar la cuenta, se anotan los trabajos que entregó (la base de datos borra las filas,
// pero los archivos quedarían en el servidor)
$rutas = [];
if ($rol === 'estudiante') {
    foreach (filas($conexion, 'SELECT ent_archivo_ruta AS r FROM entregas WHERE ent_est_estudiante = ?', 'i', [$codigo]) as $e) {
        if ($e['r'] !== '') {
            $rutas[] = $e['r'];
        }
    }
}

if (!ejecutar($conexion, "DELETE FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo])) {
    fallar('No se pudo eliminar la cuenta.', 500);
}

// Foto de perfil
if (!empty($f[0]['foto'])) {
    $archivo = dirname(__DIR__) . '/' . $f[0]['foto'];
    if (is_file($archivo)) {
        @unlink($archivo);
    }
}

// Trabajos entregados: solo se borra lo que esté dentro de uploads/trabajos
$base = realpath(dirname(__DIR__) . '/uploads/trabajos');
foreach ($rutas as $r) {
    $real = realpath(dirname(__DIR__) . '/' . $r);
    if ($base && $real && strpos($real, $base . DIRECTORY_SEPARATOR) === 0 && is_file($real)) {
        @unlink($real);
    }
}

responder(['ok' => true]);