<?php
/* =========================================================
   HERRAMIENTAS COMUNES
   Qué hace: Reúne lo que casi todos los archivos de api/ usan: la conexión a la base de datos, la sesión, los roles y funciones como filas(), ejecutar(), responder() y fallar().
   Por qué: Así ese código está en un solo lugar y no se repite en cada archivo.
   ========================================================= */

/* ---------- Conexión a la base de datos ----------
   Qué hace: Trae conexion.php, que abre la conexión con la base de datos.
   Por qué: Todos los archivos necesitan hablar con la base de datos. */
require __DIR__ . '/conexion.php';

/* ---------- Iniciar la sesión ----------
   Qué hace: Configura la cookie de sesión (dura hasta cerrar el navegador, solo se envía por HTTPS cuando el sitio lo usa, y JavaScript no puede leerla) e inicia la sesión.
   Por qué: Son medidas de seguridad para que nadie robe la sesión de otra persona. */
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

/* ---------- Cabeceras de la respuesta ----------
   Qué hace: Avisa que todo lo que se responde es JSON y que el navegador no debe guardarlo en memoria.
   Por qué: Los datos cambian y son personales; no deben quedar guardados. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* ---------- Los roles ----------
   Qué hace: Lista los 4 roles con la tabla donde vive cada uno y el prefijo de sus columnas.
   Por qué: Así se arman las consultas de cualquier rol con el mismo código (por ejemplo adm_codigo, pro_codigo, est_codigo). */
const ROLES = [
    'admin'      => ['administradores', 'adm'],
    'profesor'   => ['profesores', 'pro'],
    'estudiante' => ['estudiantes', 'est'],
    'acudiente'  => ['acudientes', 'acu']
];

/* ---------- Responder ----------
   Qué hace: Manda los datos en formato JSON con el código de estado y termina.
   Por qué: Es la forma en que todos los archivos le contestan a la página. */
function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- Fallar ----------
   Qué hace: Responde con un mensaje de error (por defecto código 400) y termina.
   Por qué: Un solo lugar para los errores hace que todos se vean igual en la página. */
function fallar($mensaje, $codigo = 400) {
    responder(['ok' => false, 'error' => $mensaje], $codigo);
}

/* ---------- Solo POST ----------
   Qué hace: Si la petición no es POST, responde con error 405.
   Por qué: Las acciones que cambian datos no deben poder lanzarse desde una dirección cualquiera. */
function solo_post() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fallar('Metodo no permitido.', 405);
    }
}

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Lee el cuerpo de la petición (JSON) y lo convierte en una lista; si no es válido, devuelve una lista vacía.
   Por qué: Así los archivos siempre trabajan con una lista y no se rompen con datos raros. */
