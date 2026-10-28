<?php
/* =========================================================
   CORREOS Y CÓDIGOS DE 6 DÍGITOS (A.D.E.)
   Qué hace: Manda correos con Brevo y maneja los códigos de un solo uso (crearlos, revisarlos y borrarlos).
   Por qué: Los códigos confirman que un correo es de la persona (registro, recuperar contraseña, cambiar correo, acudiente). Se guardan cifrados en la tabla codigos_correo.
   enviar_correo(): manda un correo con la API de Brevo (datos en correo_config.php).
   crear_codigo() / verificar_codigo(): códigos de un solo uso.
   ========================================================= */

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae util.php (conexión, sesión y funciones comunes). */
require_once __DIR__ . '/util.php';

/* ---------- Reglas de los códigos ----------
   Qué hace: El código dura 10 minutos, tiene 5 intentos, hay que esperar 60 segundos entre uno y otro, y máximo 5 por hora por correo. SITIO_URL es la dirección de la página.
   Por qué: Son los límites que protegen contra adivinar códigos o llenar de correos a alguien. Se cambian aquí. */
const CODIGO_VIDA     = 600;   // el código dura 10 minutos
const CODIGO_INTENTOS = 5;     // intentos por código
const CODIGO_ESPERA   = 60;    // segundos entre un código y el siguiente
const CODIGO_POR_HORA = 5;     // códigos por hora para el mismo correo
const SITIO_URL       = 'https://agendadigitalescolar.free.nf';


/* ---------- Enviar un correo por Brevo ----------
   Qué hace: Funciones para mandar correos. */

/* ---------- Enviar un correo ----------
   Qué hace: Arma el mensaje y lo manda a la API de Brevo; devuelve verdadero si salió bien.
   Por qué: Los errores se anotan en el registro del servidor, no se muestran a la persona. */
