<?php
// El estudiante entrega (o cambia) su trabajo de una actividad.
require __DIR__ . '/actividades_lib.php';
solo_post();
exigir_sesion();

$c = contexto($conexion);
if ($c['rol'] !== 'estudiante') {
    fallar('Solo los estudiantes entregan trabajos.', 403);
}

$codigo = (int)($_POST['actividad'] ?? 0);
$a = $codigo > 0 ? cargar_actividad_fila($conexion, $codigo) : null;
if (!$a || !puede_ver($c, $a)) {
    fallar('Esa actividad no está disponible.', 404);
}

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

// ¿Llegó después de la fecha y hora límite? (sin hora, vence al terminar el día)
$tarde = 0;
if ($a['act_fecha'] !== null) {
    $hora = $a['act_hora'] !== null ? substr($a['act_hora'], 0, 5) . ':59' : '23:59:59';
    $limite = strtotime($a['act_fecha'] . ' ' . $hora);
    $tarde = ($limite && time() > $limite) ? 1 : 0;
}

$previa = filas($conexion, 'SELECT ent_archivo_ruta AS r FROM entregas WHERE ent_act_actividad = ? AND ent_est_estudiante = ?', 'ii', [$codigo, $c['codigo']]);

$ruta = guardar_archivo_subido($f['tmp_name'], 'ent_' . $codigo . '_' . $c['codigo']);
if (!$ruta) {
    fallar('El servidor no pudo guardar el archivo.', 500);
}

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

if ($previa) {
    borrar_archivo($previa[0]['r']);
}

responder(['ok' => true, 'actividad' => actividad_armada($conexion, $c, $codigo)]);
