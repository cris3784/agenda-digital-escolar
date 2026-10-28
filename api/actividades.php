<?php
/* =========================================================
   LISTA DE ACTIVIDADES
   Qué hace: Devuelve las actividades que la persona puede ver, con sus entregas.
   Por qué: Es lo que la página Actividades pide al abrirse; cada rol recibe solo lo suyo.
   ========================================================= */

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones para armar actividades).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';

/* ---------- Exigir sesión ----------
   Qué hace: Si no hay sesión iniciada, se detiene. */
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Saca el rol, grupo y materias.
   Por qué: Con eso se filtra. */
$c = contexto($conexion);

/* ---------- Filtrar por rol ----------
   Qué hace: Estudiante: la base de datos ya trae solo las de su grupo o de todos. Los demás: se traen todas y se filtran con puede_ver().
   Por qué: El estudiante nunca recibe actividades de otros grupos. */
if ($c['rol'] === 'estudiante') {
    $filas = consulta_actividades($conexion, 'WHERE a.act_gru_grupo IS NULL OR a.act_gru_grupo = ?', 's', [$c['grupo']]);
} else {
    $filas = consulta_actividades($conexion);
    if ($c['rol'] === 'profesor' || $c['rol'] === 'acudiente') {
        $filas = array_values(array_filter($filas, function ($a) use ($c) {
            return puede_ver($c, $a);
        }));
    }
}

/* ---------- Responder ----------
   Qué hace: Arma las actividades con sus entregas y las manda en JSON. */
responder(['ok' => true, 'actividades' => armar_actividades($conexion, $c, $filas)]);