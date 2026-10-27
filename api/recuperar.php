<?php
/* Recuperar contraseña con un código de 6 dígitos que llega al correo.
   paso "enviar"    -> la persona escribe su correo y le mandamos el código
   paso "verificar" -> escribe el código; si es correcto, entra a su cuenta
   paso "cambiar"   -> ya dentro, elige su contraseña nueva (15 minutos para hacerlo) */
require __DIR__ . '/util.php';
require __DIR__ . '/correo_lib.php';
solo_post();

$d = entrada();
$paso = (string)($d['paso'] ?? '');

function buscar_cuenta_por_correo($conexion, $correo) {
    foreach (['estudiante', 'profesor', 'acudiente'] as $rol) {   // el administrador no recupera por correo
        list($tabla, $p) = ROLES[$rol];
        $f = filas(
            $conexion,
            "SELECT {$p}_codigo AS codigo, {$p}_nombre AS nombre FROM {$tabla} WHERE {$p}_correo = ? LIMIT 1",
            's',
            [$correo]
        );
        if ($f) {
            return ['rol' => $rol, 'codigo' => (int)$f[0]['codigo'], 'nombre' => $f[0]['nombre']];
        }
    }
    return null;
}

if ($paso === 'enviar') {
    $correo = trim((string)($d['correo'] ?? ''));
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        fallar('Escribe el correo de tu cuenta.');
    }

    $cuenta = buscar_cuenta_por_correo($conexion, $correo);

    if ($cuenta) {
        list($idCodigo, $codigo) = crear_codigo($conexion, $correo, 'recuperar', ['rol' => $cuenta['rol'], 'codigo' => $cuenta['codigo']]);

        $html = plantilla_codigo(
            'Recupera tu cuenta',
            $cuenta['nombre'],
            'Recibimos una solicitud para recuperar tu cuenta. Escribe este código en A.D.E. para entrar y elegir una contraseña nueva.',
            $codigo
        );
        if (!enviar_correo($correo, $cuenta['nombre'], 'Tu código para recuperar la cuenta - A.D.E.', $html)) {
            borrar_codigo_id($conexion, $idCodigo);
            fallar('No pudimos enviar el correo. Intenta de nuevo en un momento.', 502);
        }
    } else {
        usleep(600000);   // se responde igual para no revelar qué correos existen
    }

    responder(['ok' => true]);
}

if ($paso === 'verificar') {
    $correo = trim((string)($d['correo'] ?? ''));

    $v = verificar_codigo($conexion, $correo, 'recuperar', $d['codigo'] ?? '');

    $datos = $v['datos'];
    if (is_array($datos) && isset(ROLES[(string)($datos['rol'] ?? '')])) {
        // escribir el código que llegó al correo demuestra que el correo es suyo
        list($tablaR, $pR) = ROLES[$datos['rol']];
        ejecutar($conexion, "UPDATE {$tablaR} SET {$pR}_correo_verificado = 1 WHERE {$pR}_codigo = ?", 'i', [(int)($datos['codigo'] ?? 0)]);
    }
    $usuario = is_array($datos) ? cargar_usuario($conexion, (string)($datos['rol'] ?? ''), (int)($datos['codigo'] ?? 0)) : null;
    if (!$usuario) {
        fallar('No se encontró la cuenta.', 404);
    }
    if (!cuenta_activa($usuario)) {
        borrar_codigos($conexion, $correo, 'recuperar');
        fallar('Tu cuenta de profesor aún no ha sido aprobada por un administrador.', 403);
    }

    session_regenerate_id(true);
    $_SESSION = [
        'rol'       => $datos['rol'],
        'codigo'    => (int)$datos['codigo'],
        'recuperar' => ['hasta' => time() + 900]
    ];
    borrar_codigos($conexion, $correo, 'recuperar');
    registrar_acceso($conexion, $datos['rol'], (int)$datos['codigo']);
    $usuario = cargar_usuario($conexion, $datos['rol'], (int)$datos['codigo']);   // ya con la hora de este ingreso

    responder(['ok' => true, 'usuario' => $usuario]);
}

if ($paso === 'cambiar') {
    exigir_sesion();

    $r = $_SESSION['recuperar'] ?? null;
    if (!$r || $r['hasta'] < time()) {
        fallar('Se acabó el tiempo. Pide un código nuevo para recuperar tu cuenta.', 403);
    }

    $nueva = (string)($d['nueva'] ?? '');
    if (strlen($nueva) < 6 || strlen($nueva) > 72) {
        fallar('La nueva contraseña debe tener entre 6 y 72 caracteres.');
    }

    list($tabla, $p) = ROLES[$_SESSION['rol']];
    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_clave = ? WHERE {$p}_codigo = ?", 'si', [password_hash($nueva, PASSWORD_DEFAULT), (int)$_SESSION['codigo']])) {
        fallar('No se pudo cambiar la contraseña.', 500);
    }

    unset($_SESSION['recuperar']);
    responder(['ok' => true]);
}

fallar('Paso no válido.');