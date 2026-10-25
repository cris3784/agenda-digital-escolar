<?php
require __DIR__ . '/util.php';
require __DIR__ . '/correo_lib.php';
solo_post();

function lista($valor) {
    if (!is_array($valor)) {
        return [];
    }
    $limpia = [];
    foreach ($valor as $v) {
        $v = trim((string)$v);
        if ($v !== '' && !in_array($v, $limpia, true)) {
            $limpia[] = $v;
        }
    }
    return $limpia;
}

function ya_existe($conexion, $campo, $valor) {
    foreach (ROLES as $info) {
        list($tabla, $p) = $info;
        if (filas($conexion, "SELECT {$p}_codigo FROM {$tabla} WHERE {$p}_{$campo} = ? LIMIT 1", 's', [$valor])) {
            return true;
        }
    }
    return false;
}

// Crea la cuenta de verdad (solo se llama cuando el código del correo ya fue verificado)
function crear_cuenta($conexion, $p) {
    $nombre = $p['nombre']; $apellidos = $p['apellidos']; $nacim = $p['nacim'];
    $tipo = $p['tipo']; $usuario = $p['usuario']; $correo = $p['correo'];
    $hash = $p['hash']; $grupo = $p['grupo'];
    $codMaterias = $p['codMaterias']; $grupos = $p['grupos'];

    $conexion->begin_transaction();
    $ok = true;

    if ($tipo === 'estudiante') {
        $s = $conexion->prepare("INSERT INTO estudiantes (est_nombre, est_apellidos, est_nacimiento, est_usuario, est_correo, est_clave, est_gru_grupo) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $s->bind_param('sssssss', $nombre, $apellidos, $nacim, $usuario, $correo, $hash, $grupo);
        $ok = $s->execute();
    } elseif ($tipo === 'acudiente') {
        $s = $conexion->prepare("INSERT INTO acudientes (acu_nombre, acu_apellidos, acu_nacimiento, acu_usuario, acu_correo, acu_clave, acu_gru_grupo) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $s->bind_param('sssssss', $nombre, $apellidos, $nacim, $usuario, $correo, $hash, $grupo);
        $ok = $s->execute();
    } else {
        $s = $conexion->prepare("INSERT INTO profesores (pro_nombre, pro_apellidos, pro_nacimiento, pro_usuario, pro_correo, pro_clave) VALUES (?, ?, ?, ?, ?, ?)");
        $s->bind_param('ssssss', $nombre, $apellidos, $nacim, $usuario, $correo, $hash);
        $ok = $s->execute();

        if ($ok) {
            $profesor = $conexion->insert_id;
            $a = $conexion->prepare('INSERT INTO asignaciones (asi_pro_profesor, asi_mat_materia, asi_gru_grupo) VALUES (?, ?, ?)');
            foreach ($codMaterias as $mc) {
                foreach ($grupos as $g) {
                    $a->bind_param('iis', $profesor, $mc, $g);
                    if (!$a->execute()) {
                        $ok = false;
                        break 2;
                    }
                }
            }
        }
    }

    if (!$ok) {
        $errno = $conexion->errno;
        $conexion->rollback();
        if ($errno === 1062) {
            fallar('Ese usuario o correo ya existe.', 409);
        }
        fallar('No se pudo crear la cuenta. Intenta de nuevo.', 500);
    }

    $conexion->commit();
}

$d = entrada();

/* ---------- Paso 2: la persona escribió el código que le llegó al correo ---------- */
if ((string)($d['paso'] ?? '') === 'confirmar') {
    $correoC = trim((string)($d['correo'] ?? ''));
    $v = verificar_codigo($conexion, $correoC, 'registro', $d['codigo'] ?? '');
    $p = $v['datos'];
    if (!is_array($p) || empty($p['usuario'])) {
        fallar('No encontramos tu registro. Empieza de nuevo.', 410);
    }
    if (ya_existe($conexion, 'usuario', $p['usuario'])) {
        fallar('Ese usuario ya existe. Empieza de nuevo con otro usuario.', 409);
    }
    if (ya_existe($conexion, 'correo', $p['correo'])) {
        fallar('Ese correo ya está registrado.', 409);
    }
    crear_cuenta($conexion, $p);
    borrar_codigos($conexion, $correoC, 'registro');
    responder(['ok' => true]);
}

/* ---------- Paso 1: validar los datos y mandar el código al correo ---------- */
$nombre   = trim((string)($d['nombre'] ?? ''));
$apellidos = trim((string)($d['apellidos'] ?? ''));
$nacim    = trim((string)($d['nacimiento'] ?? ''));
$tipo     = (string)($d['tipo'] ?? '');
$usuario  = trim((string)($d['usuario'] ?? ''));
$correo   = trim((string)($d['correo'] ?? ''));
$clave    = (string)($d['clave'] ?? '');
$grupo    = trim((string)($d['grupo'] ?? ''));
$materias = lista($d['materias'] ?? []);
$grupos   = lista($d['grupos'] ?? []);

if (largo($nombre) < 2 || largo($nombre) > 100) {
    fallar('Escribe tu nombre completo.');
}
validar_apellidos($apellidos);
$nacim = validar_nacimiento($nacim);
if ($tipo !== 'estudiante' && $tipo !== 'profesor' && $tipo !== 'acudiente') {
    fallar('Elige si eres estudiante, profesor o acudiente.');
}
if (!preg_match('/^[A-Za-z0-9._-]{3,40}$/', $usuario)) {
    fallar('El usuario debe tener de 3 a 40 caracteres: letras, números, punto, guion o guion bajo, sin espacios ni tildes.');
}
if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
    fallar('Escribe un correo válido (ej. nombre@gmail.com).');
}
if (strlen($clave) < 6 || strlen($clave) > 72) {
    fallar('La contraseña debe tener entre 6 y 72 caracteres.');
}
if (ya_existe($conexion, 'usuario', $usuario)) {
    fallar('Ese usuario ya existe.', 409);
}
if (ya_existe($conexion, 'correo', $correo)) {
    fallar('Ese correo ya está registrado.', 409);
}

$codMaterias = [];

if ($tipo === 'estudiante' || $tipo === 'acudiente') {
    if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$grupo])) {
        fallar($tipo === 'acudiente' ? 'Elige el grado de tu hijo o hija.' : 'Elige un grado válido.');
    }
} else {
    if (!$materias || count($materias) > 6) {
        fallar('Elige entre 1 y 6 materias.');
    }
    if (!$grupos || count($grupos) > 54) {
        fallar('Escribe los grupos que atiendes (ej. 6-1, 7-2).');
    }
    foreach ($materias as $m) {
        $f = filas($conexion, 'SELECT mat_codigo FROM materias WHERE mat_nombre = ? LIMIT 1', 's', [$m]);
        if (!$f) {
            fallar('La materia "' . $m . '" no existe.');
        }
        $codMaterias[(int)$f[0]['mat_codigo']] = true;
    }
    $codMaterias = array_keys($codMaterias);
    foreach ($grupos as $g) {
        if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$g])) {
            fallar('El grupo "' . $g . '" no existe. Usa el formato 6-1.');
        }
    }
}

$pendiente = [
    'nombre' => $nombre, 'apellidos' => $apellidos, 'nacim' => $nacim,
    'tipo' => $tipo, 'usuario' => $usuario, 'correo' => $correo,
    'hash' => password_hash($clave, PASSWORD_DEFAULT), 'grupo' => $grupo,
    'codMaterias' => $codMaterias, 'grupos' => $grupos
];

list($idCodigo, $codigo) = crear_codigo($conexion, $correo, 'registro', $pendiente);

$html = plantilla_codigo(
    'Verifica tu correo',
    $nombre,
    'Escribe este código en A.D.E. para terminar de crear tu cuenta.',
    $codigo
);
if (!enviar_correo($correo, $nombre, 'Tu código de verificación - A.D.E.', $html)) {
    borrar_codigo_id($conexion, $idCodigo);
    fallar('No pudimos enviar el correo. Revisa que esté bien escrito e intenta de nuevo.', 502);
}

responder(['ok' => true, 'paso' => 'codigo']);
