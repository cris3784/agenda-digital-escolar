<?php
/* =========================================================
   GUARDAR UNA CUENTA
   Qué hace: Crea una cuenta nueva de estudiante o profesor, o cambia los datos de una que ya existe (incluida la del administrador).
   Por qué: Es lo que usa el administrador desde su panel de usuarios; todo se revisa aquí, en el servidor.
   ========================================================= */

/* ---------- Solo POST y solo administrador ----------
   Qué hace: Carga las herramientas, rechaza otros tipos de petición y a cualquiera que no sea administrador.
   Por qué: Nadie más debe poder crear o cambiar cuentas. */
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Toma el código de la cuenta (0 si es nueva), el rol, el nombre, el usuario, el correo, la contraseña, el grupo y, para profesores, las materias y los grupos.
   Por qué: Un solo archivo sirve para crear y para editar. */
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

/* ---------- Revisar el tipo de cuenta ----------
   Qué hace: Comprueba que el rol exista, que no sea acudiente (esas cuentas las edita cada persona) y que no se intente crear un administrador.
   Por qué: Hay cuentas que no se pueden manejar desde aquí. */
if (!isset(ROLES[$rol])) {
    fallar('Tipo de cuenta no válido.');
}
if ($rol === 'acudiente') {
    fallar('Las cuentas de acudiente las edita cada persona desde Mi perfil.');
}

$nuevo = $codigo < 1;
if ($nuevo && $rol === 'admin') {
    fallar('No se pueden crear administradores desde aquí.');
}

list($tabla, $p) = ROLES[$rol];

/* ---------- Si la cuenta ya existe ----------
   Qué hace: Busca la cuenta actual; si ya no existe, responde 404. Si es el administrador, conserva su usuario y su correo.
   Por qué: El administrador no cambia su usuario y no necesita correo, así que se deja el que ya tiene. */
if (!$nuevo) {
    $existe = filas($conexion, "SELECT {$p}_usuario AS usuario, {$p}_correo AS correo FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);
    if (!$existe) {
        fallar('Esa cuenta ya no existe.', 404);
    }
    if ($rol === 'admin') {
        $usuario = $existe[0]['usuario'];
        $correo  = (string)$existe[0]['correo'];     // el administrador no necesita correo: se deja el que ya tiene
    }
}

/* ---------- Revisar los datos básicos ----------
   Qué hace: Comprueba el nombre, el formato del usuario y el correo. Si es cuenta nueva, o si se escribió una contraseña, exige que tenga entre 6 y 72 caracteres.
   Por qué: Al editar, dejar la contraseña vacía significa "no cambiarla". */
validar_datos_basicos($nombre, $usuario, $rol === 'admin' ? 'admin@ade.local' : $correo);

if ($nuevo || $clave !== '') {
    if (strlen($clave) < 6 || strlen($clave) > 72) {
        fallar('La contraseña debe tener entre 6 y 72 caracteres.');
    }
}

/* ---------- Usuario y correo repetidos ----------
   Qué hace: Comprueba que ninguna otra cuenta (de cualquier tipo) use ese usuario o ese correo.
   Por qué: No deben repetirse; la cuenta que se está editando no cuenta contra sí misma. */
if (ya_existe_otro($conexion, 'usuario', $usuario, $nuevo ? '' : $rol, $codigo)) {
    fallar('Ese usuario ya existe.', 409);
}
if ($rol !== 'admin' && ya_existe_otro($conexion, 'correo', $correo, $nuevo ? '' : $rol, $codigo)) {
    fallar('Ese correo ya lo usa otra cuenta.', 409);
}

/* ---------- Reglas según el rol ----------
   Qué hace: Si es estudiante, comprueba que el grado exista. Si es profesor, comprueba que tenga entre 1 y 6 materias, convierte los nombres de materias en códigos y revisa los grupos.
   Por qué: Cada rol necesita datos distintos. */
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

/* ---------- Guardar (crear o editar) ----------
   Qué hace: Abre una transacción. Si la cuenta es nueva, la inserta con la contraseña cifrada (y las asignaciones si es profesor). Si ya existía, actualiza sus datos y, si se escribió una contraseña, también la cambia.
   Por qué: La transacción hace que todo se guarde junto o nada se guarde. */
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

/* ---------- Si algo falló ----------
   Qué hace: Deshace todo lo hecho en la transacción. Si el error es de usuario o correo repetido (1062), lo explica; si no, avisa que no se pudo guardar.
   Por qué: Así no quedan cuentas a medias. */
if (!$ok) {
    $errno = $conexion->errno;
    $conexion->rollback();
    if ($errno === 1062) {
        fallar('Ese usuario o correo ya existe.', 409);
    }
    fallar('No se pudo guardar la cuenta. Intenta de nuevo.', 500);
}

/* ---------- Correo cambiado ----------
   Qué hace: Si se cambió el correo de una cuenta existente, la marca como "correo sin verificar".
   Por qué: La persona tiene que verificar el correo nuevo otra vez. */
// Si se cambió el correo, la persona tiene que verificarlo otra vez
if (!$nuevo && isset($existe[0]) && strcasecmp((string)$existe[0]['correo'], $correo) !== 0) {
    ejecutar($conexion, "UPDATE {$tabla} SET {$p}_correo_verificado = 0 WHERE {$p}_codigo = ?", 'i', [$codigo]);
}

/* ---------- Confirmar y responder ----------
   Qué hace: Confirma la transacción y manda los datos de la cuenta guardada en formato JSON.
   Por qué: La página los usa para actualizar la lista de usuarios. */
$conexion->commit();
responder(['ok' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);