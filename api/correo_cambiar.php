<?php
/* =========================================================
   CAMBIAR MI CORREO
   Qué hace: Permite cambiar el propio correo desde Mi perfil. El correo nuevo solo se guarda cuando la persona demuestra que es suyo escribiendo el código de 6 dígitos que le llegó.
   Por qué: Mientras tanto el correo viejo sigue funcionando; así nadie se queda sin acceso ni pone un correo ajeno.
   Paso "enviar" ({correo, clave}): revisa la contraseña actual y manda el código al correo NUEVO.
   Paso "verificar" ({codigo}): si es correcto, el correo cambia y queda verificado.
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

/* ---------- Quién es la persona ----------
   Qué hace: Toma el rol y el código de la sesión. */
$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

/* ---------- Que sea una cuenta válida ----------
   Qué hace: El administrador no usa correo y cualquier rol desconocido se rechaza. */
if ($rol === 'admin') {
    fallar('La cuenta de administrador no usa correo.', 403);
}
if (!isset(ROLES[$rol])) {
    fallar('Cuenta no válida.', 403);
}

/* ---------- Tabla de la cuenta ----------
   Qué hace: Busca en qué tabla vive esa cuenta.
   Por qué: Cada rol tiene su tabla. */
list($tabla, $p) = ROLES[$rol];

/* ---------- Datos recibidos ----------
   Qué hace: Lee los datos enviados y el paso pedido. */
$d = entrada();
$paso = (string)($d['paso'] ?? '');

/* ---------- Leer la cuenta ----------
   Qué hace: Trae el nombre, el correo actual y la contraseña cifrada. */
$f = filas(
    $conexion,
    "SELECT {$p}_nombre AS nombre, {$p}_correo AS correo, {$p}_clave AS clave FROM {$tabla} WHERE {$p}_codigo = ?",
    'i',
    [$codigo]
);
if (!$f) {
    fallar('No se pudo leer tu cuenta.', 500);
}
$yo = $f[0];
$viejo = (string)$yo['correo'];

/* ---------- Tipo de código ----------
   Qué hace: Nombre que identifica los códigos de esta cuenta.
   Por qué: Cada cuenta tiene su propio código pendiente. */
$tipo = 'c' . $p . $codigo;          // cada cuenta tiene su propio código pendiente
if (strlen($tipo) > 12) {
    fallar('No se pudo procesar tu cuenta.', 500);
}

/* ---------- ¿Está ocupado el correo? ----------
   Qué hace: Revisa que ningún otro usuario (ni un estudiante como correo de acudiente) tenga ese correo.
   Por qué: Un correo debe pertenecer a una sola cuenta. */
// ¿Alguien más usa ese correo? (cualquier tipo de cuenta, o como correo de acudiente de un estudiante)
function correo_ocupado($conexion, $correo, $rol, $codigo) {
    if (ya_existe_otro($conexion, 'correo', $correo, $rol, $codigo)) {
        return true;
    }
    // un correo de acudiente ya verificado/registrado por un estudiante no puede ser de otra cuenta,
    // salvo que quien lo cambie sea justamente un acudiente (que demuestra con el código que es suyo)
    if ($rol !== 'acudiente' && filas($conexion, 'SELECT est_codigo FROM estudiantes WHERE est_acu_correo = ? LIMIT 1', 's', [$correo])) {
        return true;
    }
    return false;
}

/* ---------- Paso 1: contraseña actual y correo nuevo ----------
   Qué hace: Revisa todo y manda el código al correo nuevo. */
