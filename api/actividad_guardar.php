<?php
// Crear, editar o borrar una actividad. Solo profesores (de sus materias y grupos) y administrador.
// Se envía como formulario (FormData) porque puede traer un archivo adjunto.
require __DIR__ . '/actividades_lib.php';
solo_post();
exigir_sesion();

$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

$accion = (string)($_POST['accion'] ?? '');

// Lee y valida los datos de la actividad (los mismos al crear y al editar)
function leer_actividad($conexion, $c) {
    $titulo  = trim((string)($_POST['titulo'] ?? ''));
    $materia = trim((string)($_POST['materia'] ?? ''));
    $grupo   = trim((string)($_POST['grupo'] ?? ''));
    $fecha   = trim((string)($_POST['fecha'] ?? ''));
    $hora    = trim((string)($_POST['hora'] ?? ''));
    $desc    = trim((string)($_POST['desc'] ?? ''));

    if (largo($titulo) < 1 || largo($titulo) > 150) {
        fallar('Escribe un título para la actividad (máximo 150 letras).');
    }
    $m = filas($conexion, 'SELECT mat_codigo FROM materias WHERE mat_nombre = ? LIMIT 1', 's', [$materia]);
    if (!$m) {
        fallar('Esa materia no existe.');
    }
    $mat = (int)$m[0]['mat_codigo'];

    if ($grupo === '') {
        $grupo = null;
    } elseif (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$grupo])) {
        fallar('Ese grupo no existe.');
    }

    if ($c['rol'] === 'profesor' && !profesor_puede($c['asig'], $mat, $grupo)) {
        fallar('Solo puedes usar tu materia y tus grupos.', 403);
    }

    if ($fecha === '') {
        $fecha = null;
        $hora = null;
    } else {
        $d = DateTime::createFromFormat('Y-m-d', $fecha);
        if (!$d || $d->format('Y-m-d') !== $fecha) {
            fallar('La fecha de entrega no es válida.');
        }
        if (!preg_match('/^([01]?\d|2[0-3]):[0-5]\d$/', $hora)) {
            $hora = '23:59';
        }
        $hora .= ':00';
    }
    if (largo($desc) > 5000) {
        fallar('La descripción es demasiado larga.');
    }
    return [$titulo, $mat, $grupo, $fecha, $hora, $desc];
}

// ¿Viene un archivo adjunto nuevo? (se valida el tamaño antes de tocar la base de datos)
function archivo_nuevo() {
    if (empty($_FILES['archivo']) || $_FILES['archivo']['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    $f = $_FILES['archivo'];
    if ($f['error'] !== UPLOAD_ERR_OK) {
        fallar('No se pudo subir el archivo. Intenta con otro.');
    }
    if ($f['size'] > 5 * 1024 * 1024) {
        fallar('El archivo no puede superar los 5 MB.');
    }
    return $f;
}

if ($accion === 'crear') {
    list($titulo, $mat, $grupo, $fecha, $hora, $desc) = leer_actividad($conexion, $c);
    $archivo = archivo_nuevo();

    $pro = $c['rol'] === 'profesor' ? $c['codigo'] : null;
    $adm = $c['rol'] === 'admin' ? $c['codigo'] : null;

    if (!ejecutar(
        $conexion,
        'INSERT INTO actividades (act_titulo, act_descripcion, act_mat_materia, act_gru_grupo, act_fecha, act_hora, act_pro_profesor, act_adm_administrador, act_creada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        'ssisssiis',
        [$titulo, $desc, $mat, $grupo, $fecha, $hora, $pro, $adm, ahora()]
    )) {
        fallar('No se pudo guardar la actividad.', 500);
    }
    $codigo = $conexion->insert_id;

    if ($archivo) {
        $ruta = guardar_archivo_subido($archivo['tmp_name'], 'act_' . $codigo);
        if (!$ruta) {
            ejecutar($conexion, 'DELETE FROM actividades WHERE act_codigo = ?', 'i', [$codigo]);
            fallar('El servidor no pudo guardar el archivo.', 500);
        }
        ejecutar(
            $conexion,
            'UPDATE actividades SET act_archivo_nombre = ?, act_archivo_ruta = ? WHERE act_codigo = ?',
            'ssi',
            [nombre_archivo_limpio($archivo['name']), $ruta, $codigo]
        );
    }

    responder(['ok' => true, 'actividad' => actividad_armada($conexion, $c, $codigo)]);
}

$codigo = (int)($_POST['codigo'] ?? 0);
$a = $codigo > 0 ? cargar_actividad_fila($conexion, $codigo) : null;
if (!$a) {
    fallar('Esa actividad ya no existe.', 404);
}
if (!puede_gestionar($c, $a)) {
    fallar('No tienes permiso para hacer esto.', 403);
}

if ($accion === 'editar') {
    list($titulo, $mat, $grupo, $fecha, $hora, $desc) = leer_actividad($conexion, $c);
    $archivo = archivo_nuevo();
    $quitar = ($_POST['quitar_archivo'] ?? '') === '1';

    if (!ejecutar(
        $conexion,
        'UPDATE actividades SET act_titulo = ?, act_descripcion = ?, act_mat_materia = ?, act_gru_grupo = ?, act_fecha = ?, act_hora = ? WHERE act_codigo = ?',
        'ssisssi',
        [$titulo, $desc, $mat, $grupo, $fecha, $hora, $codigo]
    )) {
        fallar('No se pudo guardar la actividad.', 500);
    }

    $rutaVieja = $a['act_archivo_ruta'] ?? null;

    if ($archivo) {
        $ruta = guardar_archivo_subido($archivo['tmp_name'], 'act_' . $codigo);
        if (!$ruta) {
            fallar('Se guardaron los cambios, pero el servidor no pudo guardar el archivo nuevo.', 500);
        }
        ejecutar(
            $conexion,
            'UPDATE actividades SET act_archivo_nombre = ?, act_archivo_ruta = ? WHERE act_codigo = ?',
            'ssi',
            [nombre_archivo_limpio($archivo['name']), $ruta, $codigo]
        );
        borrar_archivo($rutaVieja);
    } elseif ($quitar && $rutaVieja) {
        ejecutar($conexion, 'UPDATE actividades SET act_archivo_nombre = NULL, act_archivo_ruta = NULL WHERE act_codigo = ?', 'i', [$codigo]);
        borrar_archivo($rutaVieja);
    }

    responder(['ok' => true, 'actividad' => actividad_armada($conexion, $c, $codigo)]);
}

if ($accion === 'borrar') {
    $rutas = filas($conexion, 'SELECT ent_archivo_ruta AS r FROM entregas WHERE ent_act_actividad = ?', 'i', [$codigo]);
    if (!ejecutar($conexion, 'DELETE FROM actividades WHERE act_codigo = ?', 'i', [$codigo])) {
        fallar('No se pudo borrar la actividad.', 500);
    }
    foreach ($rutas as $r) {
        borrar_archivo($r['r']);
    }
    borrar_archivo($a['act_archivo_ruta'] ?? null);
    responder(['ok' => true]);
}

fallar('Acción no válida.');
