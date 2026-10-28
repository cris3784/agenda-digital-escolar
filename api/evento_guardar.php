<?php
/* =========================================================
   GUARDAR EVENTOS DEL CALENDARIO
   Qué hace: Crea, cambia o borra un evento del calendario.
   Por qué: Administrador: cualquiera. Profesor: solo los suyos y para sus grupos. Estudiante: nada. Las reglas se revisan aquí en el servidor.
   ========================================================= */

// Crear, cambiar o borrar un evento del calendario.
// Administrador: cualquiera · Profesor: solo los suyos y para sus grupos · Estudiante: nada.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones comunes).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';

/* ---------- Solo POST y sesión ----------
   Qué hace: Rechaza otros tipos de petición y exige sesión iniciada. */
solo_post();
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Si no es profesor ni administrador, responde 403. */
$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

/* ---------- Datos recibidos ----------
   Qué hace: Lee los datos enviados y la acción pedida. */
$d = entrada();
$accion = (string)($d['accion'] ?? '');

/* ---------- Buscar un evento ----------
   Qué hace: Busca las filas de un evento por su número, o por "lote" si es un evento de varios grupos.
   Por qué: Un evento para varios grupos se guarda como una fila por grupo. */
function filas_de_evento($conexion, $id) {
    $id = (string)$id;
    if (strpos($id, 'l:') === 0) {
        return filas($conexion, 'SELECT * FROM eventos WHERE eve_lote = ?', 's', [substr($id, 2)]);
    }
    return filas($conexion, 'SELECT * FROM eventos WHERE eve_codigo = ?', 'i', [(int)$id]);
}

/* ---------- Guardar un evento ----------
   Qué hace: Inserta una fila por cada grupo (o una sola si es para todo el colegio).
   Por qué: Para varios grupos las filas comparten un código de lote. */
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

/* ---------- Editar o borrar ----------
   Qué hace: Busca el evento; un profesor solo puede cambiar los que publicó él. Si es borrar, lo borra.
   Por qué: Los eventos del administrador no los toca un profesor. */
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

/* ---------- Revisar los datos ----------
   Qué hace: Revisa fecha, título (hasta 150 letras), descripción (hasta 5000) y que los grupos existan.
   Por qué: Se revisa igual al crear que al editar. */
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

/* ---------- Grupos del profesor ----------
   Qué hace: Un profesor solo publica para sus grupos; si no elige ninguno, se usan los suyos.
   Por qué: Un profesor con grupos nunca publica para todo el colegio. */
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

/* ---------- Guardar todo junto ----------
   Qué hace: Inicia una operación que se guarda completa o no se guarda.
   Por qué: Así un evento no queda a medias. */
$conexion->begin_transaction();
$ok = true;

/* ---------- Crear ----------
   Qué hace: Guarda el evento marcando quién lo publicó (profesor o colegio). */
if ($accion === 'crear') {
    $esProfe = $c['rol'] === 'profesor';
    $ok = insertar_evento(
        $conexion, $esProfe ? 'profesor' : 'colegio', $titulo, $desc, $fecha, $grupos,
        $esProfe ? $c['codigo'] : null, $esProfe ? null : $c['codigo']
    );
} elseif ($accion === 'editar') {

    /* ---------- Editar ----------
       Qué hace: Borra las filas viejas y guarda las nuevas, sin cambiar quién lo publicó.
       Por qué: Es más sencillo que modificar fila por fila cuando cambian los grupos. */
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

/* ---------- Si algo falló ----------
   Qué hace: Deshace todo y responde con error. */
if (!$ok) {
    $conexion->rollback();
    fallar('No se pudo guardar el evento. Intenta de nuevo.', 500);
}

/* ---------- Confirmar ----------
   Qué hace: Guarda definitivamente los cambios y responde. */
$conexion->commit();
responder(['ok' => true]);