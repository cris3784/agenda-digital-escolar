<?php
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

$d = entrada();
$codigo   = (int)($d['codigo'] ?? 0);
$rol      = (string)($d['rol'] ?? '');
$nombre   = trim((string)($d['nombre'] ?? ''));
$usuario  = trim((string)($d['usuario'] ?? ''));
$correo   = trim((string)($d['correo'] ?? ''));
$clave    = (string)($d['clave'] ?? '');
$grupo    = trim((string)($d['grupo'] ?? ''));
$materias = lista_texto($d['materias'] ?? []);
$grupos   = lista_texto($d['grupos'] ?? []);

if (!isset(ROLES[$rol])) {
    fallar('Tipo de cuenta no válido.');
}

$nuevo = $codigo < 1;
if ($nuevo && $rol === 'admin') {
    fallar('No se pueden crear administradores desde aquí.');
}

list($tabla, $p) = ROLES[$rol];

if (!$nuevo) {
    $existe = filas($conexion, "SELECT {$p}_usuario AS usuario FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);
    if (!$existe) {
        fallar('Esa cuenta ya no existe.', 404);
    }
    if ($rol === 'admin') {
        $usuario = $existe[0]['usuario'];
    }
}

validar_datos_basicos($nombre, $usuario, $correo);

if ($nuevo || $clave !== '') {
    if (strlen($clave) < 6 || strlen($clave) > 72) {
        fallar('La contraseña debe tener entre 6 y 72 caracteres.');
    }
}

if (ya_existe_otro($conexion, 'usuario', $usuario, $nuevo ? '' : $rol, $codigo)) {
    fallar('Ese usuario ya existe.', 409);
}
if (ya_existe_otro($conexion, 'correo', $correo, $nuevo ? '' : $rol, $codigo)) {
    fallar('Ese correo ya lo usa otra cuenta.', 409);
}

$codMaterias = [];

if ($rol === 'estudiante') {
    if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$grupo])) {
        fallar('Elige un grado válido.');
    }
}

if ($rol === 'profesor') {
    if (!$materias || count($materias) > 6) {
        fallar('Elige entre 1 y 6 materias.');
    }
    $codMaterias = codigos_de_materias($conexion, $materias);
    validar_grupos($conexion, $grupos);
}

$conexion->begin_transaction();
$ok = true;

if ($nuevo) {
    $hash = password_hash($clave, PASSWORD_DEFAULT);

    if ($rol === 'estudiante') {
        $ok = ejecutar(
            $conexion,
            'INSERT INTO estudiantes (est_nombre, est_usuario, est_correo, est_clave, est_gru_grupo) VALUES (?, ?, ?, ?, ?)',
            'sssss',
            [$nombre, $usuario, $correo, $hash, $grupo]
        );
        $codigo = $conexion->insert_id;
    } else {
        $ok = ejecutar(
            $conexion,
            'INSERT INTO profesores (pro_nombre, pro_usuario, pro_correo, pro_clave) VALUES (?, ?, ?, ?)',
            'ssss',
            [$nombre, $usuario, $correo, $hash]
        );
        $codigo = $conexion->insert_id;
        if ($ok) {
            $ok = guardar_asignaciones($conexion, $codigo, $codMaterias, $grupos);
        }
    }
} else {
    if ($rol === 'estudiante') {
        $ok = ejecutar(
            $conexion,
            'UPDATE estudiantes SET est_nombre = ?, est_usuario = ?, est_correo = ?, est_gru_grupo = ? WHERE est_codigo = ?',
            'ssssi',
            [$nombre, $usuario, $correo, $grupo, $codigo]
        );
    } elseif ($rol === 'profesor') {
        $ok = ejecutar(
            $conexion,
            'UPDATE profesores SET pro_nombre = ?, pro_usuario = ?, pro_correo = ? WHERE pro_codigo = ?',
            'sssi',
            [$nombre, $usuario, $correo, $codigo]
        );
        if ($ok) {
            $ok = guardar_asignaciones($conexion, $codigo, $codMaterias, $grupos);
        }
    } else {
        $ok = ejecutar(
            $conexion,
            'UPDATE administradores SET adm_nombre = ?, adm_correo = ? WHERE adm_codigo = ?',
            'ssi',
            [$nombre, $correo, $codigo]
        );
    }

    if ($ok && $clave !== '') {
        $ok = ejecutar(
            $conexion,
            "UPDATE {$tabla} SET {$p}_clave = ? WHERE {$p}_codigo = ?",
            'si',
            [password_hash($clave, PASSWORD_DEFAULT), $codigo]
        );
    }
}

if (!$ok) {
    $errno = $conexion->errno;
    $conexion->rollback();
    if ($errno === 1062) {
        fallar('Ese usuario o correo ya existe.', 409);
    }
    fallar('No se pudo guardar la cuenta. Intenta de nuevo.', 500);
}

$conexion->commit();
responder(['ok' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);
