<?php
/* =========================================================
   Correos y códigos de 6 dígitos (A.D.E.)
   - enviar_correo(): manda un correo con la API de Brevo (datos en correo_config.php)
   - crear_codigo() / verificar_codigo(): códigos de un solo uso guardados en la tabla codigos_correo
   ========================================================= */
require_once __DIR__ . '/util.php';

const CODIGO_VIDA     = 600;   // el código dura 10 minutos
const CODIGO_INTENTOS = 5;     // intentos por código
const CODIGO_ESPERA   = 60;    // segundos entre un código y el siguiente
const CODIGO_POR_HORA = 5;     // códigos por hora para el mismo correo
const SITIO_URL       = 'https://agendaescolardigital.infinityfreeapp.com';


/* ---------- Enviar un correo por Brevo ---------- */

function enviar_correo($para, $nombre, $asunto, $html) {
    if (!is_file(__DIR__ . '/correo_config.php')) {
        error_log('ADE: falta api/correo_config.php');
        return false;
    }
    require_once __DIR__ . '/correo_config.php';

    if (!function_exists('curl_init')) {
        error_log('ADE: el hosting no tiene cURL');
        return false;
    }

    $datos = [
        'sender'      => ['name' => NOMBRE_REMITENTE, 'email' => CORREO_REMITENTE],
        'to'          => [['email' => $para, 'name' => $nombre !== '' ? $nombre : $para]],
        'subject'     => $asunto,
        'htmlContent' => $html
    ];

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

    if ($codigo !== 201) {
        error_log('ADE: Brevo respondió ' . $codigo . ' ' . $error . ' ' . $respuesta);
        return false;
    }
    return true;
}


/* ---------- Diseño del correo (verde y azul oscuro, como la página) ---------- */

function plantilla_codigo($titulo, $nombre, $texto, $codigo) {
    $t = htmlspecialchars($titulo, ENT_QUOTES, 'UTF-8');
    $n = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
    $x = htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
    $c = htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8');
    $logo = SITIO_URL . '/img/logo-ade.png';
    $min = (int)(CODIGO_VIDA / 60);

    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    . '<body style="margin:0;padding:0;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f1;padding:28px 12px;"><tr><td align="center">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;">'

    . '<tr><td align="center" style="background:#0b2a4a;padding:26px 20px 22px;border-bottom:4px solid #23a05a;">'
    . '<img src="' . $logo . '" alt="A.D.E." width="110" style="display:block;margin:0 auto 10px;border:0;">'
    . '<div style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:.3px;">Agenda Digital Escolar</div>'
    . '</td></tr>'

    . '<tr><td style="padding:30px 30px 8px;color:#10213a;">'
    . '<h1 style="margin:0 0 14px;font-size:22px;color:#0b2a4a;">' . $t . '</h1>'
    . '<p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Hola' . ($n !== '' ? ', <b>' . $n . '</b>' : '') . '.</p>'
    . '<p style="margin:0 0 20px;font-size:15px;line-height:1.5;">' . $x . '</p>'
    . '</td></tr>'

    . '<tr><td align="center" style="padding:0 30px 8px;">'
    . '<div style="display:inline-block;background:#f0faf4;border:2px solid #23a05a;border-radius:14px;padding:16px 28px;">'
    . '<span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0b2a4a;font-family:Arial,Helvetica,sans-serif;">' . $c . '</span>'
    . '</div>'
    . '</td></tr>'

    . '<tr><td style="padding:18px 30px 28px;color:#4a5a73;font-size:13px;line-height:1.6;">'
    . '<p style="margin:0 0 10px;">Este código vence en <b>' . $min . ' minutos</b> y solo sirve una vez.</p>'
    . '<p style="margin:0 0 10px;"><b>No lo compartas con nadie.</b> El equipo de A.D.E. nunca te lo pedirá.</p>'
    . '<p style="margin:0;">Si no fuiste tú, ignora este correo: nadie podrá entrar a tu cuenta sin el código.</p>'
    . '</td></tr>'

    . '<tr><td align="center" style="background:#f4f7f6;padding:16px;color:#7a889c;font-size:12px;">A.D.E. · Agenda Digital Escolar</td></tr>'
    . '</table></td></tr></table></body></html>';
}


/* ---------- Códigos de un solo uso ---------- */

// Crea un código nuevo para ese correo. $datos se guarda junto al código (por ejemplo, la cuenta pendiente).
// Devuelve [id, codigo]. Si piden códigos muy seguido, responde con error.
function crear_codigo($conexion, $correo, $tipo, $datos = null) {
    $ahora = time();

    ejecutar($conexion, 'DELETE FROM codigos_correo WHERE cod_creado < ?', 'i', [$ahora - 86400]);

    $f = filas(
        $conexion,
        'SELECT COUNT(*) AS n, MAX(cod_creado) AS ultimo FROM codigos_correo WHERE cod_correo = ? AND cod_tipo = ? AND cod_creado > ?',
        'ssi',
        [$correo, $tipo, $ahora - 3600]
    );
    $n      = $f ? (int)$f[0]['n'] : 0;
    $ultimo = $f ? (int)$f[0]['ultimo'] : 0;

    if ($ultimo && $ahora - $ultimo < CODIGO_ESPERA) {
        fallar('Espera ' . (CODIGO_ESPERA - ($ahora - $ultimo)) . ' segundos antes de pedir otro código.', 429);
    }
    if ($n >= CODIGO_POR_HORA) {
        fallar('Pediste muchos códigos. Intenta de nuevo en una hora.', 429);
    }

    // los códigos anteriores de este correo dejan de servir
    ejecutar($conexion, 'UPDATE codigos_correo SET cod_expira = 0 WHERE cod_correo = ? AND cod_tipo = ?', 'ss', [$correo, $tipo]);

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

function borrar_codigos($conexion, $correo, $tipo) {
    ejecutar($conexion, 'DELETE FROM codigos_correo WHERE cod_correo = ? AND cod_tipo = ?', 'ss', [$correo, $tipo]);
}

function borrar_codigo_id($conexion, $id) {
    ejecutar($conexion, 'DELETE FROM codigos_correo WHERE cod_codigo = ?', 'i', [$id]);
}
