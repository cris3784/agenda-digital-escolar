<?php
/* =========================================================
   GUARDAR UNA ENTREGA
   Qué hace: El estudiante entrega (o cambia) su trabajo de una actividad.
   Por qué: Se recibe el archivo, se guarda en una carpeta cerrada y se anota si llegó tarde.
   ========================================================= */

// El estudiante entrega (o cambia) su trabajo de una actividad.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones comunes).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';

/* ---------- Solo POST y sesión ----------
   Qué hace: Rechaza otros tipos de petición y exige sesión iniciada. */
solo_post();
exigir_sesion();

/* ---------- Solo estudiantes ----------
   Qué hace: Si no es estudiante, responde 403.
   Por qué: Profesores y administrador no entregan trabajos. */
$c = contexto($conexion);
if ($c['rol'] !== 'estudiante') {
    fallar('Solo los estudiantes entregan trabajos.', 403);
}

/* ---------- Buscar la actividad ----------
   Qué hace: Comprueba que exista y que el estudiante pueda verla.
   Por qué: No se puede entregar en actividades de otro grupo. */
$codigo = (int)($_POST['actividad'] ?? 0);
$a = $codigo > 0 ? cargar_actividad_fila($conexion, $codigo) : null;
if (!$a || !puede_ver($c, $a)) {
    fallar('Esa actividad no está disponible.', 404);
}

/* ---------- Revisar el archivo ----------
   Qué hace: Debe haberse elegido un archivo, subido bien y pesar menos de 10 MB. */
if (empty($_FILES['archivo']) || $_FILES['archivo']['error'] === UPLOAD_ERR_NO_FILE) {
    fallar('Elige el archivo que vas a entregar.');
}
$f = $_FILES['archivo'];
if ($f['error'] !== UPLOAD_ERR_OK) {
    fallar('No se pudo subir el archivo. Intenta con otro.');
}
if ($f['size'] > 10 * 1024 * 1024) {
    fallar('El archivo no puede superar los 10 MB.');
}

/* ---------- ¿Llegó tarde? ----------
   Qué hace: Compara la hora de ahora con la fecha y hora límite (sin hora, vence al terminar el día).
   Por qué: Se calcula en el servidor para que nadie pueda cambiarla. */
// ¿Llegó después de la fecha y hora límite? (sin hora, vence al terminar el día)
$tarde = 0;
if ($a['act_fecha'] !== null) {
    $hora = $a['act_hora'] !== null ? substr($a['act_hora'], 0, 5) . ':59' : '23:59:59';
    $limite = strtotime($a['act_fecha'] . ' ' . $hora);
    $tarde = ($limite && time() > $limite) ? 1 : 0;
}

/* ---------- Entrega anterior ----------
   Qué hace: Busca si ya había entregado antes.
   Por qué: Para reemplazarla y borrar el archivo viejo. */
$previa = filas($conexion, 'SELECT ent_archivo_ruta AS r FROM entregas WHERE ent_act_actividad = ? AND ent_est_estudiante = ?', 'ii', [$codigo, $c['codigo']]);

/* ---------- Guardar el archivo ----------
   Qué hace: Lo guarda con nombre al azar. */
$ruta = guardar_archivo_subido($f['tmp_name'], 'ent_' . $codigo . '_' . $c['codigo']);
if (!$ruta) {
    fallar('El servidor no pudo guardar el archivo.', 500);
}

/* ---------- Guardar la entrega ----------
   Qué hace: Crea la entrega o, si ya existía, la reemplaza y borra la nota anterior.
   Por qué: Una entrega nueva debe volver a calificarse. */
// Si ya había entregado, se reemplaza y se borra la nota anterior (como hacía la página)
$ok = ejecutar(
    $conexion,
    'INSERT INTO entregas (ent_act_actividad, ent_est_estudiante, ent_archivo_nombre, ent_archivo_ruta, ent_fecha, ent_tarde) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE ent_archivo_nombre = VALUES(ent_archivo_nombre), ent_archivo_ruta = VALUES(ent_archivo_ruta),
       ent_fecha = VALUES(ent_fecha), ent_tarde = VALUES(ent_tarde), ent_nota = NULL, ent_comentario = NULL, ent_calificada = NULL',
    'iisssi',
    [$codigo, $c['codigo'], nombre_archivo_limpio($f['name']), $ruta, ahora(), $tarde]
);

if (!$ok) {
    borrar_archivo($ruta);
    fallar('No se pudo guardar tu entrega.', 500);
}

/* ---------- Borrar el archivo viejo ----------
   Qué hace: Quita del disco el archivo anterior.
   Por qué: Para no acumular archivos. */
if ($previa) {
    borrar_archivo($previa[0]['r']);
}

/* ---------- Responder ----------
   Qué hace: Devuelve la actividad ya actualizada. */
responder(['ok' => true, 'actividad' => actividad_armada($conexion, $c, $codigo)]);