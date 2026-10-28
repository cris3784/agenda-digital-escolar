<?php
/* =========================================================
   EVENTOS DEL CALENDARIO
   Qué hace: Devuelve los eventos del calendario que la persona puede ver, agrupados por día.
   Por qué: Cada rol ve solo lo suyo: el estudiante los de su grupo o de todos, el profesor los suyos y los de sus grupos, el administrador todos.
   ========================================================= */

// Eventos del calendario que esta cuenta puede ver, agrupados por día: {"2026-10-23":[{...}]}

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones comunes).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Saca el rol, grupo y materias.
   Por qué: Con eso se filtra. */
$c = contexto($conexion);

/* ---------- Desde cuándo ----------
   Qué hace: Trae solo los eventos de los últimos 400 días en adelante.
   Por qué: No hace falta cargar eventos muy viejos. */
$desde = date('Y-m-d', time() - 400 * 86400);

/* ---------- Pedir los eventos ----------
   Qué hace: Trae los eventos con el nombre del profesor o administrador que los publicó. */
$filas = filas(
    $conexion,
    'SELECT e.*, p.pro_nombre AS pro_nombre, p.pro_usuario AS pro_usuario, a.adm_usuario AS adm_usuario
     FROM eventos e
     LEFT JOIN profesores p ON p.pro_codigo = e.eve_pro_profesor
     LEFT JOIN administradores a ON a.adm_codigo = e.eve_adm_administrador
     WHERE e.eve_fecha >= ?
     ORDER BY e.eve_fecha, e.eve_codigo',
    's',
    [$desde]
);

/* ---------- Materias del profesor ----------
   Qué hace: Busca las materias de un profesor y las guarda para no repetir la consulta.
   Por qué: Para mostrar "Prof. Fulano · Matemáticas". */
// Materias de cada profesor (para mostrar "Prof. Fulano · Matemáticas")
$materiasDe = [];
function materias_texto($conexion, &$cache, $profesor) {
    if (!isset($cache[$profesor])) {
        $f = filas(
            $conexion,
            'SELECT DISTINCT m.mat_nombre AS n FROM asignaciones a JOIN materias m ON m.mat_codigo = a.asi_mat_materia WHERE a.asi_pro_profesor = ? ORDER BY a.asi_codigo',
            'i',
            [$profesor]
        );
        $n = [];
        foreach ($f as $x) {
            $n[] = $x['n'];
        }
        $cache[$profesor] = implode(', ', $n);
    }
    return $cache[$profesor];
}

/* ---------- Juntar los eventos de varios grupos ----------
   Qué hace: Los eventos con el mismo lote se juntan en uno solo con la lista de grupos.
   Por qué: Así la página los ve como un solo evento. */
// Un evento publicado para varios grupos es una sola fila por grupo con el mismo "lote"
$eventos = [];
$porLote = [];
foreach ($filas as $f) {
    $lote = (string)$f['eve_lote'];
    if ($lote !== '' && isset($porLote[$lote])) {
        if ($f['eve_gru_grupo'] !== null) {
            $eventos[$porLote[$lote]]['groups'][] = $f['eve_gru_grupo'];
        }
        continue;
    }
    $esProfe = $f['eve_pro_profesor'] !== null;
    $ev = [
        'id'     => $lote !== '' ? 'l:' . $lote : (string)(int)$f['eve_codigo'],
        'date'   => $f['eve_fecha'],
        'title'  => $f['eve_titulo'],
        'desc'   => (string)$f['eve_descripcion'],
        'byRole' => $esProfe ? 'profesor' : 'admin',
        'by'     => $esProfe ? (string)$f['pro_usuario'] : (string)$f['adm_usuario'],
        '_pro'   => $esProfe ? (int)$f['eve_pro_profesor'] : 0
    ];
    if ($esProfe) {
        $ev['byName'] = (string)$f['pro_nombre'];
        $ev['subject'] = materias_texto($conexion, $materiasDe, (int)$f['eve_pro_profesor']);
    }
    if ($f['eve_gru_grupo'] !== null) {
        $ev['groups'] = [$f['eve_gru_grupo']];
    }
    $eventos[] = $ev;
    if ($lote !== '') {
        $porLote[$lote] = count($eventos) - 1;
    }
}

/* ---------- Grupos del profesor ----------
   Qué hace: Calcula los grupos del profesor o si puede ver todos. */
$sinLimite = false;
$mios = [];
foreach ($c['asig'] as $a) {
    if ($a['gru'] === null) {
        $sinLimite = true;
    } else {
        $mios[$a['gru']] = true;
    }
}

/* ---------- Filtrar y agrupar por día ----------
   Qué hace: Quita los eventos que la persona no debe ver y agrupa el resto por fecha.
   Por qué: Es la forma que usa el calendario de la página. */
$mapa = [];
foreach ($eventos as $ev) {
    $grupos = $ev['groups'] ?? [];
    $visible = true;
    if ($c['rol'] !== 'admin' && $grupos) {
        if ($c['rol'] === 'profesor') {
            $visible = $ev['_pro'] === $c['codigo'] || $sinLimite;
            if (!$visible) {
                foreach ($grupos as $g) {
                    if (isset($mios[$g])) {
                        $visible = true;
                        break;
                    }
                }
            }
        } elseif ($c['rol'] === 'acudiente') {
            $visible = count(array_intersect($grupos, $c['grupos'])) > 0;
        } else {
            $visible = in_array($c['grupo'], $grupos, true);
        }
    }
    if (!$visible) {
        continue;
    }
    $fecha = $ev['date'];
    unset($ev['_pro'], $ev['date']);
    $mapa[$fecha][] = $ev;
}

/* ---------- Responder ----------
   Qué hace: Manda los eventos en formato JSON. */
responder(['ok' => true, 'eventos' => $mapa ? $mapa : (object)[]]);