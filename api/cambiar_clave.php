<?php
/* =========================================================
   CAMBIAR CONTRASEÑA
   Qué hace: Permite a quien tiene la sesión abierta cambiar su contraseña, pidiendo la actual.
   Por qué: Pedir la actual evita que alguien que encuentre una sesión abierta se apropie de la cuenta.
   ========================================================= */

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php (conexión, sesión y funciones como filas(), responder() y fallar()).
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Solo POST y sesión ----------
   Qué hace: Rechaza otros tipos de petición y exige sesión iniciada. */
solo_post();
exigir_sesion();

/* ---------- Datos recibidos ----------
   Qué hace: Lee la contraseña actual y la nueva. */
$d = entrada();
$actual = (string)($d['actual'] ?? '');
$nueva  = (string)($d['nueva'] ?? '');

/* ---------- Revisar la nueva ----------
   Qué hace: Debe tener entre 6 y 72 caracteres.
   Por qué: 72 es el máximo que cifra bien el método de contraseñas. */
if (strlen($nueva) < 6 || strlen($nueva) > 72) {
    fallar('La nueva contraseña debe tener entre 6 y 72 caracteres.');
}

/* ---------- Que sea distinta ----------
   Qué hace: No permite repetir la misma contraseña.
   Por qué: Si no, el cambio no serviría de nada. */
if ($nueva === $actual) {
    fallar('La nueva contraseña debe ser distinta a la actual.');
}

/* ---------- Qué cuenta es ----------
   Qué hace: Toma el rol y el código de la sesión y la tabla de esa cuenta.
   Por qué: Solo se puede cambiar la propia contraseña. */
$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];
list($tabla, $p) = ROLES[$rol];

/* ---------- Leer la contraseña guardada ----------
   Qué hace: Trae el cifrado (hash) de la contraseña actual.
   Por qué: Las contraseñas nunca se guardan en texto. */
$f = filas($conexion, "SELECT {$p}_clave AS clave FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);

/* ---------- Revisar la actual ----------
   Qué hace: Compara la contraseña actual escrita con la guardada; si no coincide, espera medio segundo y responde 401.
   Por qué: La espera hace más lento adivinar contraseñas. */
if (!$f || !password_verify($actual, $f[0]['clave'])) {
    usleep(500000);
    fallar('La contraseña actual no es correcta.', 401);
}

/* ---------- Guardar la nueva ----------
   Qué hace: La cifra y la guarda. */
$hash = password_hash($nueva, PASSWORD_DEFAULT);
$s = $conexion->prepare("UPDATE {$tabla} SET {$p}_clave = ? WHERE {$p}_codigo = ?");
$s->bind_param('si', $hash, $codigo);

if (!$s->execute()) {
    fallar('No se pudo cambiar la contraseña.', 500);
}

/* ---------- Responder ----------
   Qué hace: Avisa que todo salió bien. */
responder(['ok' => true]);