function entrada() {
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

/* ---------- Exigir sesión ----------
   Qué hace: Si la persona no inició sesión, responde con error 401 y se detiene.
   Por qué: Casi todo requiere saber quién es la persona. */
function exigir_sesion() {
    if (empty($_SESSION['rol']) || empty($_SESSION['codigo'])) {
        fallar('Debes iniciar sesion.', 401);
    }
}

/* ---------- Exigir administrador ----------
   Qué hace: Pide sesión y, si el rol no es administrador, responde con error 403.
   Por qué: Hay acciones que solo el administrador puede hacer. */
function exigir_admin() {
    exigir_sesion();
    if ($_SESSION['rol'] !== 'admin') {
        fallar('No tienes permiso para hacer esto.', 403);
    }
}

/* ---------- Largo de un texto ----------
   Qué hace: Cuenta las letras de un texto (con tildes y ñ como una sola letra cada una).
   Por qué: strlen() contaría de más las letras con tilde. */
function largo($texto) {
    return function_exists('mb_strlen') ? mb_strlen($texto, 'UTF-8') : strlen($texto);
}

/* ---------- Consultar la base de datos ----------
   Qué hace: Ejecuta una consulta SELECT con parámetros y devuelve todas las filas como una lista; si algo falla, devuelve una lista vacía.
   Por qué: Usar parámetros evita que lo que escribe una persona se cuele dentro de la consulta. */
function filas($conexion, $sql, $tipos = '', $params = []) {
    $s = $conexion->prepare($sql);
    if (!$s) {
        return [];
    }
    if ($tipos !== '') {
        $s->bind_param($tipos, ...$params);
    }
    if (!$s->execute()) {
        $s->close();
        return [];
    }
    $meta = $s->result_metadata();
    if (!$meta) {
        $s->close();
        return [];
    }
    $fila = [];
    $refs = [];
    foreach ($meta->fetch_fields() as $campo) {
        $refs[] = &$fila[$campo->name];
    }
    $s->bind_result(...$refs);
    $salida = [];
    while ($s->fetch()) {
        $copia = [];
        foreach ($fila as $clave => $valor) {
            $copia[$clave] = $valor;
        }
        $salida[] = $copia;
    }
    $s->close();
    return $salida;
}

/* ---------- Hijos de un acudiente ----------
   Qué hace: Busca los estudiantes que ya verificaron el correo de este acudiente. Si el acudiente eligió un grado al registrarse, los hijos de ese grado van primero.
   Por qué: Solo cuenta como hijo quien confirmó con un código que ese correo es de su acudiente. */
// Estudiantes que ya verificaron este correo como el de su acudiente.
// Si el acudiente eligió un grado al registrarse, los hijos de ese grado van primero.
function hijos_de_acudiente($conexion, $correo, $gradoElegido = '') {
    $f = filas(
        $conexion,
        'SELECT est_codigo AS codigo, est_nombre AS nombre, est_apellidos AS apellidos, est_usuario AS usuario, est_gru_grupo AS grupo FROM estudiantes WHERE est_acu_correo = ? AND est_acu_verificado = 1 ORDER BY est_gru_grupo, est_codigo',
        's',
        [$correo]
    );
    $primeros = [];
    $otros = [];
    foreach ($f as $x) {
        $h = [
            'code'     => (int)$x['codigo'],
            'name'     => trim($x['nombre'] . ' ' . $x['apellidos']),
            'username' => $x['usuario'],
            'grade'    => $x['grupo']
        ];
        if ($gradoElegido !== '' && $x['grupo'] === $gradoElegido) {
            $primeros[] = $h;
        } else {
            $otros[] = $h;
        }
    }
    return array_merge($primeros, $otros);
}

/* ---------- Cargar una lista de cuentas ----------
   Qué hace: Trae las cuentas de un rol con UNA sola consulta (más otra para las asignaciones de los profesores) y las convierte a la forma que lee la página: nombre, usuario, correo, foto, grupo, materias, hijos, etc.
   Por qué: Hacerlo en pocas consultas es más rápido. Con $publico = true se entrega la versión para los demás (sin fecha de nacimiento ni correos) y con false la completa (la propia persona o el administrador). */
// Carga cuentas de un rol con UNA sola consulta (más las asignaciones de los profesores en otra).
// $publico = true  -> versión para los demás: sin fecha de nacimiento, sin correos.
// $publico = false -> versión completa (la propia persona o el administrador).
function cargar_lista($conexion, $rol, $donde = '', $tipos = '', $params = [], $publico = false) {
    if (!isset(ROLES[$rol])) {
        return [];
    }
    list($tabla, $p) = ROLES[$rol];

    $extra = '';
    if ($rol === 'estudiante') {
        $extra = ', est_gru_grupo AS grupo, est_acu_correo AS acu_correo, est_acu_verificado AS acu_ver';
    } elseif ($rol === 'acudiente') {
        $extra = ', acu_gru_grupo AS grupo';
    } elseif ($rol === 'profesor') {
        $extra = ', pro_estado AS estado';
    }

    $f = filas(
        $conexion,
        "SELECT {$p}_codigo AS codigo, {$p}_nombre AS nombre, {$p}_apellidos AS apellidos, {$p}_nacimiento AS nacimiento, {$p}_usuario AS usuario, {$p}_correo AS correo, {$p}_creado AS creado, {$p}_foto AS foto, {$p}_correo_verificado AS verificado, {$p}_ultimo_acceso AS acceso{$extra} FROM {$tabla} {$donde} ORDER BY {$p}_codigo",
        $tipos,
        $params
    );
    if (!$f) {
        return [];
    }

    // Asignaciones de todos los profesores de la lista en una sola consulta
    $porProfesor = [];
    if ($rol === 'profesor') {
        $codigos = array_map(function ($x) { return (int)$x['codigo']; }, $f);
        $marcas = implode(',', array_fill(0, count($codigos), '?'));
        $as = filas(
            $conexion,
            "SELECT a.asi_pro_profesor AS pro, m.mat_nombre AS materia, a.asi_gru_grupo AS grupo FROM asignaciones a JOIN materias m ON m.mat_codigo = a.asi_mat_materia WHERE a.asi_pro_profesor IN ($marcas) ORDER BY a.asi_codigo",
            str_repeat('i', count($codigos)),
            $codigos
        );
        foreach ($as as $a) {
            $porProfesor[(int)$a['pro']][] = $a;
        }
    }

    $salida = [];
    foreach ($f as $x) {
        $foto = '';
        if (!empty($x['foto'])) {
            $archivoFoto = dirname(__DIR__) . '/' . $x['foto'];
            if (is_file($archivoFoto)) {
                $foto = 'api/foto.php?u=' . $p . $x['codigo'] . '&v=' . filemtime($archivoFoto);
            }
        }

        $u = [
            'id'        => $p . $x['codigo'],
            'codigo'    => (int)$x['codigo'],
            'name'      => trim($x['nombre'] . ' ' . $x['apellidos']),
            'firstName' => $x['nombre'],
            'lastName'  => (string)$x['apellidos'],
            'birthdate' => ($publico || !$x['nacimiento']) ? '' : (string)$x['nacimiento'],
            'username'  => $x['usuario'],
            'email'     => $publico ? '' : $x['correo'],
            'role'      => $rol,
            'grade'     => '',
            'photo'     => $foto,
            'createdAt' => date('d/m/Y, g:i:s a', strtotime($x['creado']))
        ];

        if (!$publico) {
            $u['emailVerified'] = !empty($x['verificado']);
        }

        // Última vez que inició sesión (el profesor la ve en los estudiantes de sus grupos)
        if (!$publico || $rol === 'estudiante') {
            $u['lastLogin'] = formato_acceso($x['acceso']);
        }

        if ($rol === 'estudiante') {
            $u['grade'] = $x['grupo'];
            if (!$publico) {
                $u['guardianEmail']    = $x['acu_correo'] !== null ? (string)$x['acu_correo'] : '';
                $u['guardianVerified'] = !empty($x['acu_ver']);
            }
        }

        if ($rol === 'acudiente') {
            // Solo queda validado cuando un estudiante escribió su correo y lo verificó con el código
            $hijos = hijos_de_acudiente($conexion, (string)$x['correo'], (string)$x['grupo']);
            $u['pendingGrade'] = (string)$x['grupo'];
            $u['validated']    = count($hijos) > 0;
            $u['children']     = $hijos;
            $u['grade']        = $hijos ? $hijos[0]['grade'] : '';
            $grupos = [];
            foreach ($hijos as $h) {
                if (!in_array($h['grade'], $grupos, true)) {
                    $grupos[] = $h['grade'];
                }
            }
            $u['groups'] = $grupos;
        }

        if ($rol === 'profesor') {
            $u['estado'] = $x['estado'];
            $materias = [];
            $grupos = [];
            foreach (($porProfesor[(int)$x['codigo']] ?? []) as $a) {
                if (!in_array($a['materia'], $materias, true)) {
                    $materias[] = $a['materia'];
                }
                if ($a['grupo'] !== null && !in_array($a['grupo'], $grupos, true)) {
                    $grupos[] = $a['grupo'];
                }
            }
            $u['subject']  = $materias[0] ?? '';
            $u['subjects'] = $materias;
            if ($grupos) {
                $u['groups'] = $grupos;
                $u['grade']  = $grupos[0];
            }
        }

        $salida[] = $u;
    }
    return $salida;
}

/* ---------- Cargar una sola cuenta ----------
   Qué hace: Busca una cuenta por su rol y código y la devuelve (o nada si no existe).
   Por qué: Por defecto devuelve la versión completa: úsala solo para la propia persona o el administrador. */
// Una sola cuenta. Por defecto devuelve la versión completa: úsala solo para la propia persona o el admin.
function cargar_usuario($conexion, $rol, $codigo, $publico = false) {
    if (!isset(ROLES[$rol])) {
        return null;
    }
    $p = ROLES[$rol][1];
    $l = cargar_lista($conexion, $rol, "WHERE {$p}_codigo = ?", 'i', [(int)$codigo], $publico);
    return $l ? $l[0] : null;
}

/* ---------- Último inicio de sesión (hora de Colombia) ----------
   Qué hace: Convierte la fecha guardada del último ingreso al formato que se muestra (día/mes/año, hora) en hora de Colombia; si no hay fecha o no es válida, devuelve vacío.
   Por qué: Es la hora que la persona espera ver. */
// ---- Último inicio de sesión (hora de Colombia) ----
function formato_acceso($valor) {
    if (!$valor) {
        return '';
    }
    try {
        $d = new DateTime($valor, new DateTimeZone('America/Bogota'));
        return $d->format('d/m/Y, g:i:s a');
    } catch (Exception $e) {
        return '';
    }
}

/* ---------- Anotar el ingreso ----------
   Qué hace: Guarda la fecha y hora actuales (hora de Colombia) como el último acceso de la cuenta.
   Por qué: Se muestra en el perfil y el profesor la ve en los estudiantes de sus grupos. */
function registrar_acceso($conexion, $rol, $codigo) {
    if (!isset(ROLES[$rol])) {
        return;
    }
    list($tabla, $p) = ROLES[$rol];
    $ahora = (new DateTime('now', new DateTimeZone('America/Bogota')))->format('Y-m-d H:i:s');
    ejecutar($conexion, "UPDATE {$tabla} SET {$p}_ultimo_acceso = ? WHERE {$p}_codigo = ?", 'si', [$ahora, (int)$codigo]);
}

/* ---------- ¿La cuenta está activa? ----------
   Qué hace: Una cuenta está activa si existe y, cuando es de un profesor, ya fue aprobada.
   Por qué: Un profesor solo puede usar el sistema si el administrador ya lo aprobó. */
// Un profesor solo puede usar el sistema si el administrador ya lo aprobó
function cuenta_activa($u) {
    return $u && ($u['role'] !== 'profesor' || ($u['estado'] ?? '') === 'aprobado');
}


/* ---------------------------------------------------------
   Funciones que usan los demás archivos de la carpeta api
   --------------------------------------------------------- */

/* ---------- Ejecutar un cambio ----------
   Qué hace: Ejecuta un INSERT, UPDATE o DELETE con parámetros y devuelve true si salió bien.
   Por qué: Usar parámetros evita que lo que escribe una persona se cuele dentro de la consulta. */
// Ejecuta un INSERT / UPDATE / DELETE con parámetros. Devuelve true si salió bien.
function ejecutar($conexion, $sql, $tipos = '', $params = []) {
    $s = $conexion->prepare($sql);
    if (!$s) {
        return false;
    }
    if ($tipos !== '') {
        $s->bind_param($tipos, ...$params);
    }
    $ok = $s->execute();
    $s->close();
    return $ok;
}

/* ---------- Preparar una carpeta ----------
   Qué hace: Si la carpeta no existe, la crea (con sus carpetas superiores).
   Por qué: Para poder guardar archivos, como las fotos de perfil, sin errores. */
function preparar_carpeta($dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

/* ---------- Limpiar una lista de textos ----------
   Qué hace: Quita los espacios, los vacíos y los repetidos de una lista.
   Por qué: Las materias y los grupos llegan como listas y hay que dejarlas limpias antes de revisarlas. */
// Limpia una lista de textos: sin espacios, sin vacíos y sin repetidos
function lista_texto($valor) {
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

/* ---------- Revisar los datos básicos de una cuenta ----------
   Qué hace: Comprueba que el nombre tenga entre 2 y 100 letras, que el usuario tenga de 3 a 40 caracteres válidos y que el correo sea válido; si algo está mal, responde con un aviso.
   Por qué: Se usa igual al crear que al editar una cuenta. */
function validar_datos_basicos($nombre, $usuario, $correo) {
    if (largo($nombre) < 2 || largo($nombre) > 100) {
        fallar('Escribe el nombre completo.');
    }
    if (!preg_match('/^[A-Za-z0-9._-]{3,40}$/', $usuario)) {
        fallar('El usuario debe tener de 3 a 40 caracteres: letras, números, punto, guion o guion bajo, sin espacios ni tildes.');
    }
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        fallar('Escribe un correo válido (ej. nombre@gmail.com).');
    }
}

/* ---------- ¿Otra cuenta usa ese usuario o correo? ----------
   Qué hace: Busca el valor en las 4 tablas de cuentas y devuelve true si lo usa alguna cuenta que no sea la que se está editando.
   Por qué: Un usuario o un correo no puede repetirse entre cuentas, pero la cuenta propia no cuenta contra sí misma. */
// ¿Otra cuenta (de cualquier tipo) ya usa ese usuario o correo?
// $rolPropio y $codigoPropio son la cuenta que se está editando (para no contarla).
function ya_existe_otro($conexion, $campo, $valor, $rolPropio, $codigoPropio) {
    foreach (ROLES as $rol => $info) {
        list($tabla, $p) = $info;
        $f = filas($conexion, "SELECT {$p}_codigo AS codigo FROM {$tabla} WHERE {$p}_{$campo} = ?", 's', [$valor]);
        foreach ($f as $fila) {
            if ($rol === $rolPropio && (int)$fila['codigo'] === (int)$codigoPropio) {
                continue;
            }
            return true;
        }
    }
    return false;
}

/* ---------- Materias: de nombres a códigos ----------
   Qué hace: Convierte una lista de nombres de materias en una lista de códigos; si alguna no existe, responde con un aviso.
   Por qué: La base de datos guarda los códigos, no los nombres. */
// Nombres de materias -> códigos (si alguna no existe, se avisa)
function codigos_de_materias($conexion, $nombres) {
    $codigos = [];
    foreach ($nombres as $m) {
        $f = filas($conexion, 'SELECT mat_codigo FROM materias WHERE mat_nombre = ? LIMIT 1', 's', [$m]);
        if (!$f) {
            fallar('La materia "' . $m . '" no existe.');
        }
        $codigos[(int)$f[0]['mat_codigo']] = true;
    }
    return array_keys($codigos);
}

/* ---------- Revisar los grupos de un profesor ----------
   Qué hace: Comprueba que no sean más de 54 y que cada grupo exista.
   Por qué: Si la lista queda vacía, significa que el profesor no tiene límite de grupo. */
// Grupos del profesor. Vacío = sin límite de grupo (así lo explica el editor del administrador).
function validar_grupos($conexion, $grupos) {
    if (count($grupos) > 54) {
        fallar('Hay demasiados grupos.');
    }
    foreach ($grupos as $g) {
        if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$g])) {
            fallar('El grupo "' . $g . '" no existe. Usa el formato 6-1.');
        }
    }
}

