<?php
/* =========================================================
   FUNCIONES COMPARTIDAS DE ACTIVIDADES
   Qué hace: Reúne lo que usan varios archivos de actividades y entregas: manejo de archivos, permisos y la forma de armar los datos.
   Por qué: Así las reglas importantes (quién ve y quién gestiona qué) están en un solo lugar y son las mismas en todos los archivos.
   ========================================================= */

// Funciones compartidas por los archivos de actividades y entregas.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae util.php (conexión, sesión y funciones comunes). */
require __DIR__ . '/util.php';

/* ---------- Zona horaria ----------
   Qué hace: Pone la hora de Colombia (America/Bogota).
   Por qué: Para que las fechas y horas límite se calculen con la hora correcta. */
date_default_timezone_set('America/Bogota');

/* ---------- Fecha y hora actual ----------
   Qué hace: Devuelve la fecha y hora de ahora lista para guardar.
   Por qué: Se usa al crear y al entregar. */
function ahora() {
    return date('Y-m-d H:i:s');
}

/* ---------- Fecha en español ----------
   Qué hace: Convierte una fecha en texto como "23/10/2026, 11:21:05 p. m.".
   Por qué: Así la mostraba la página. */
// "23/10/2026, 11:21:05 p. m."  (así lo mostraba la página)
function fecha_es($texto) {
    $t = strtotime($texto);
    if (!$t) {
        return '';
    }
    return date('d/m/Y, g:i:s', $t) . (date('a', $t) === 'am' ? ' a. m.' : ' p. m.');
}

/* ---------- Carpeta de trabajos ----------
   Qué hace: Crea (si falta) la carpeta de archivos y le pone un .htaccess que la cierra al público.
   Por qué: Los archivos solo se bajan por archivo.php, que revisa los permisos. */
