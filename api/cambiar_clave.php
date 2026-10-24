<?php
require __DIR__ . '/util.php';
solo_post();
exigir_sesion();

$d = entrada();
$actual = (string)($d['actual'] ?? '');
$nueva  = (string)($d['nueva'] ?? '');

if (strlen($nueva) < 6 || strlen($nueva) > 72) {
    fallar('La nueva contraseña debe tener entre 6 y 72 caracteres.');
}
if ($nueva === $actual) {
    fallar('La nueva contraseña debe ser distinta a la actual.');
}

$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];
list($tabla, $p) = ROLES[$rol];

$f = filas($conexion, "SELECT {$p}_clave AS clave FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);

if (!$f || !password_verify($actual, $f[0]['clave'])) {
    usleep(500000);
    fallar('La contraseña actual no es correcta.', 401);
}

$hash = password_hash($nueva, PASSWORD_DEFAULT);
$s = $conexion->prepare("UPDATE {$tabla} SET {$p}_clave = ? WHERE {$p}_codigo = ?");
$s->bind_param('si', $hash, $codigo);

if (!$s->execute()) {
    fallar('No se pudo cambiar la contraseña.', 500);
}

responder(['ok' => true]);
