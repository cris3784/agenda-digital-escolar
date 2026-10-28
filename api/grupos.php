<?php
/* =========================================================
   LISTA DE GRUPOS
   Qué hace: Devuelve la lista de grupos del colegio (6-1 hasta 11-9), en orden.
   Por qué: El registro la necesita para ofrecer los grupos antes de que la persona inicie sesión, por eso no pide sesión.
   ========================================================= */

// Lista de grupos del colegio (6-1 ... 11-9). No necesita sesión: el registro la usa.

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php, que tiene lo que casi todos los archivos de api/ usan: conexión a la base de datos, sesión y funciones como filas(), responder() y fallar().
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Leer los grupos ----------
   Qué hace: Trae todos los grupos de la base de datos.
   Por qué: Son los mismos que usan horario, actividades y eventos. */
$grupos = [];
foreach (filas($conexion, 'SELECT gru_codigo AS g FROM grupos') as $f) {
    $grupos[] = $f['g'];
}

/* ---------- Ordenar ----------
   Qué hace: Ordena por grado y luego por número (6-1, 6-2… 10-1… 11-9).
   Por qué: Un orden normal pondría 10-1 antes que 6-1. */
// Orden natural: 6-1, 6-2 ... 10-1 ... 11-9
usort($grupos, function ($a, $b) {
    $x = array_map('intval', explode('-', $a));
    $y = array_map('intval', explode('-', $b));
    return [$x[0], $x[1] ?? 0] <=> [$y[0], $y[1] ?? 0];
});

/* ---------- Responder ----------
   Qué hace: Manda la lista en formato JSON.
   Por qué: Es lo que lee el JavaScript de la página. */
responder(['ok' => true, 'grupos' => $grupos]);