/* ---------- Guardar las asignaciones de un profesor ----------
   Qué hace: Borra las asignaciones (materia + grupo) que tenía el profesor y guarda las nuevas; si no hay grupos, guarda cada materia sin grupo (sin límite).
   Por qué: Así el profesor queda con exactamente lo que se eligió, sin sobras de antes. */
// Reemplaza todas las asignaciones (materia + grupo) de un profesor
function guardar_asignaciones($conexion, $profesor, $codMaterias, $grupos) {
    if (!ejecutar($conexion, 'DELETE FROM asignaciones WHERE asi_pro_profesor = ?', 'i', [$profesor])) {
        return false;
    }
    $a = $conexion->prepare('INSERT INTO asignaciones (asi_pro_profesor, asi_mat_materia, asi_gru_grupo) VALUES (?, ?, ?)');
    if (!$a) {
        return false;
    }
    $lista = $grupos ? $grupos : [null];
    foreach ($codMaterias as $mc) {
        foreach ($lista as $g) {
            $a->bind_param('iis', $profesor, $mc, $g);
            if (!$a->execute()) {
                $a->close();
                return false;
            }
        }
    }
    $a->close();
    return true;
}

/* ---------- Apellidos y fecha de nacimiento ----------
   Qué hace: Revisa que los apellidos (opcionales) no sean demasiado largos, y que la fecha de nacimiento (opcional, AAAA-MM-DD) sea real, no sea futura y no sea anterior a 1900. Si algo está mal, avisa y corta.
   Por qué: Son datos opcionales, pero si se escriben tienen que ser válidos. */
