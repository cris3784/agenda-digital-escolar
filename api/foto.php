<?php
require __DIR__ . '/util.php';
exigir_sesion();

// Por defecto es tu propia foto; con ?u=est12 (o pro3, adm1) es la de esa cuenta
$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

$id = (string)($_GET['u'] ?? '');
if (preg_match('/^(adm|pro|est)([0-9]+)$/', $id, $m)) {
    foreach (ROLES as $r => $info) {
        if ($info[1] === $m[1]) {
            $rol = $r;
            break;
        }
    }
    $codigo = (int)$m[2];
}

list($tabla, $p) = ROLES[$rol];
$f = filas($conexion, "SELECT {$p}_foto AS foto FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);

$archivo = (!empty($f[0]['foto'])) ? dirname(__DIR__) . '/' . $f[0]['foto'] : '';

if ($archivo === '' || !is_file($archivo)) {
    http_response_code(404);
    exit;
}

header('Content-Type: image/jpeg');
header('Cache-Control: private, max-age=86400');
header('X-Content-Type-Options: nosniff');
readfile($archivo);