// Carpeta donde se guardan los archivos. Queda cerrada al público: solo se baja por archivo.php
function carpeta_trabajos() {
    $dir = dirname(__DIR__) . '/uploads/trabajos';
    preparar_carpeta($dir);
    $h = $dir . '/.htaccess';
    if (!is_file($h)) {
        @file_put_contents($h, "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
    }
    return $dir;
}

/* ---------- Guardar un archivo ----------
   Qué hace: Guarda el archivo con un nombre al azar y devuelve su ruta.
   Por qué: El nombre al azar evita adivinar archivos y choques de nombres. */
// Guarda un archivo subido con un nombre al azar. Devuelve la ruta relativa o null.
function guardar_archivo_subido($tmp, $prefijo) {
    $dir = carpeta_trabajos();
    $nombre = $prefijo . '_' . bin2hex(random_bytes(8)) . '.dat';
    if (!move_uploaded_file($tmp, $dir . '/' . $nombre)) {
        return null;
    }
    return 'uploads/trabajos/' . $nombre;
}

/* ---------- Borrar un archivo ----------
   Qué hace: Borra el archivo, pero solo si está dentro de la carpeta de trabajos.
   Por qué: Es una protección para no borrar archivos de otro lugar. */
function borrar_archivo($ruta) {
    if (!$ruta) {
        return;
    }
    $base = realpath(dirname(__DIR__) . '/uploads/trabajos');
    $real = realpath(dirname(__DIR__) . '/' . $ruta);
    if ($base && $real && strpos($real, $base . DIRECTORY_SEPARATOR) === 0 && is_file($real)) {
        @unlink($real);
    }
}

/* ---------- Limpiar el nombre ----------
   Qué hace: Quita rutas y caracteres raros del nombre original y lo corta a 200 letras.
   Por qué: Es el nombre que verá la persona al descargar. */
function nombre_archivo_limpio($nombre) {
    $n = trim(basename(str_replace('\\', '/', (string)$nombre)));
    $n = preg_replace('/[\x00-\x1F\x7F]/', '', $n);
    if ($n === '') {
        $n = 'archivo';
    }
    return function_exists('mb_substr') ? mb_substr($n, 0, 200, 'UTF-8') : substr($n, 0, 200);
}

/* ---------- Permisos ----------
   Qué hace: Funciones que deciden quién puede qué. Se comprueban aquí, en el servidor.
   Por qué: Aunque alguien cambie el JavaScript de su navegador, el servidor no se deja engañar. */

/* ---------- Materias y grupos del profesor ----------
   Qué hace: Trae las materias y grupos que dicta un profesor.
   Por qué: Es la base de sus permisos. */
function asignaciones_de($conexion, $profesor) {
    return filas($conexion, 'SELECT asi_mat_materia AS mat, asi_gru_grupo AS gru FROM asignaciones WHERE asi_pro_profesor = ?', 'i', [$profesor]);
}

/* ---------- ¿El profesor puede usarla? ----------
   Qué hace: Responde si el profesor tiene esa materia (y ese grupo, si la actividad es de un grupo).
   Por qué: Evita que ponga actividades en materias ajenas. */
// ¿El profesor tiene esa materia (y ese grupo, si la actividad es de un grupo)?
function profesor_puede($asig, $materia, $grupo) {
    foreach ($asig as $a) {
        if ((int)$a['mat'] !== (int)$materia) {
            continue;
        }
        if ($grupo === null || $grupo === '' || $a['gru'] === null || $a['gru'] === $grupo) {
            return true;
        }
    }
    return false;
}

/* ---------- Grupo del estudiante ----------
   Qué hace: Devuelve el grupo de un estudiante. */
function grupo_de_estudiante($conexion, $codigo) {
    $f = filas($conexion, 'SELECT est_gru_grupo AS g FROM estudiantes WHERE est_codigo = ?', 'i', [$codigo]);
    return $f ? (string)$f[0]['g'] : '';
}

/* ---------- Contexto de la sesión ----------
   Qué hace: Reúne rol, código, materias y grupos de la persona. Un acudiente solo entra si ya está validado.
   Por qué: Con este paquete los demás archivos deciden permisos fácilmente. */
// Contexto de quien tiene la sesión: rol, código y lo necesario para decidir permisos
function contexto($conexion) {
    $rol = $_SESSION['rol'];
    $codigo = (int)$_SESSION['codigo'];
    $c = ['rol' => $rol, 'codigo' => $codigo, 'asig' => [], 'grupo' => '', 'grupos' => []];
    if ($rol === 'profesor') {
        $c['asig'] = asignaciones_de($conexion, $codigo);
    } elseif ($rol === 'estudiante') {
        $c['grupo'] = grupo_de_estudiante($conexion, $codigo);
        $c['grupos'] = $c['grupo'] !== '' ? [$c['grupo']] : [];
    } elseif ($rol === 'acudiente') {
        // El acudiente solo entra a los datos cuando ya está validado (un estudiante verificó su correo)
        $f = filas($conexion, 'SELECT acu_correo AS correo, acu_gru_grupo AS grupo FROM acudientes WHERE acu_codigo = ?', 'i', [$codigo]);
        $hijos = $f ? hijos_de_acudiente($conexion, (string)$f[0]['correo'], (string)$f[0]['grupo']) : [];
        if (!$hijos) {
            fallar('Tu cuenta de acudiente todavía no está validada.', 403);
        }
        foreach ($hijos as $h) {
            if (!in_array($h['grade'], $c['grupos'], true)) {
                $c['grupos'][] = $h['grade'];
            }
        }
        $c['grupo'] = $hijos[0]['grade'];
    }
    return $c;
}

/* ---------- ¿Puede ver la actividad? ----------
   Qué hace: Admin: todas. Profesor: las de su materia y grupo. Acudiente y estudiante: las de sus grupos o de todos. */
function puede_ver($c, $a) {
    if ($c['rol'] === 'admin') {
        return true;
    }
    if ($c['rol'] === 'profesor') {
        return profesor_puede($c['asig'], $a['act_mat_materia'], $a['act_gru_grupo']);
    }
    if ($c['rol'] === 'acudiente') {
        return $a['act_gru_grupo'] === null || in_array($a['act_gru_grupo'], $c['grupos'], true);
    }
    return $a['act_gru_grupo'] === null || $a['act_gru_grupo'] === $c['grupo'];
}

/* ---------- ¿Puede editarla o borrarla? ----------
   Qué hace: Solo el admin y el profesor de esa materia y grupo.
   Por qué: Estudiantes y acudientes nunca. */
function puede_gestionar($c, $a) {
    if ($c['rol'] === 'admin') {
        return true;
    }
    if ($c['rol'] === 'profesor') {
        return profesor_puede($c['asig'], $a['act_mat_materia'], $a['act_gru_grupo']);
    }
    return false;
}

/* ---------- Armar las actividades ----------
   Qué hace: Dan a los datos de la base la misma forma que ya usa la página.
   Por qué: Así el JavaScript no tuvo que cambiar cuando se pasó a base de datos. */

/* ---------- Consultar actividades ----------
   Qué hace: Trae actividades con el nombre de su materia, de la más nueva a la más vieja. */
function consulta_actividades($conexion, $donde = '', $tipos = '', $params = []) {
    return filas(
        $conexion,
        'SELECT a.*, m.mat_nombre FROM actividades a JOIN materias m ON m.mat_codigo = a.act_mat_materia ' . $donde . ' ORDER BY a.act_codigo DESC',
        $tipos,
        $params
    );
}

/* ---------- Armar la respuesta ----------
   Qué hace: Junta cada actividad con sus entregas: el estudiante solo ve las suyas, el acudiente ninguna y los demás todas.
   Por qué: Las entregas y notas son privadas. */
function armar_actividades($conexion, $c, $filas) {
    if (!$filas) {
        return [];
    }

    $ids = [];
    foreach ($filas as $a) {
        $ids[] = (int)$a['act_codigo'];
    }

    $sql = 'SELECT e.*, s.est_usuario, s.est_nombre FROM entregas e JOIN estudiantes s ON s.est_codigo = e.ent_est_estudiante WHERE e.ent_act_actividad IN (' . implode(',', $ids) . ')';
    if ($c['rol'] === 'estudiante') {
        $entregas = filas($conexion, $sql . ' AND e.ent_est_estudiante = ?', 'i', [$c['codigo']]);
    } elseif ($c['rol'] === 'acudiente') {
        $entregas = [];      // el acudiente no ve entregas ni notas
    } else {
        $entregas = filas($conexion, $sql);
    }

    $porActividad = [];
    foreach ($entregas as $e) {
        $s = [
            'studentName' => $e['est_nombre'],
            'username'    => $e['est_usuario'],
            'name'        => $e['ent_archivo_nombre'],
            'data'        => 'api/archivo.php?t=ent&id=' . (int)$e['ent_codigo'],
            'submittedAt' => fecha_es($e['ent_fecha']),
            'late'        => !empty($e['ent_tarde'])
        ];
        if ($e['ent_nota'] !== null) {
            $s['grade'] = (float)$e['ent_nota'];
        }
        if ($e['ent_comentario'] !== null && $e['ent_comentario'] !== '') {
            $s['feedback'] = $e['ent_comentario'];
        }
        if ($e['ent_calificada'] !== null) {
            $s['gradedAt'] = fecha_es($e['ent_calificada']);
        }
        $porActividad[(int)$e['ent_act_actividad']][$e['est_usuario']] = $s;
    }

    $salida = [];
    foreach ($filas as $a) {
        $id = (int)$a['act_codigo'];
        $o = [
            'id'      => $id,
            'title'   => $a['act_titulo'],
            'subject' => $a['mat_nombre'],
            'desc'    => (string)$a['act_descripcion'],
            'done'    => false
        ];
        if ($a['act_gru_grupo'] !== null) {
            $o['group'] = $a['act_gru_grupo'];
        }
        if ($a['act_fecha'] !== null) {
            $o['date'] = $a['act_fecha'];
            $o['time'] = substr((string)$a['act_hora'], 0, 5);
        }
        if (!empty($a['act_archivo_ruta'])) {
            $o['attachment'] = ['name' => $a['act_archivo_nombre'], 'data' => 'api/archivo.php?t=act&id=' . $id];
        }
        if (!empty($porActividad[$id])) {
            $o['submissions'] = $porActividad[$id];
        }
        $salida[] = $o;
    }
    return $salida;
}

/* ---------- Una sola actividad ----------
   Qué hace: Devuelve una actividad ya armada.
   Por qué: Para responder con la actividad que acaba de cambiar. */
// Una sola actividad (la que acaba de cambiar), ya armada
function actividad_armada($conexion, $c, $codigo) {
    $f = consulta_actividades($conexion, 'WHERE a.act_codigo = ?', 'i', [$codigo]);
    $l = armar_actividades($conexion, $c, $f);
    return $l ? $l[0] : null;
}

/* ---------- Actividad sin armar ----------
   Qué hace: Trae una actividad tal como está en la base de datos.
   Por qué: Para revisar permisos antes de cambiar algo. */
function cargar_actividad_fila($conexion, $codigo) {
    $f = filas($conexion, 'SELECT * FROM actividades WHERE act_codigo = ?', 'i', [$codigo]);
    return $f ? $f[0] : null;
}