// Apellidos (opcional) y fecha de nacimiento (opcional, AAAA-MM-DD). Si algo está mal, avisa y corta.
function validar_apellidos($apellidos) {
    if (largo($apellidos) > 100) {
        fallar('Los apellidos son demasiado largos.');
    }
}

function validar_nacimiento($nacimiento) {
    if ($nacimiento === '') {
        return null;
    }
    $d = DateTime::createFromFormat('Y-m-d', $nacimiento);
    $ok = $d && $d->format('Y-m-d') === $nacimiento;
    if (!$ok || $nacimiento > date('Y-m-d') || $nacimiento < '1900-01-01') {
        fallar('La fecha de nacimiento no es válida.');
    }
    return $nacimiento;
}

/* ---------- Todas las cuentas (administrador) ----------
   Qué hace: Junta las cuentas de los 4 roles en una sola lista, en versión completa.
   Por qué: Son 4 consultas en total; el administrador ve todo. */
// Para el administrador: todas las cuentas (versión completa), 4 consultas en total
function listar_todos($conexion) {
    $salida = [];
    foreach (ROLES as $rol => $info) {
        foreach (cargar_lista($conexion, $rol) as $u) {
            $salida[] = $u;
        }
    }
    return $salida;
}

/* ---------- Estudiantes de un profesor ----------
   Qué hace: Devuelve los estudiantes de los grupos que atiende el profesor (o todos si no tiene límite), en versión pública.
   Por qué: Un profesor solo debe ver a los estudiantes que le corresponden, y sin sus datos privados. */