if ($paso === 'enviar') {
    $nuevo = trim((string)($d['correo'] ?? ''));
    $clave = (string)($d['clave'] ?? '');

    /* ---------- Revisar el correo y la clave ----------
       Qué hace: Comprueba que el correo sea válido y que se haya escrito la contraseña. */
    if (!filter_var($nuevo, FILTER_VALIDATE_EMAIL) || strlen($nuevo) > 120) {
        fallar('Escribe un correo válido (ej. nombre@gmail.com).');
    }
    if ($clave === '') {
        fallar('Escribe tu contraseña actual para cambiar el correo.');
    }

    /* ---------- Límite de intentos ----------
       Qué hace: Si hubo 5 intentos fallidos en 10 minutos, bloquea un rato; si la contraseña es incorrecta, anota el intento.
       Por qué: Evita adivinar la contraseña a fuerza de probar. */
    // Límite de intentos con la contraseña (se guarda en la base de datos)
    $ip  = substr((string)($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 45);
    $cta = 'cc:' . $p . $codigo;
    $n = filas($conexion, 'SELECT COUNT(*) AS n FROM intentos_login WHERE int_clave = ? AND int_tiempo > ?', 'si', [$cta, time() - 600]);
    if ($n && (int)$n[0]['n'] >= 5) {
        fallar('Demasiados intentos con la contraseña. Espera unos minutos.', 429);
    }
    if (!password_verify($clave, (string)$yo['clave'])) {
        ejecutar($conexion, 'INSERT INTO intentos_login (int_ip, int_clave, int_tiempo) VALUES (?, ?, ?)', 'ssi', [$ip, $cta, time()]);
        usleep(500000);
        fallar('La contraseña no es correcta.', 401);
    }

    /* ---------- Que sea distinto ----------
       Qué hace: No permite poner el mismo correo que ya tiene. */
    if (strcasecmp($nuevo, $viejo) === 0) {
        fallar('Ese ya es tu correo actual.');
    }
    if (correo_ocupado($conexion, $nuevo, $rol, $codigo)) {
        fallar('Ese correo ya está registrado en otra cuenta.', 409);
    }

    /* ---------- Límite de códigos ----------
       Qué hace: Máximo 5 códigos por hora para cambiar de correo.
       Por qué: Evita que alguien use la página para mandar correos a cualquiera. */
    // No más de 5 códigos por hora para cambiar de correo (evita mandar correos a cualquiera)
    $h = filas($conexion, 'SELECT COUNT(*) AS n FROM codigos_correo WHERE cod_tipo = ? AND cod_creado > ?', 'si', [$tipo, time() - 3600]);
    if ($h && (int)$h[0]['n'] >= 5) {
        fallar('Pediste muchos códigos. Intenta de nuevo en una hora.', 429);
    }

    /* ---------- Crear el código ----------
       Qué hace: Genera el código y guarda junto a él quién lo pidió y el correo nuevo.
       Por qué: Así el servidor no confía en lo que diga el navegador. */
    list($idCodigo, $cod) = crear_codigo($conexion, $nuevo, $tipo, ['rol' => $rol, 'codigo' => $codigo, 'nuevo' => $nuevo]);

    /* ---------- Enviar el correo ----------
       Qué hace: Arma el correo con el código y lo manda al correo NUEVO; si falla, borra el código.
       Por qué: El código llega al correo nuevo para probar que es de la persona. */
    $html = plantilla_codigo(
        'Confirma tu nuevo correo',
        (string)$yo['nombre'],
        'Pediste cambiar el correo de tu cuenta de A.D.E. a este. Escribe este código en la página para confirmarlo.',
        $cod
    );
    if (!enviar_correo($nuevo, (string)$yo['nombre'], 'Confirma tu nuevo correo - A.D.E.', $html)) {
        borrar_codigo_id($conexion, $idCodigo);
        fallar('No pudimos enviar el correo. Revisa que esté bien escrito e intenta de nuevo.', 502);
    }

    /* ---------- Limpiar los intentos ----------
       Qué hace: Borra los intentos fallidos anotados.
       Por qué: Ya se demostró que sabe la contraseña. */
    ejecutar($conexion, 'DELETE FROM intentos_login WHERE int_clave = ?', 's', [$cta]);
    responder(['ok' => true]);
}

/* ---------- Paso 2: escribir el código ----------
   Qué hace: Revisa el código y cambia el correo. */
if ($paso === 'verificar') {

    /* ---------- Correo pendiente ----------
       Qué hace: Toma el correo nuevo del último código enviado a esta cuenta.
       Por qué: No se confía en el correo que mande el navegador. */
    // El correo nuevo es el del último código que se mandó para esta cuenta (no se confía en el navegador)
    $u = filas($conexion, 'SELECT cod_correo AS correo FROM codigos_correo WHERE cod_tipo = ? ORDER BY cod_codigo DESC LIMIT 1', 's', [$tipo]);
    if (!$u) {
        fallar('No hay un cambio de correo pendiente. Empieza de nuevo.', 410);
    }
    $nuevo = (string)$u[0]['correo'];

    /* ---------- Revisar el código ----------
       Qué hace: Comprueba el código y que corresponda a esta cuenta y a ese correo. */
    $v = verificar_codigo($conexion, $nuevo, $tipo, $d['codigo'] ?? '');
    $datos = $v['datos'];
    if (!is_array($datos) || (string)($datos['rol'] ?? '') !== $rol || (int)($datos['codigo'] ?? 0) !== $codigo || strcasecmp((string)($datos['nuevo'] ?? ''), $nuevo) !== 0) {
        fallar('Ese código no corresponde a tu cuenta. Pide uno nuevo.', 410);
    }

    /* ---------- Revisar de nuevo ----------
       Qué hace: Confirma otra vez que nadie más tomó ese correo.
       Por qué: Pudo pasar mientras se esperaba el código. */
    // Por si en estos minutos alguien más se quedó con ese correo
    if (correo_ocupado($conexion, $nuevo, $rol, $codigo)) {
        borrar_codigos($conexion, $nuevo, $tipo);
        fallar('Ese correo ya fue registrado en otra cuenta.', 409);
    }

    /* ---------- Guardar el cambio ----------
       Qué hace: Cambia el correo y lo marca como verificado, todo como una sola operación.
       Por qué: Si algo falla se deshace todo y no queda a medias. */
    $conexion->begin_transaction();
    $ok = ejecutar($conexion, "UPDATE {$tabla} SET {$p}_correo = ?, {$p}_correo_verificado = 1 WHERE {$p}_codigo = ?", 'si', [$nuevo, $codigo]);

    /* ---------- Enlace del acudiente ----------
       Qué hace: Si es un acudiente, actualiza el correo ligado a sus hijos.
       Por qué: Un acudiente se une a sus hijos por el correo. */
    // El acudiente se enlaza con sus hijos por el correo: al cambiarlo se actualiza el enlace ya verificado
    if ($ok && $rol === 'acudiente') {
        $ok = ejecutar($conexion, 'UPDATE estudiantes SET est_acu_correo = ? WHERE est_acu_correo = ? AND est_acu_verificado = 1', 'ss', [$nuevo, $viejo]);
    }

    if (!$ok) {
        $conexion->rollback();
        fallar('No se pudo cambiar el correo. Intenta de nuevo.', 500);
    }
    $conexion->commit();
    borrar_codigos($conexion, $nuevo, $tipo);

    /* ---------- Aviso al correo anterior ----------
       Qué hace: Manda un aviso al correo viejo diciendo que se cambió.
       Por qué: Si no fue la persona, se entera. */
    // Aviso al correo anterior (si no fue la persona, se entera). Si falla el envío, no importa.
    $n = htmlspecialchars((string)$yo['nombre'], ENT_QUOTES, 'UTF-8');
    $nv = htmlspecialchars($nuevo, ENT_QUOTES, 'UTF-8');
    @enviar_correo(
        $viejo,
        (string)$yo['nombre'],
        'Cambiaron el correo de tu cuenta - A.D.E.',
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222">'
        . '<p>Hola, <b>' . $n . '</b>.</p>'
        . '<p>El correo de tu cuenta de A.D.E. se cambió a <b>' . $nv . '</b>.</p>'
        . '<p>Si fuiste tú, no tienes que hacer nada. Si no fuiste tú, avísale cuanto antes al administrador del colegio.</p></div>'
    );

    responder(['ok' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);
}

/* ---------- Paso desconocido ----------
   Qué hace: Si el paso no es ninguno de los anteriores, responde con error. */
fallar('Paso no válido.');