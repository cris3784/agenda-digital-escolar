<?php
/* Cada persona verifica su propio correo con un código de 6 dígitos (desde Mi perfil).
   paso "enviar"    -> manda el código al correo de su cuenta
   paso "verificar" -> escribe el código; si es correcto, el correo queda verificado */
require __DIR__ . '/util.php';
require __DIR__ . '/correo_lib.php';
solo_post();
exigir_sesion();

$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];
list($tabla, $p) = ROLES[$rol];

$d = entrada();
$paso = (string)($d['paso'] ?? '');

$f = filas(
    $conexion,
    "SELECT {$p}_nombre AS nombre, {$p}_correo AS correo, {$p}_correo_verificado AS ver FROM {$tabla} WHERE {$p}_codigo = ?",
    'i',
    [$codigo]
);
if (!$f) {
    fallar('No se pudo leer tu cuenta. Avisa al administrador.', 500);
}
$yo = $f[0];
$correo = (string)$yo['correo'];

$tipo = 'v' . $p . $codigo;
if (strlen($tipo) > 12) {
    fallar('No se pudo procesar tu cuenta.', 500);
}

if (!empty($yo['ver'])) {
    responder(['ok' => true, 'yaVerificado' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);
}

/* ---------- Paso 1: mandar el código ---------- */
if ($paso === 'enviar') {
    list($idCodigo, $cod) = crear_codigo($conexion, $correo, $tipo, ['rol' => $rol, 'codigo' => $codigo]);

    $html = plantilla_codigo(
        'Verifica tu correo',
        (string)$yo['nombre'],
        'Escribe este código en A.D.E. para confirmar que este correo es tuyo.',
        $cod
    );
    if (!enviar_correo($correo, (string)$yo['nombre'], 'Verifica tu correo - A.D.E.', $html)) {
        borrar_codigo_id($conexion, $idCodigo);
        fallar('No pudimos enviar el correo. Intenta de nuevo en un momento.', 502);
    }

    responder(['ok' => true]);
}

/* ---------- Paso 2: escribir el código ---------- */
if ($paso === 'verificar') {
    $v = verificar_codigo($conexion, $correo, $tipo, $d['codigo'] ?? '');
    $datos = $v['datos'];
    if (!is_array($datos) || (string)($datos['rol'] ?? '') !== $rol || (int)($datos['codigo'] ?? 0) !== $codigo) {
        fallar('Ese código no corresponde a tu cuenta. Pide uno nuevo.', 410);
    }

    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_correo_verificado = 1 WHERE {$p}_codigo = ?", 'i', [$codigo])) {
        fallar('No se pudo guardar la verificación.', 500);
    }
    borrar_codigos($conexion, $correo, $tipo);

    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);
}

fallar('Paso no válido.');
