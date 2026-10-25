<?php
/* El estudiante guarda y verifica el correo de su acudiente (código de 6 dígitos).
   paso "enviar"    -> manda el código al correo del acudiente; el correo queda guardado SIN verificar
   paso "verificar" -> escribe el código que recibió el acudiente; si es correcto, el correo queda verificado
   paso "quitar"    -> borra el correo del acudiente */
require __DIR__ . '/util.php';
require __DIR__ . '/correo_lib.php';
solo_post();
exigir_sesion();

if ($_SESSION['rol'] !== 'estudiante') {
    fallar('Solo los estudiantes pueden agregar el correo de su acudiente.', 403);
}

$estudiante = (int)$_SESSION['codigo'];
$d = entrada();
$paso = (string)($d['paso'] ?? '');

$f = filas(
    $conexion,
    'SELECT est_nombre AS nombre, est_apellidos AS apellidos, est_correo AS correo, est_acu_correo AS acu, est_acu_verificado AS ver FROM estudiantes WHERE est_codigo = ?',
    'i',
    [$estudiante]
);
if (!$f) {
    fallar('No se pudo leer tu cuenta. Avisa al administrador.', 500);
}
$yo = $f[0];

$tipo = 'acu' . $estudiante;      // cada estudiante tiene su propio código pendiente
if (strlen($tipo) > 12) {
    fallar('No se pudo procesar tu cuenta.', 500);
}

/* ---------- Paso 1: guardar el correo y mandar el código ---------- */
if ($paso === 'enviar') {
    $correo = trim((string)($d['correo'] ?? ''));

    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        fallar('Escribe un correo válido para tu acudiente (ej. nombre@gmail.com).');
    }
    if (strcasecmp($correo, (string)$yo['correo']) === 0) {
        fallar('El correo del acudiente debe ser distinto al tuyo.');
    }
    foreach (['admin', 'profesor', 'estudiante'] as $rol) {
        list($tabla, $p) = ROLES[$rol];
        if (filas($conexion, "SELECT {$p}_codigo FROM {$tabla} WHERE {$p}_correo = ? LIMIT 1", 's', [$correo])) {
            fallar('Ese correo ya pertenece a otra cuenta del colegio. Usa otro correo para tu acudiente.', 409);
        }
    }

    if ($yo['acu'] !== null && strcasecmp($correo, (string)$yo['acu']) === 0 && !empty($yo['ver'])) {
        responder(['ok' => true, 'yaVerificado' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
    }

    list($idCodigo, $codigo) = crear_codigo($conexion, $correo, $tipo, ['estudiante' => $estudiante]);

    $nombreEst = trim($yo['nombre'] . ' ' . $yo['apellidos']);
    $html = plantilla_codigo(
        'Confirma que eres acudiente',
        '',
        $nombreEst . ' te registró como su acudiente en A.D.E. Si estás de acuerdo, dale este código solo a esa persona para confirmar tu correo.',
        $codigo
    );
    if (!enviar_correo($correo, '', 'Confirma que eres acudiente - A.D.E.', $html)) {
        borrar_codigo_id($conexion, $idCodigo);
        fallar('No pudimos enviar el correo. Revisa que esté bien escrito e intenta de nuevo.', 502);
    }

    // Queda guardado sin verificar hasta que se escriba el código
    if (!ejecutar($conexion, 'UPDATE estudiantes SET est_acu_correo = ?, est_acu_verificado = 0 WHERE est_codigo = ?', 'si', [$correo, $estudiante])) {
        borrar_codigo_id($conexion, $idCodigo);
        fallar('No se pudo guardar el correo.', 500);
    }

    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
}

/* ---------- Paso 2: escribir el código ---------- */
if ($paso === 'verificar') {
    $correo = trim((string)($yo['acu'] ?? ''));
    if ($correo === '') {
        fallar('Primero escribe el correo de tu acudiente y pulsa Verificar.');
    }

    $v = verificar_codigo($conexion, $correo, $tipo, $d['codigo'] ?? '');
    $datos = $v['datos'];
    if (!is_array($datos) || (int)($datos['estudiante'] ?? 0) !== $estudiante) {
        fallar('Ese código no corresponde a este correo. Pide uno nuevo.', 410);
    }

    if (!ejecutar($conexion, 'UPDATE estudiantes SET est_acu_verificado = 1 WHERE est_codigo = ? AND est_acu_correo = ?', 'is', [$estudiante, $correo])) {
        fallar('No se pudo guardar la verificación.', 500);
    }
    borrar_codigos($conexion, $correo, $tipo);

    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
}

/* ---------- Quitar el correo del acudiente ---------- */
if ($paso === 'quitar') {
    if (!ejecutar($conexion, 'UPDATE estudiantes SET est_acu_correo = NULL, est_acu_verificado = 0 WHERE est_codigo = ?', 'i', [$estudiante])) {
        fallar('No se pudo quitar el correo.', 500);
    }
    if (!empty($yo['acu'])) {
        borrar_codigos($conexion, (string)$yo['acu'], $tipo);
    }
    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
}

fallar('Paso no válido.');
