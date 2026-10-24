<?php
// Crear, cambiar o borrar un evento del calendario.
// Administrador: cualquiera · Profesor: solo los suyos y para sus grupos · Estudiante: nada.
require __DIR__ . '/actividades_lib.php';
solo_post();
exigir_sesion();

$c = contexto($conexion);
if ($c['rol'] === 'estudiante') {
    fallar('No tienes permiso para hacer esto.', 403);
}

$d = entrada();
$accion = (string)($d['accion'] ?? '');

function filas_de_evento($conexion, $id) {
    $id = (string)$id;
    if (strpos($id, 'l:') === 0) {
        return filas($conexion, 'SELECT * FROM eventos WHERE eve_lote = ?', 's', [substr($id, 2)]);
    }
    return filas($conexion, 'SELECT * FROM eventos WHERE eve_codigo = ?', 'i', [(int)$id]);
}

function insertar_evento($conexion, $tipo, $titulo, $desc, $fecha, $grupos, $pro, $adm) {
    $lista = $grupos ? $grupos : [null];
    $lote = count($lista) > 1 ? bin2hex(random_bytes(6)) : null;
    foreach ($lista as $g) {
        if (!ejecutar(
            $conexion,
            'INSERT INTO eventos (eve_titulo, eve_descripcion, eve_fecha, eve_tipo, eve_gru_grupo, eve_pro_profesor, eve_adm_administrador, eve_lote) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            'sssssiis',
            [$titulo, $desc, $fecha, $tipo, $g, $pro, $adm, $lote]
        )) {
            return false;
        }
    }
    return true;
}

if ($accion === 'borrar' || $accion === 'editar') {
    $filasEvento = filas_de_evento($conexion, $d['id'] ?? '');
    if (!$filasEvento) {
        fallar('Ese evento ya no existe.', 404);
    }
    $viejo = $filasEvento[0];
    if ($c['rol'] === 'profesor' && (int)$viejo['eve_pro_profesor'] !== $c['codigo']) {
        fallar('Solo puedes cambiar los eventos que publicaste tú.', 403);
    }
    if ($accion === 'borrar') {
        foreach ($filasEvento as $f) {
            if (!ejecutar($conexion, 'DELETE FROM eventos WHERE eve_codigo = ?', 'i', [(int)$f['eve_codigo']])) {
                fallar('No se pudo borrar el evento.', 500);
            }
        }
        responder(['ok' => true]);
    }
}

// crear / editar: se validan los datos
$fecha  = trim((string)($d['fecha'] ?? ''));
$titulo = trim((string)($d['titulo'] ?? ''));
$desc   = trim((string)($d['desc'] ?? ''));
$grupos = lista_texto($d['groups'] ?? []);

$f = DateTime::createFromFormat('Y-m-d', $fecha);
if (!$f || $f->format('Y-m-d') !== $fecha) {
    fallar('Elige una fecha para el evento.');
}
if (largo($titulo) < 1 || largo($titulo) > 150) {
    fallar('Escribe un título para el evento (máximo 150 letras).');
}
if (largo($desc) > 5000) {
    fallar('La descripción es demasiado larga.');
}
foreach ($grupos as $g) {
    if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$g])) {
        fallar('El grupo "' . $g . '" no existe.');
    }
}

if ($c['rol'] === 'profesor') {
    $sinLimite = false;
    $mios = [];
    foreach ($c['asig'] as $a) {
        if ($a['gru'] === null) {
            $sinLimite = true;
        } elseif (!in_array($a['gru'], $mios, true)) {
            $mios[] = $a['gru'];
        }
    }
    if ($grupos) {
        if (!$sinLimite) {
            foreach ($grupos as $g) {
                if (!in_array($g, $mios, true)) {
                    fallar('Solo puedes publicar eventos para tus grupos.', 403);
                }
            }
        }
    } elseif (!$sinLimite && $mios) {
        $grupos = $mios;           // un profesor con grupos nunca publica para todo el colegio
    }
}

$conexion->begin_transaction();
$ok = true;

if ($accion === 'crear') {
    $esProfe = $c['rol'] === 'profesor';
    $ok = insertar_evento(
        $conexion, $esProfe ? 'profesor' : 'colegio', $titulo, $desc, $fecha, $grupos,
        $esProfe ? $c['codigo'] : null, $esProfe ? null : $c['codigo']
    );
} elseif ($accion === 'editar') {
    // Se conserva quién lo publicó; se reemplazan sus filas por las nuevas
    foreach ($filasEvento as $fila) {
        if (!ejecutar($conexion, 'DELETE FROM eventos WHERE eve_codigo = ?', 'i', [(int)$fila['eve_codigo']])) {
            $ok = false;
            break;
        }
    }
    if ($ok) {
        $ok = insertar_evento(
            $conexion, (string)$viejo['eve_tipo'], $titulo, $desc, $fecha, $grupos,
            $viejo['eve_pro_profesor'] !== null ? (int)$viejo['eve_pro_profesor'] : null,
            $viejo['eve_adm_administrador'] !== null ? (int)$viejo['eve_adm_administrador'] : null
        );
    }
} else {
    $conexion->rollback();
    fallar('Acción no válida.');
}

if (!$ok) {
    $conexion->rollback();
    fallar('No se pudo guardar el evento. Intenta de nuevo.', 500);
}
$conexion->commit();
responder(['ok' => true]);
