<?php
require __DIR__ . '/util.php';
solo_post();

$d = entrada();
$paso = (string)($d['paso'] ?? '');

if (($_SESSION['rec_intentos'] ?? 0) >= 6 && time() - ($_SESSION['rec_ultimo'] ?? 0) < 600) {
    fallar('Demasiados intentos. Espera unos minutos e intenta de nuevo.', 429);
}

if ($paso === 'verificar') {
    $usuario = trim((string)($d['usuario'] ?? ''));
    $correo  = trim((string)($d['correo'] ?? ''));

    if ($usuario === '' || $correo === '') {
        fallar('Escribe tu usuario y tu correo.');
    }

    $encontrada = null;
    foreach (['estudiante', 'profesor'] as $rol) {
        list($tabla, $p) = ROLES[$rol];
        $f = filas(
            $conexion,
            "SELECT {$p}_codigo AS codigo, {$p}_nombre AS nombre FROM {$tabla} WHERE {$p}_usuario = ? AND {$p}_correo = ? LIMIT 1",
            'ss',
            [$usuario, $correo]
        );
        if ($f) {
            $encontrada = ['rol' => $rol, 'codigo' => (int)$f[0]['codigo'], 'nombre' => $f[0]['nombre']];
            break;
        }
    }

    if (!$encontrada) {
        $_SESSION['rec_intentos'] = ($_SESSION['rec_intentos'] ?? 0) + 1;
        $_SESSION['rec_ultimo'] = time();
        usleep(500000);
        fallar('Los datos no coinciden con ninguna cuenta.', 404);
    }

    $_SESSION['recuperar'] = [
        'rol'    => $encontrada['rol'],
        'codigo' => $encontrada['codigo'],
        'hasta'  => time() + 600
    ];
    responder(['ok' => true, 'nombre' => $encontrada['nombre']]);
}

if ($paso === 'cambiar') {
    $r = $_SESSION['recuperar'] ?? null;
    if (!$r || $r['hasta'] < time()) {
        fallar('Se acabó el tiempo. Vuelve a escribir tu usuario y tu correo.', 403);
    }

    $nueva = (string)($d['nueva'] ?? '');
    if (strlen($nueva) < 6 || strlen($nueva) > 72) {
        fallar('La nueva contraseña debe tener entre 6 y 72 caracteres.');
    }

    list($tabla, $p) = ROLES[$r['rol']];
    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_clave = ? WHERE {$p}_codigo = ?", 'si', [password_hash($nueva, PASSWORD_DEFAULT), $r['codigo']])) {
        fallar('No se pudo cambiar la contraseña.', 500);
    }

    unset($_SESSION['recuperar']);
    responder(['ok' => true]);
}

fallar('Paso no válido.');
