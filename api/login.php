<?php
require __DIR__ . '/util.php';
solo_post();

$d = entrada();
$usuario = trim((string)($d['usuario'] ?? ''));
$clave   = (string)($d['clave'] ?? '');

if ($usuario === '' || $clave === '') {
    fallar('Ingresa tu usuario y contraseña.');
}

if (($_SESSION['intentos'] ?? 0) >= 8 && time() - ($_SESSION['ultimo_intento'] ?? 0) < 60) {
    fallar('Demasiados intentos. Espera un minuto e intenta de nuevo.', 429);
}

$encontrado = null;
foreach (ROLES as $rol => $info) {
    list($tabla, $p) = $info;
    $f = filas(
        $conexion,
        "SELECT {$p}_codigo AS codigo, {$p}_clave AS clave FROM {$tabla} WHERE {$p}_usuario = ? LIMIT 1",
        's',
        [$usuario]
    );
    if ($f) {
        $encontrado = $f[0];
        $encontrado['rol'] = $rol;
        break;
    }
}

if (!$encontrado || !password_verify($clave, $encontrado['clave'])) {
    $_SESSION['intentos'] = ($_SESSION['intentos'] ?? 0) + 1;
    $_SESSION['ultimo_intento'] = time();
    usleep(500000);
    fallar('Usuario o contraseña incorrectos.', 401);
}

session_regenerate_id(true);
$_SESSION = ['rol' => $encontrado['rol'], 'codigo' => (int)$encontrado['codigo']];

responder([
    'ok'      => true,
    'usuario' => cargar_usuario($conexion, $encontrado['rol'], (int)$encontrado['codigo'])
]);
