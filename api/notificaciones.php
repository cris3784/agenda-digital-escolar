<?php
/* =========================================================
   LISTA DE NOTIFICACIONES
   Qué hace: Devuelve las notificaciones que le corresponden a quien tiene la sesión, indicando cuáles ya leyó.
   Por qué: Es lo que muestra la campana de avisos; cada rol recibe solo lo suyo.
   ========================================================= */

// Lista de notificaciones de la cuenta (con cuáles ya leyó).

/* ---------- Cargar las herramientas y exigir sesión ----------
   Qué hace: Trae notificaciones_lib.php y pide sesión iniciada.
   Por qué: Las notificaciones son personales. */
require __DIR__ . '/notificaciones_lib.php';
exigir_sesion();

/* ---------- Traer las que puede ver ----------
   Qué hace: Averigua quién es la persona y pide todas las notificaciones que le corresponden.
   Por qué: El filtro por rol y por grupo ya está resuelto en la librería. */
$c = contexto($conexion);
$vis = notificaciones_visibles($conexion, $c);

/* ---------- Juntar los grupos de cada lote ----------
   Qué hace: Para los avisos publicados a varios grupos a la vez, anota qué grupos tuvo cada lote.
   Por qué: Un aviso así se muestra una sola vez, indicando todos sus grupos. */
// Un aviso que se publicó para varios grupos se muestra una sola vez
$gruposDeLote = [];
foreach ($vis as $n) {
    $l = (string)$n['not_lote'];
    if ($l !== '' && $n['not_gru_grupo'] !== null) {
        $gruposDeLote[$l][] = $n['not_gru_grupo'];
    }
}

/* ---------- Quitar los repetidos ----------
   Qué hace: Se queda con una sola notificación por lote y limita la lista a 40.
   Por qué: Evita mostrar el mismo aviso varias veces y mantiene la respuesta liviana. */
$reps = [];
$vistos = [];
foreach ($vis as $n) {
    $l = (string)$n['not_lote'];
    if ($l !== '') {
        if (isset($vistos[$l])) {
            continue;
        }
        $vistos[$l] = true;
    }
    $reps[] = $n;
}
$reps = array_slice($reps, 0, 40);

/* ---------- Saber cuáles ya leyó ----------
   Qué hace: Consulta, con una sola pregunta, cuáles de esas notificaciones ya tienen una lectura de esta cuenta.
   Por qué: Así la página puede marcar como "nuevas" solo las que faltan por leer. */
$leidas = [];
if ($reps) {
    $ids = [];
    foreach ($reps as $n) {
        $ids[] = (int)$n['not_codigo'];
    }
    $col = columna_lectura($c['rol']);
    $f = filas(
        $conexion,
        'SELECT lec_not_notificacion AS n FROM lecturas WHERE lec_not_notificacion IN (' . implode(',', $ids) . ") AND {$col} = ?",
        'i',
        [$c['codigo']]
    );
    foreach ($f as $x) {
        $leidas[(int)$x['n']] = true;
    }
}

/* ---------- Armar la respuesta ----------
   Qué hace: Convierte cada notificación a la forma que lee el JavaScript de la página (tipo, título, texto, grupos, página, autor, fecha y si ya fue leída).
   Por qué: La página espera esos nombres de campo, no los de la base de datos. */
$salida = [];
foreach ($reps as $n) {
    $l = (string)$n['not_lote'];
    if ($l !== '') {
        $grupos = array_values(array_unique($gruposDeLote[$l] ?? []));
        $grupos = $grupos ? $grupos : null;
    } else {
        $grupos = $n['not_gru_grupo'] !== null ? [$n['not_gru_grupo']] : null;
    }
    $salida[] = [
        'id'     => (string)(int)$n['not_codigo'],
        'type'   => (string)$n['not_tipo'],
        'title'  => (string)$n['not_titulo'],
        'text'   => (string)$n['not_texto'],
        'groups' => $grupos,
        'page'   => (string)$n['not_pagina'],
        'to'     => '',
        'by'     => '',
        'byName' => (string)$n['not_autor_nombre'],
        'role'   => (string)$n['not_autor_rol'],
        'date'   => date('c', strtotime($n['not_creada'])),
        'read'   => isset($leidas[(int)$n['not_codigo']])
    ];
}

/* ---------- Responder ----------
   Qué hace: Manda la lista en formato JSON. */
responder(['ok' => true, 'notificaciones' => $salida]);