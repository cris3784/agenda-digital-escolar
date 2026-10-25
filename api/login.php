<?php
require __DIR__ . '/util.php';
solo_post();

$d = entrada();
$usuario = trim((string)($d['usuario'] ?? ''));
$clave   = (string)($d['clave'] ?? '');

if ($usuario === '' || $clave === '') {
    fallar('Ingresa tu usuario o correo y tu contraseña.');
}

/* ---------- Límite de intentos: se guarda en la base de datos, no en la sesión ---------- */
$ip  = substr((string)($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 45);
$cta = substr(function_exists('mb_strtolower') ? mb_strtolower($usuario, 'UTF-8') : strtolower($usuario), 0, 120);
$ventana = time() - 600; // últimos 10 minutos

$c = filas(
    $conexion,
    'SELECT COALESCE(SUM(int_ip = ?), 0) AS por_ip, COALESCE(SUM(int_clave = ?), 0) AS por_cuenta, COALESCE(SUM(int_ip = ? AND int_clave = ?), 0) AS por_ambos FROM intentos_login WHERE int_tiempo > ?',
    'ssssi',
    [$ip, $cta, $ip, $cta, $ventana]
);
if ($c && ((int)$c[0]['por_ambos'] >= 8 || (int)$c[0]['por_ip'] >= 25 || (int)$c[0]['por_cuenta'] >= 40)) {
    fallar('Demasiados intentos. Espera unos minutos e intenta de nuevo.', 429);
}

/* ---------- Buscar la cuenta en las 4 tablas con UNA sola consulta ---------- */
$partes = [];
$params = [];
foreach (ROLES as $rol => $info) {
    list($tabla, $p) = $info;
    $estado = $rol === 'profesor' ? "{$p}_estado" : "'aprobado'";
    $partes[] = "SELECT '{$rol}' AS rol, {$p}_codigo AS codigo, {$p}_clave AS clave, {$estado} AS estado FROM {$tabla} WHERE {$p}_usuario = ? OR {$p}_correo = ?";
    $params[] = $usuario;
    $params[] = $usuario;
}
$f = filas($conexion, implode(' UNION ALL ', $partes) . ' LIMIT 1', str_repeat('s', count($params)), $params);
$encontrado = $f ? $f[0] : null;

if (!$encontrado || !password_verify($clave, $encontrado['clave'])) {
    ejecutar($conexion, 'INSERT INTO intentos_login (int_ip, int_clave, int_tiempo) VALUES (?, ?, ?)', 'ssi', [$ip, $cta, time()]);
    if (mt_rand(1, 20) === 1) {
        ejecutar($conexion, 'DELETE FROM intentos_login WHERE int_tiempo < ?', 'i', [time() - 3600]);
    }
    usleep(500000);
    fallar('Usuario/correo o contraseña incorrectos.', 401);
}

// La contraseña es correcta: recién ahora se revisa si el profesor ya fue aprobado
if ($encontrado['rol'] === 'profesor' && $encontrado['estado'] !== 'aprobado') {
    if ($encontrado['estado'] === 'rechazado') {
        fallar('Tu solicitud de profesor no fue aprobada. Comunícate con el colegio.', 403);
    }
    fallar('Tu cuenta de profesor está pendiente de aprobación. Un administrador debe validarla antes de que puedas entrar.', 403);
}

ejecutar($conexion, 'DELETE FROM intentos_login WHERE int_ip = ? AND int_clave = ?', 'ss', [$ip, $cta]);

session_regenerate_id(true);
$_SESSION = ['rol' => $encontrado['rol'], 'codigo' => (int)$encontrado['codigo']];

responder([
    'ok'      => true,
    'usuario' => cargar_usuario($conexion, $encontrado['rol'], (int)$encontrado['codigo'])
]);