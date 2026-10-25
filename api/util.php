<?php
require __DIR__ . '/conexion.php';

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const ROLES = [
    'admin'      => ['administradores', 'adm'],
    'profesor'   => ['profesores', 'pro'],
    'estudiante' => ['estudiantes', 'est'],
    'acudiente'  => ['acudientes', 'acu']
];

function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function fallar($mensaje, $codigo = 400) {
    responder(['ok' => false, 'error' => $mensaje], $codigo);
}

function solo_post() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fallar('Metodo no permitido.', 405);
    }
}

function entrada() {
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

function exigir_sesion() {
    if (empty($_SESSION['rol']) || empty($_SESSION['codigo'])) {
        fallar('Debes iniciar sesion.', 401);
    }
}

function exigir_admin() {
    exigir_sesion();
    if ($_SESSION['rol'] !== 'admin') {
        fallar('No tienes permiso para hacer esto.', 403);
    }
}

function largo($texto) {
    return function_exists('mb_strlen') ? mb_strlen($texto, 'UTF-8') : strlen($texto);
}

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
        "SELECT {$p}_codigo AS codigo, {$p}_nombre AS nombre, {$p}_apellidos AS apellidos, {$p}_nacimiento AS nacimiento, {$p}_usuario AS usuario, {$p}_correo AS correo, {$p}_creado AS creado, {$p}_foto AS foto, {$p}_correo_verificado AS verificado{$extra} FROM {$tabla} {$donde} ORDER BY {$p}_codigo",
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

// Una sola cuenta. Por defecto devuelve la versión completa: úsala solo para la propia persona o el admin.
function cargar_usuario($conexion, $rol, $codigo, $publico = false) {
    if (!isset(ROLES[$rol])) {
        return null;
    }
    $p = ROLES[$rol][1];
    $l = cargar_lista($conexion, $rol, "WHERE {$p}_codigo = ?", 'i', [(int)$codigo], $publico);
    return $l ? $l[0] : null;
}

// Un profesor solo puede usar el sistema si el administrador ya lo aprobó
function cuenta_activa($u) {
    return $u && ($u['role'] !== 'profesor' || ($u['estado'] ?? '') === 'aprobado');
}


/* ---------------------------------------------------------
   Funciones que usan los demás archivos de la carpeta api
   --------------------------------------------------------- */

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

function preparar_carpeta($dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

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

// Para un profesor: los estudiantes de los grupos que atiende (sin grupos = todos), versión pública
function listar_estudiantes_de_profesor($conexion, $yo) {
    $grupos = isset($yo['groups']) ? $yo['groups'] : [];
    if ($grupos) {
        $marcas = implode(',', array_fill(0, count($grupos), '?'));
        return cargar_lista($conexion, 'estudiante', "WHERE est_gru_grupo IN ($marcas)", str_repeat('s', count($grupos)), $grupos, true);
    }
    return cargar_lista($conexion, 'estudiante', '', '', [], true);
}

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