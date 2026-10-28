<?php
/* =========================================================
   REGISTRO DE CUENTAS
   Qué hace: Crea cuentas nuevas de estudiante, acudiente o profesor en dos pasos: primero valida los datos y manda un código al correo; después, cuando la persona escribe ese código, crea la cuenta de verdad.
   Por qué: Así nadie se registra con un correo que no es suyo, y los profesores quedan pendientes hasta que un administrador los apruebe.
   ========================================================= */

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae util.php, correo_lib.php (envío de correos y códigos) y acepta solo POST.
   Por qué: Para no repetir código y para que los datos no viajen por la dirección de la página. */
require __DIR__ . '/util.php';
require __DIR__ . '/correo_lib.php';
solo_post();

/* ---------- Limpiar una lista ----------
   Qué hace: Convierte lo recibido en una lista de textos sin espacios, sin vacíos y sin repetidos.
   Por qué: Las materias y los grupos llegan como listas y hay que dejarlas limpias antes de revisarlas. */
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

/* ---------- ¿Ya existe ese usuario o correo? ----------
   Qué hace: Busca el valor en las 4 tablas de cuentas (administradores, profesores, estudiantes y acudientes).
   Por qué: Un usuario o un correo no puede repetirse entre roles distintos. */
function ya_existe($conexion, $campo, $valor) {
    foreach (ROLES as $info) {
        list($tabla, $p) = $info;
        if (filas($conexion, "SELECT {$p}_codigo FROM {$tabla} WHERE {$p}_{$campo} = ? LIMIT 1", 's', [$valor])) {
            return true;
        }
    }
    return false;
}

/* ---------- Crear la cuenta de verdad ----------
   Qué hace: Guarda la cuenta en su tabla (estudiante, acudiente o profesor) dentro de una transacción. Si es profesor, queda "pendiente" y también guarda sus materias y grupos. Si algo falla, deshace todo.
   Por qué: Solo se llama cuando el código del correo ya fue verificado; la transacción evita cuentas a medias. */
// Crea la cuenta de verdad (solo se llama cuando el código del correo ya fue verificado)
function crear_cuenta($conexion, $p) {
    $nombre = $p['nombre']; $apellidos = $p['apellidos']; $nacim = $p['nacim'];
    $tipo = $p['tipo']; $usuario = $p['usuario']; $correo = $p['correo'];
    $hash = $p['hash']; $grupo = $p['grupo'];
    $codMaterias = $p['codMaterias']; $grupos = $p['grupos'];

    $conexion->begin_transaction();
    $ok = true;

    if ($tipo === 'estudiante') {
        $s = $conexion->prepare("INSERT INTO estudiantes (est_nombre, est_apellidos, est_nacimiento, est_usuario, est_correo, est_clave, est_gru_grupo, est_correo_verificado) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
        $s->bind_param('sssssss', $nombre, $apellidos, $nacim, $usuario, $correo, $hash, $grupo);
        $ok = $s->execute();
    } elseif ($tipo === 'acudiente') {
        $s = $conexion->prepare("INSERT INTO acudientes (acu_nombre, acu_apellidos, acu_nacimiento, acu_usuario, acu_correo, acu_clave, acu_gru_grupo, acu_correo_verificado) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
        $s->bind_param('sssssss', $nombre, $apellidos, $nacim, $usuario, $correo, $hash, $grupo);
        $ok = $s->execute();
    } else {
        $s = $conexion->prepare("INSERT INTO profesores (pro_nombre, pro_apellidos, pro_nacimiento, pro_usuario, pro_correo, pro_clave, pro_correo_verificado, pro_estado) VALUES (?, ?, ?, ?, ?, ?, 1, 'pendiente')");
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

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Toma los datos enviados.
   Por qué: Con ellos se sabe en qué paso va el registro. */
$d = entrada();

/* ---------- Paso 2: la persona escribió el código ----------
   Qué hace: Comprueba el código que le llegó al correo, recupera los datos guardados del paso 1, vuelve a revisar que el usuario y el correo no se hayan ocupado mientras tanto, crea la cuenta y borra los códigos. Responde si el profesor queda pendiente de aprobación.
   Por qué: La cuenta solo se crea cuando se demuestra que el correo es de la persona. */
/* Paso 2: la persona escribió el código que le llegó al correo */
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
    responder(['ok' => true, 'pendiente' => $p['tipo'] === 'profesor']);
}

/* ---------- Paso 1: leer los datos ----------
   Qué hace: Toma el nombre, los apellidos, la fecha de nacimiento, el tipo de cuenta, el usuario, el correo, la contraseña, el grupo y, para profesores, las materias y los grupos.
   Por qué: Es todo lo que se necesita para crear la cuenta. */
/* Paso 1: validar los datos y mandar el código al correo */
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

/* ---------- Paso 1: validar los datos ----------
   Qué hace: Comprueba el nombre, los apellidos, la fecha, el tipo de cuenta, el formato del usuario (3 a 40 caracteres, sin espacios ni tildes), el correo, la contraseña (6 a 72 caracteres) y que el usuario y el correo no estén ya registrados.
   Por qué: Todo se revisa en el servidor; no se puede confiar solo en lo que valida la página. */
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

/* ---------- Paso 1: revisar según el tipo de cuenta ----------
   Qué hace: Si es estudiante o acudiente, comprueba que el grado exista. Si es profesor, comprueba que elija entre 1 y 6 materias que existan y hasta 54 grupos que existan.
   Por qué: Cada tipo de cuenta necesita datos distintos. */
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

/* ---------- Paso 1: guardar los datos y mandar el código ----------
   Qué hace: Deja los datos ya revisados (con la contraseña cifrada) guardados junto al código, y manda el código de verificación al correo. Si el correo no se puede enviar, borra el código.
   Por qué: La cuenta todavía no existe; se crea en el paso 2, cuando la persona escribe el código. */
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

/* ---------- Responder ----------
   Qué hace: Avisa que el código fue enviado y que ahora la página debe pedirlo.
   Por qué: Es el paso siguiente del registro. */
responder(['ok' => true, 'paso' => 'codigo']);