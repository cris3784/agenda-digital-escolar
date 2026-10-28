<?php
/* =========================================================
   MARCAR NOTIFICACIONES COMO LEÍDAS
   Qué hace: Marca como leídas algunas notificaciones (por su código) o todas las de la cuenta.
   Por qué: Así la campana de avisos deja de mostrar como nuevo lo que la persona ya vio.
   ========================================================= */

// Marcar notificaciones como leídas (algunas por su código, o todas).

/* ---------- Cargar las herramientas, exigir POST y sesión ----------
   Qué hace: Trae notificaciones_lib.php, acepta solo POST y pide sesión iniciada.
   Por qué: Las lecturas son de cada persona, así que hay que saber quién es. */
require __DIR__ . '/notificaciones_lib.php';
solo_post();
exigir_sesion();

/* ---------- Quién es la persona y qué pidió ----------
   Qué hace: Saca el rol y el código de quien tiene la sesión y lee los datos enviados.
   Por qué: Con eso se decide qué notificaciones puede marcar. */
$c = contexto($conexion);
$d = entrada();

/* ---------- Marcar todas ----------
   Qué hace: Si la página pidió "todas", recorre las notificaciones que esta cuenta puede ver y las marca una por una.
   Por qué: Es el botón "marcar todas como leídas". */
if (!empty($d['todas'])) {
    foreach (notificaciones_visibles($conexion, $c) as $n) {
        marcar_leida($conexion, $c, (int)$n['not_codigo']);
    }
    responder(['ok' => true]);
}

/* ---------- Marcar algunas ----------
   Qué hace: Toma hasta 50 códigos, descarta los inválidos y, solo para los que la cuenta puede ver, marca esa notificación y las de su mismo aviso (mismo lote).
   Por qué: Nadie debe poder marcar notificaciones ajenas, y un aviso publicado para varios grupos cuenta como uno solo. */
$ids = is_array($d['ids'] ?? null) ? $d['ids'] : [];
$vis = null;
foreach (array_slice($ids, 0, 50) as $id) {
    $id = (int)$id;
    if ($id < 1) {
        continue;
    }
    if ($vis === null) {
        $vis = notificaciones_visibles($conexion, $c);
    }
    // Solo se marcan las que esta cuenta puede ver (y las de su mismo aviso)
    $lote = null;
    $puede = false;
    foreach ($vis as $n) {
        if ((int)$n['not_codigo'] === $id) {
            $puede = true;
            $lote = (string)$n['not_lote'];
            break;
        }
    }
    if (!$puede) {
        continue;
    }
    foreach ($vis as $n) {
        if ((int)$n['not_codigo'] === $id || ($lote !== '' && (string)$n['not_lote'] === $lote)) {
            marcar_leida($conexion, $c, (int)$n['not_codigo']);
        }
    }
}

/* ---------- Responder ----------
   Qué hace: Avisa que todo salió bien. */
responder(['ok' => true]);