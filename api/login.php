<?php
/* =========================================================
   INICIO DE SESIÓN
   Qué hace: Recibe el usuario (o correo) y la contraseña, los comprueba y, si son correctos, abre la sesión de la persona.
   Por qué: Es la puerta de entrada de A.D.E.; aquí también se protege la cuenta contra quien intenta adivinar contraseñas.
   ========================================================= */

/* ---------- Cargar las herramientas y exigir POST ----------
   Qué hace: Trae util.php (base de datos, sesión y funciones comunes) y acepta solo peticiones POST.
   Por qué: Los datos de acceso nunca deben viajar por la dirección de la página (GET). */
require __DIR__ . '/util.php';
solo_post();

/* ---------- Leer lo que escribió la persona ----------
   Qué hace: Toma el usuario (o correo) y la contraseña; si falta alguno, responde con un aviso.
   Por qué: No tiene sentido consultar la base de datos con campos vacíos. */
$d = entrada();
$usuario = trim((string)($d['usuario'] ?? ''));
$clave   = (string)($d['clave'] ?? '');

if ($usuario === '' || $clave === '') {
    fallar('Ingresa tu usuario o correo y tu contraseña.');
}

/* ---------- Límite de intentos ----------
   Qué hace: Cuenta cuántos intentos fallidos hubo en los últimos 10 minutos desde la misma conexión (IP), para la misma cuenta, o ambas cosas a la vez. Si se pasa del límite, bloquea el intento.
   Por qué: Evita que alguien pruebe miles de contraseñas. Se guarda en la base de datos y no en la sesión, porque la sesión se puede borrar para saltarse el límite. */
// Límite de intentos: se guarda en la base de datos, no en la sesión
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

/* ---------- Buscar la cuenta en las 4 tablas ----------
   Qué hace: Arma una sola consulta que busca el usuario o correo en administradores, profesores, estudiantes y acudientes.
   Por qué: Cada rol vive en su propia tabla; con una sola consulta se evita hacer cuatro viajes a la base de datos. */
// Buscar la cuenta en las 4 tablas con UNA sola consulta
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

/* ---------- Cuenta o contraseña incorrectas ----------
   Qué hace: Si no existe la cuenta o la contraseña no coincide, anota el intento fallido, limpia los muy antiguos de vez en cuando, espera medio segundo y responde con un error.
   Por qué: El aviso es el mismo en ambos casos para no revelar si la cuenta existe, y la pausa hace más lento cualquier intento de adivinar. */
if (!$encontrado || !password_verify($clave, $encontrado['clave'])) {
    ejecutar($conexion, 'INSERT INTO intentos_login (int_ip, int_clave, int_tiempo) VALUES (?, ?, ?)', 'ssi', [$ip, $cta, time()]);
    if (mt_rand(1, 20) === 1) {
        ejecutar($conexion, 'DELETE FROM intentos_login WHERE int_tiempo < ?', 'i', [time() - 3600]);
    }
    usleep(500000);
    fallar('Usuario/correo o contraseña incorrectos.', 401);
}

/* ---------- Revisar si el profesor ya fue aprobado ----------
   Qué hace: Si la cuenta es de un profesor que está pendiente o fue rechazado, no lo deja entrar y le explica por qué.
   Por qué: Un administrador debe validar a cada profesor antes de que use el sistema. Se revisa después de comprobar la contraseña para no dar pistas a desconocidos. */
// La contraseña es correcta: recién ahora se revisa si el profesor ya fue aprobado
if ($encontrado['rol'] === 'profesor' && $encontrado['estado'] !== 'aprobado') {
    if ($encontrado['estado'] === 'rechazado') {
        fallar('Tu solicitud de profesor no fue aprobada. Comunícate con el colegio.', 403);
    }
    fallar('Tu cuenta de profesor está pendiente de aprobación. Un administrador debe validarla antes de que puedas entrar.', 403);
}

/* ---------- Limpiar los intentos fallidos ----------
   Qué hace: Borra los intentos fallidos de esta cuenta desde esta conexión.
   Por qué: Si la persona ya entró bien, sus errores anteriores no deben seguir sumando hacia el bloqueo. */
ejecutar($conexion, 'DELETE FROM intentos_login WHERE int_ip = ? AND int_clave = ?', 'ss', [$ip, $cta]);

/* ---------- Abrir la sesión ----------
   Qué hace: Cambia el identificador de la sesión, guarda quién es la persona (rol y código) y anota la hora de este ingreso.
   Por qué: Cambiar el identificador evita que alguien reutilice una sesión vieja; guardar el rol y el código es lo que permite saber después qué puede ver cada quien. */
session_regenerate_id(true);
$_SESSION = ['rol' => $encontrado['rol'], 'codigo' => (int)$encontrado['codigo']];
registrar_acceso($conexion, $encontrado['rol'], (int)$encontrado['codigo']);

/* ---------- Responder ----------
   Qué hace: Manda en formato JSON los datos de la persona que acaba de entrar.
   Por qué: Es lo que lee el JavaScript de la página para mostrar su perfil. */
responder([
    'ok'      => true,
    'usuario' => cargar_usuario($conexion, $encontrado['rol'], (int)$encontrado['codigo'])
]);