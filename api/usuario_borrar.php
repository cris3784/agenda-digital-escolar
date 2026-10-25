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

if (!ejecutar($conexion, "DELETE FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo])) {
    fallar('No se pudo eliminar la cuenta.', 500);
}

if (!empty($f[0]['foto'])) {
    $archivo = dirname(__DIR__) . '/' . $f[0]['foto'];
    if (is_file($archivo)) {
        @unlink($archivo);
    }
}

responder(['ok' => true]);
