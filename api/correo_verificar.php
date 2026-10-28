<?php
/* =========================================================
   VERIFICAR MI CORREO
   Qué hace: Cada persona verifica su propio correo con un código de 6 dígitos desde Mi perfil.
   Por qué: Así se sabe que el correo de la cuenta es de verdad de quien la usa.
   Paso "enviar": manda el código al correo de su cuenta.
   Paso "verificar": se escribe el código; si es correcto, el correo queda verificado.
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

$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

/* ---------- Qué cuenta es ----------
   Qué hace: Busca la tabla de la cuenta según el rol.
   Por qué: Cada rol tiene su tabla. */
list($tabla, $p) = ROLES[$rol];

/* ---------- Datos recibidos ----------
   Qué hace: Lee los datos enviados y el paso pedido. */
$d = entrada();
$paso = (string)($d['paso'] ?? '');

/* ---------- Leer la cuenta ----------
   Qué hace: Trae el nombre, el correo y si ya está verificado. */
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

/* ---------- Tipo de código ----------
   Qué hace: Nombre que identifica los códigos de esta cuenta.
   Por qué: Cada cuenta tiene su propio código pendiente. */
$tipo = 'v' . $p . $codigo;
if (strlen($tipo) > 12) {
    fallar('No se pudo procesar tu cuenta.', 500);
}

/* ---------- Si ya está verificado ----------
   Qué hace: Responde que ya está listo y no hace nada más.
   Por qué: No hay que mandar otro código. */
if (!empty($yo['ver'])) {
    responder(['ok' => true, 'yaVerificado' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);
}

/* ---------- Paso 1: mandar el código ----------
   Qué hace: Crea el código y lo envía al correo de la cuenta; si el envío falla, lo borra. */
if ($paso === 'enviar') {

    /* ---------- Crear y enviar ----------
       Qué hace: Guarda quién pidió el código y manda el correo. */
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

/* ---------- Paso 2: escribir el código ----------
   Qué hace: Revisa el código; si es correcto marca el correo como verificado. */
if ($paso === 'verificar') {

    /* ---------- Revisar el código ----------
       Qué hace: Comprueba que sea el código y que corresponda a esta cuenta.
       Por qué: Así un código de otra persona no sirve. */
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

/* ---------- Paso desconocido ----------
   Qué hace: Si el paso no es ninguno de los anteriores, responde con error. */
fallar('Paso no válido.');