<?php
/* =========================================================
   GUARDAR ACTIVIDADES
   Qué hace: Crea, edita o borra una actividad. Solo profesores (de sus materias y grupos) y administrador.
   Por qué: Se recibe como formulario (FormData) porque la actividad puede traer un archivo adjunto. Las reglas se revisan aquí, no solo en el navegador.
   ========================================================= */

// Crear, editar o borrar una actividad. Solo profesores (de sus materias y grupos) y administrador.
// Se envía como formulario (FormData) porque puede traer un archivo adjunto.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y manejo de archivos).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';

/* ---------- Solo POST y sesión ----------
   Qué hace: Rechaza otros tipos de petición y exige sesión iniciada.
   Por qué: Crear o borrar nunca debe hacerse con un enlace normal. */
solo_post();
exigir_sesion();

/* ---------- Quién es la persona y qué puede ----------
   Qué hace: Saca el rol y las materias/grupos; si no es admin ni profesor, responde 403.
   Por qué: Estudiantes y acudientes no crean actividades. */
$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

/* ---------- Acción pedida ----------
   Qué hace: Lee si se quiere crear, editar o borrar.
   Por qué: Un solo archivo maneja las tres. */
$accion = (string)($_POST['accion'] ?? '');

// Lee y valida los datos de la actividad (los mismos al crear y al editar)

/* ---------- Leer y revisar los datos ----------
   Qué hace: Revisa título (hasta 150 letras), materia, grupo, fecha, hora y descripción (hasta 5000). El profesor solo puede usar su materia y sus grupos.
   Por qué: Se usa igual al crear que al editar; sin hora, la entrega vence a las 23:59. */
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

/* ---------- ¿Hay archivo adjunto nuevo? ----------
   Qué hace: Revisa que se haya subido bien y que pese menos de 5 MB.
   Por qué: Se revisa antes de tocar la base de datos. */
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

/* ---------- Crear una actividad ----------
   Qué hace: Guarda la actividad, y si trae archivo lo guarda con nombre al azar; si el archivo falla, borra la actividad.
   Por qué: Evita actividades a medias. */
if ($accion === 'crear') {
    list($titulo, $mat, $grupo, $fecha, $hora, $desc) = leer_actividad($conexion, $c);
    $archivo = archivo_nuevo();

    /* ---------- Quién la creó ----------
       Qué hace: Anota si la creó un profesor o el administrador.
       Por qué: Se usa para saber de quién es cada actividad. */
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

/* ---------- Buscar la actividad ----------
   Qué hace: Para editar o borrar, la busca; si no existe responde 404 y si no puede gestionarla responde 403.
   Por qué: Un profesor no puede tocar actividades de otra materia. */
$codigo = (int)($_POST['codigo'] ?? 0);
$a = $codigo > 0 ? cargar_actividad_fila($conexion, $codigo) : null;
if (!$a) {
    fallar('Esa actividad ya no existe.', 404);
}
if (!puede_gestionar($c, $a)) {
    fallar('No tienes permiso para hacer esto.', 403);
}

/* ---------- Editar una actividad ----------
   Qué hace: Cambia los datos y, si corresponde, reemplaza o quita el archivo adjunto.
   Por qué: El archivo viejo se borra del servidor para no acumular basura. */
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

    /* ---------- Archivo adjunto anterior ----------
       Qué hace: Guarda la ruta del archivo viejo para borrarlo si se cambia o se quita. */
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

/* ---------- Borrar una actividad ----------
   Qué hace: Borra la actividad y todos los archivos que tenía (adjunto y entregas).
   Por qué: Se borran los archivos del disco para que no queden perdidos. */
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

/* ---------- Acción desconocida ----------
   Qué hace: Si la acción no es ninguna de las anteriores, responde con error. */
fallar('Acción no válida.');