function enviar_correo($para, $nombre, $asunto, $html) {

    /* ---------- Revisar que se pueda enviar ----------
       Qué hace: Comprueba que exista correo_config.php y que el hosting tenga cURL.
       Por qué: Sin eso no se puede hablar con Brevo. */
    if (!is_file(__DIR__ . '/correo_config.php')) {
        error_log('ADE: falta api/correo_config.php');
        return false;
    }
    require_once __DIR__ . '/correo_config.php';

    if (!function_exists('curl_init')) {
        error_log('ADE: el hosting no tiene cURL');
        return false;
    }

    /* ---------- Armar el mensaje ----------
       Qué hace: Remitente, destinatario, asunto y contenido HTML. */
    $datos = [
        'sender'      => ['name' => NOMBRE_REMITENTE, 'email' => CORREO_REMITENTE],
        'to'          => [['email' => $para, 'name' => $nombre !== '' ? $nombre : $para]],
        'subject'     => $asunto,
        'htmlContent' => $html
    ];

    /* ---------- Mandar a Brevo ----------
       Qué hace: Envía el mensaje con la clave de Brevo, con un máximo de 20 segundos de espera. */
    $c = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($c, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($datos, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => [
            'accept: application/json',
            'content-type: application/json',
            'api-key: ' . BREVO_CLAVE
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20
    ]);
    $respuesta = curl_exec($c);
    $codigo    = (int)curl_getinfo($c, CURLINFO_HTTP_CODE);
    $error     = curl_error($c);
    curl_close($c);

    /* ---------- ¿Salió bien? ----------
       Qué hace: Brevo responde 201 cuando acepta el correo; cualquier otra respuesta se anota como error. */
    if ($codigo !== 201) {
        error_log('ADE: Brevo respondió ' . $codigo . ' ' . $error . ' ' . $respuesta);
        return false;
    }
    return true;
}


/* ---------- Diseño del correo ----------
   Qué hace: Arma el correo azul con el logo A.D.E. dibujado con texto (sin imagen).
   Por qué: El hosting gratis muestra una página de seguridad a Gmail y el logo no cargaba; con texto se ve igual en todos los correos. */

/* ---------- Plantilla del correo con código ----------
   Qué hace: Recibe título, nombre, texto y código, y devuelve el correo listo.
   Por qué: Todos los correos con código se ven iguales. Los textos se limpian para que nadie meta código raro. */
function plantilla_codigo($titulo, $nombre, $texto, $codigo) {
    $t = htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8');
    $n = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
    $x = htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
    $c = htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8');
    $min = (int)(CODIGO_VIDA / 60);

    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>'
    . '<body style="margin:0;padding:0;background:#061a38;">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#061a38" style="background:#061a38;background-image:linear-gradient(160deg,#0b3470 0%,#061a38 55%,#030d1f 100%);padding:34px 12px;"><tr><td align="center">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0c2347" style="max-width:520px;background:#0c2347;border:1px solid #1f4378;border-radius:22px;overflow:hidden;">'

    // Encabezado con el logo dibujado con texto
    . '<tr><td align="center" bgcolor="#0f4c9a" style="background:#0f4c9a;background-image:linear-gradient(135deg,#1260c4 0%,#0a2f6b 100%);padding:30px 20px 24px;border-bottom:4px solid #23c16b;">'
    . '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px;"><tr>'
    . '<td align="center" bgcolor="#ffffff" style="background:#ffffff;border-radius:16px;padding:10px 22px;border-bottom:5px solid #23c16b;">'
    . '<span style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:900;letter-spacing:3px;color:#0b2a4a;">A.D.E.</span>'
    . '</td></tr></table>'
    . '<div style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;letter-spacing:.4px;">Agenda Digital Escolar</div>'
    . '<div style="color:#a9c9f5;font-family:Arial,Helvetica,sans-serif;font-size:12px;margin-top:5px;">Tu agenda escolar en un solo lugar</div>'
    . '</td></tr>'

    // Mensaje
    . '<tr><td style="padding:32px 32px 10px;font-family:Arial,Helvetica,sans-serif;color:#c9dcf7;">'
    . '<h1 style="margin:0 0 16px;font-size:23px;line-height:1.25;color:#ffffff;">' . $t . '</h1>'
    . '<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#dbe8ff;">Hola' . ($n !== '' ? ', <b style="color:#ffffff;">' . $n . '</b>' : '') . '.</p>'
    . '<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#c9dcf7;">' . $x . '</p>'
    . '</td></tr>'

    // Código
    . '<tr><td align="center" style="padding:0 32px 10px;">'
    . '<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>'
    . '<td align="center" bgcolor="#08183a" style="background:#08183a;border:2px solid #23c16b;border-radius:18px;padding:16px 32px 18px;">'
    . '<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#7fe0ad;margin-bottom:6px;">TU CÓDIGO</div>'
    . '<span style="font-family:Arial,Helvetica,sans-serif;font-size:38px;font-weight:bold;letter-spacing:11px;color:#ffffff;">' . $c . '</span>'
    . '</td></tr></table>'
    . '</td></tr>'

    // Avisos
    . '<tr><td style="padding:20px 32px 30px;font-family:Arial,Helvetica,sans-serif;color:#9db6d9;font-size:13px;line-height:1.65;">'
    . '<p style="margin:0 0 10px;">Este código vence en <b style="color:#ffffff;">' . $min . ' minutos</b> y solo sirve una vez.</p>'
    . '<p style="margin:0 0 10px;"><b style="color:#ffffff;">No lo compartas con nadie.</b> El equipo de A.D.E. nunca te lo pedirá.</p>'
    . '<p style="margin:0;">Si no fuiste tú, ignora este correo: nadie podrá entrar a tu cuenta sin el código.</p>'
    . '</td></tr>'

    . '<tr><td align="center" bgcolor="#081a37" style="background:#081a37;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#6f8bb5;font-size:12px;border-top:1px solid #1f4378;">A.D.E. · Agenda Digital Escolar</td></tr>'
    . '</table></td></tr></table></body></html>';
}


/* ---------- Códigos de un solo uso ----------
   Qué hace: Funciones para crear, revisar y borrar los códigos. */

/* ---------- Crear un código ----------
   Qué hace: Genera un código de 6 dígitos para ese correo y devuelve su número y el código.
   Por qué: Solo se guarda cifrado (hash); el código real solo viaja por el correo. */
// Crea un código nuevo para ese correo. $datos se guarda junto al código (por ejemplo, la cuenta pendiente).
// Devuelve [id, codigo]. Si piden códigos muy seguido, responde con error.
function crear_codigo($conexion, $correo, $tipo, $datos = null) {
    $ahora = time();

    /* ---------- Limpiar códigos viejos ----------
       Qué hace: Borra los códigos de más de 24 horas.
       Por qué: Para que la tabla no crezca sin fin. */
    ejecutar($conexion, 'DELETE FROM codigos_correo WHERE cod_creado < ?', 'i', [$ahora - 86400]);

    $f = filas(
        $conexion,
        'SELECT COUNT(*) AS n, MAX(cod_creado) AS ultimo FROM codigos_correo WHERE cod_correo = ? AND cod_tipo = ? AND cod_creado > ?',
        'ssi',
        [$correo, $tipo, $ahora - 3600]
    );
    $n      = $f ? (int)$f[0]['n'] : 0;
    $ultimo = $f ? (int)$f[0]['ultimo'] : 0;

    /* ---------- Límites ----------
       Qué hace: Si se pidió uno hace menos de 60 segundos o ya van 5 en una hora, responde con error 429.
       Por qué: Evita llenar de correos a una persona. */
    if ($ultimo && $ahora - $ultimo < CODIGO_ESPERA) {
        fallar('Espera ' . (CODIGO_ESPERA - ($ahora - $ultimo)) . ' segundos antes de pedir otro código.', 429);
    }
    if ($n >= CODIGO_POR_HORA) {
        fallar('Pediste muchos códigos. Intenta de nuevo en una hora.', 429);
    }

    // los códigos anteriores de este correo dejan de servir
    ejecutar($conexion, 'UPDATE codigos_correo SET cod_expira = 0 WHERE cod_correo = ? AND cod_tipo = ?', 'ss', [$correo, $tipo]);

    /* ---------- Generar y guardar ----------
       Qué hace: Crea el número al azar, lo cifra y lo guarda con su fecha de vencimiento.
       Por qué: Aunque alguien viera la base de datos, no vería los códigos. */
    $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hash   = password_hash($codigo, PASSWORD_DEFAULT);
    $json   = $datos === null ? null : (is_string($datos) ? $datos : json_encode($datos, JSON_UNESCAPED_UNICODE));
    $vence  = $ahora + CODIGO_VIDA;

    if (!ejecutar(
        $conexion,
        'INSERT INTO codigos_correo (cod_correo, cod_tipo, cod_hash, cod_datos, cod_intentos, cod_expira, cod_creado) VALUES (?, ?, ?, ?, 0, ?, ?)',
        'ssssii',
        [$correo, $tipo, $hash, $json, $vence, $ahora]
    )) {
        fallar('No se pudo generar el código. Intenta de nuevo.', 500);
    }

    return [(int)$conexion->insert_id, $codigo];
}

/* ---------- Revisar un código ----------
   Qué hace: Compara el código escrito con el guardado; revisa vencimiento y número de intentos.
   Por qué: Un código malo cuenta un intento y hace esperar un poco; con 5 intentos se bloquea. */
// Comprueba el código que escribió la persona. Si es correcto devuelve ['id' => ..., 'datos' => ...].
function verificar_codigo($conexion, $correo, $tipo, $codigo) {
    $f = filas(
        $conexion,
        'SELECT cod_codigo AS id, cod_hash AS h, cod_datos AS datos, cod_intentos AS intentos, cod_expira AS expira FROM codigos_correo WHERE cod_correo = ? AND cod_tipo = ? ORDER BY cod_codigo DESC LIMIT 1',
        'ss',
        [$correo, $tipo]
    );

    if (!$f || (int)$f[0]['expira'] < time()) {
        fallar('El código venció. Pide uno nuevo.', 410);
    }
    $fila = $f[0];

    if ((int)$fila['intentos'] >= CODIGO_INTENTOS) {
        fallar('Demasiados intentos con este código. Pide uno nuevo.', 429);
    }

    $codigo = trim((string)$codigo);
    if (!preg_match('/^\d{6}$/', $codigo) || !password_verify($codigo, $fila['h'])) {
        ejecutar($conexion, 'UPDATE codigos_correo SET cod_intentos = cod_intentos + 1 WHERE cod_codigo = ?', 'i', [(int)$fila['id']]);
        usleep(400000);
        $quedan = CODIGO_INTENTOS - ((int)$fila['intentos'] + 1);
        fallar($quedan > 0 ? 'El código no es correcto. Te quedan ' . $quedan . ' intentos.' : 'El código no es correcto. Pide uno nuevo.', 401);
    }

    return ['id' => (int)$fila['id'], 'datos' => $fila['datos'] === null ? null : json_decode($fila['datos'], true)];
}

/* ---------- Borrar códigos de un correo ----------
   Qué hace: Quita todos los códigos de ese correo y tipo.
   Por qué: Al usarse, un código no debe servir otra vez. */
function borrar_codigos($conexion, $correo, $tipo) {
    ejecutar($conexion, 'DELETE FROM codigos_correo WHERE cod_correo = ? AND cod_tipo = ?', 'ss', [$correo, $tipo]);
}

/* ---------- Borrar un código ----------
   Qué hace: Quita un código por su número.
   Por qué: Se usa si falló el envío del correo. */
function borrar_codigo_id($conexion, $id) {
    ejecutar($conexion, 'DELETE FROM codigos_correo WHERE cod_codigo = ?', 'i', [$id]);
}