// Para un profesor: los estudiantes de los grupos que atiende (sin grupos = todos), versión pública
function listar_estudiantes_de_profesor($conexion, $yo) {
    $grupos = isset($yo['groups']) ? $yo['groups'] : [];
    if ($grupos) {
        $marcas = implode(',', array_fill(0, count($grupos), '?'));
        return cargar_lista($conexion, 'estudiante', "WHERE est_gru_grupo IN ($marcas)", str_repeat('s', count($grupos)), $grupos, true);
    }
    return cargar_lista($conexion, 'estudiante', '', '', [], true);
}

/* ---------- Profesores de un grupo ----------
   Qué hace: Devuelve los profesores aprobados que atienden el grupo del estudiante (o que no tienen límite de grupo), en versión pública.
   Por qué: Un estudiante solo debe ver a sus profesores, y solo a los ya aprobados. */
// Para un estudiante: los profesores APROBADOS que atienden su grupo, versión pública
function listar_profesores_de_grupo($conexion, $grupo) {
    return cargar_lista(
        $conexion,
        'profesor',
        "WHERE pro_estado = 'aprobado' AND pro_codigo IN (SELECT asi_pro_profesor FROM asignaciones WHERE asi_gru_grupo = ? OR asi_gru_grupo IS NULL)",
        's',
        [$grupo],
        true
    );
}