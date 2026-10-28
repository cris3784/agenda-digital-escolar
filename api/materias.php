<?php
/* =========================================================
   LISTA DE MATERIAS
   Qué hace: Devuelve los nombres de todas las materias del colegio.
   Por qué: Las pantallas de registro, horario y actividades la usan para ofrecer las materias en una lista.
   ========================================================= */

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php (base de datos, sesión y funciones como filas() y responder()).
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Leer las materias ----------
   Qué hace: Trae de la base de datos el nombre de cada materia, en el orden en que se crearon, y arma una lista simple de nombres.
   Por qué: A la página solo le interesan los nombres, no los códigos internos. */
$filas = filas($conexion, 'SELECT mat_nombre AS nombre FROM materias ORDER BY mat_codigo');
$nombres = [];
foreach ($filas as $f) {
    $nombres[] = $f['nombre'];
}

/* ---------- Responder ----------
   Qué hace: Manda la lista en formato JSON.
   Por qué: Es lo que lee el JavaScript de la página. */
responder(['ok' => true, 'materias' => $nombres]);