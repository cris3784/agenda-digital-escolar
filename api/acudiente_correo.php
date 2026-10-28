<?php
/* =========================================================
   CORREO DEL ACUDIENTE
   Qué hace: El estudiante guarda y verifica el correo de su acudiente con un código de 6 dígitos.
   Por qué: Así el acudiente solo ve la agenda si un estudiante lo autorizó y confirmó que el correo es real.
   Paso "enviar": manda el código al correo del acudiente; el correo queda guardado SIN verificar.
   Paso "verificar": se escribe el código que recibió el acudiente; si es correcto, el correo queda verificado.
   Paso "quitar": borra el correo del acudiente.
   ========================================================= */

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php (conexión, sesión y funciones como filas(), responder() y fallar()).
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Cargar las herramientas de correo ----------
   Qué hace: Trae correo_lib.php: enviar correos y crear y revisar códigos de 6 dígitos.
   Por qué: Es lo que permite confirmar correos. */
require __DIR__ . '/correo_lib.php';

/* ---------- Solo POST y sesión ----------
   Qué hace: Rechaza otros tipos de petición y exige sesión iniciada. */
solo_post();
exigir_sesion();

/* ---------- Solo estudiantes ----------
   Qué hace: Si no es estudiante, responde 403.
   Por qué: Solo el estudiante decide quién es su acudiente. */
if ($_SESSION['rol'] !== 'estudiante') {
    fallar('Solo los estudiantes pueden agregar el correo de su acudiente.', 403);
}

/* ---------- Datos de la petición ----------
   Qué hace: Toma el código del estudiante y el paso pedido. */
$estudiante = (int)$_SESSION['codigo'];
$d = entrada();
$paso = (string)($d['paso'] ?? '');

/* ---------- Leer la cuenta del estudiante ----------
   Qué hace: Trae su nombre, su correo y el correo del acudiente (si ya hay).
   Por qué: Se necesita para comparar y para escribir el correo. */
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

/* ---------- Tipo de código ----------
   Qué hace: Nombre que identifica los códigos de este estudiante.
   Por qué: Cada estudiante tiene su propio código pendiente. */
$tipo = 'acu' . $estudiante;      // cada estudiante tiene su propio código pendiente
if (strlen($tipo) > 12) {
    fallar('No se pudo procesar tu cuenta.', 500);
}

/* ---------- Paso 1: guardar el correo y mandar el código ----------
   Qué hace: Revisa el correo, lo guarda sin verificar y manda el código al acudiente. */
if ($paso === 'enviar') {
    $correo = trim((string)($d['correo'] ?? ''));

    /* ---------- Revisar el correo ----------
       Qué hace: Comprueba que sea un correo válido de máximo 120 letras.
       Por qué: Evita mandar correos a direcciones mal escritas. */
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        fallar('Escribe un correo válido para tu acudiente (ej. nombre@gmail.com).');
    }
    if (strcasecmp($correo, (string)$yo['correo']) === 0) {
        fallar('El correo del acudiente debe ser distinto al tuyo.');
    }

    /* ---------- Que no pertenezca a otra cuenta ----------
       Qué hace: Revisa que ese correo no sea de un administrador, profesor o estudiante.
       Por qué: Un acudiente no puede usar el correo de otra cuenta del colegio. */
    foreach (['admin', 'profesor', 'estudiante'] as $rol) {
        list($tabla, $p) = ROLES[$rol];
        if (filas($conexion, "SELECT {$p}_codigo FROM {$tabla} WHERE {$p}_correo = ? LIMIT 1", 's', [$correo])) {
            fallar('Ese correo ya pertenece a otra cuenta del colegio. Usa otro correo para tu acudiente.', 409);
        }
    }

    /* ---------- Si ya está verificado ----------
       Qué hace: Si es el mismo correo y ya estaba verificado, responde que ya está listo.
       Por qué: No hace falta mandar otro código. */
    if ($yo['acu'] !== null && strcasecmp($correo, (string)$yo['acu']) === 0 && !empty($yo['ver'])) {
        responder(['ok' => true, 'yaVerificado' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
    }

    /* ---------- Crear el código ----------
       Qué hace: Genera el código de 6 dígitos y lo guarda cifrado.
       Por qué: Solo el acudiente que recibe el correo lo conoce. */
    list($idCodigo, $codigo) = crear_codigo($conexion, $correo, $tipo, ['estudiante' => $estudiante]);

    /* ---------- Armar y enviar el correo ----------
       Qué hace: Escribe el correo con el nombre del estudiante y lo envía; si falla, borra el código.
       Por qué: Así el acudiente sabe quién lo registró. */
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

    /* ---------- Guardar sin verificar ----------
       Qué hace: Guarda el correo del acudiente con "verificado = 0".
       Por qué: No cuenta hasta que se escriba el código. */
    // Queda guardado sin verificar hasta que se escriba el código
    if (!ejecutar($conexion, 'UPDATE estudiantes SET est_acu_correo = ?, est_acu_verificado = 0 WHERE est_codigo = ?', 'si', [$correo, $estudiante])) {
        borrar_codigo_id($conexion, $idCodigo);
        fallar('No se pudo guardar el correo.', 500);
    }

    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
}

/* ---------- Paso 2: escribir el código ----------
   Qué hace: Revisa el código; si es correcto, marca el correo como verificado. */
if ($paso === 'verificar') {
    $correo = trim((string)($yo['acu'] ?? ''));
    if ($correo === '') {
        fallar('Primero escribe el correo de tu acudiente y pulsa Verificar.');
    }

    /* ---------- Revisar el código ----------
       Qué hace: Compara con el código guardado y confirma que sea de este estudiante.
       Por qué: Así un código de otro estudiante no sirve. */
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

/* ---------- Quitar el correo del acudiente ----------
   Qué hace: Borra el correo y sus códigos pendientes.
   Por qué: El acudiente deja de ver la agenda. */
if ($paso === 'quitar') {
    if (!ejecutar($conexion, 'UPDATE estudiantes SET est_acu_correo = NULL, est_acu_verificado = 0 WHERE est_codigo = ?', 'i', [$estudiante])) {
        fallar('No se pudo quitar el correo.', 500);
    }
    if (!empty($yo['acu'])) {
        borrar_codigos($conexion, (string)$yo['acu'], $tipo);
    }
    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, 'estudiante', $estudiante)]);
}

/* ---------- Paso desconocido ----------
   Qué hace: Si el paso no es ninguno de los anteriores, responde con error. */
fallar('Paso no válido.');