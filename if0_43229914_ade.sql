-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Servidor: sql302.infinityfree.com
-- Tiempo de generación: 25-10-2026 a las 18:35:44
-- Versión del servidor: 11.4.13-MariaDB
-- Versión de PHP: 7.2.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `if0_43229914_ade`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `actividades`
--

CREATE TABLE `actividades` (
  `act_codigo` int(11) NOT NULL,
  `act_titulo` varchar(150) NOT NULL,
  `act_descripcion` text DEFAULT NULL,
  `act_mat_materia` int(11) NOT NULL,
  `act_gru_grupo` varchar(5) DEFAULT NULL,
  `act_fecha` date DEFAULT NULL,
  `act_hora` time DEFAULT '23:59:00',
  `act_pro_profesor` int(11) DEFAULT NULL,
  `act_adm_administrador` int(11) DEFAULT NULL,
  `act_creada` datetime DEFAULT current_timestamp(),
  `act_archivo_nombre` varchar(255) DEFAULT NULL,
  `act_archivo_ruta` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `acudientes`
--

CREATE TABLE `acudientes` (
  `acu_codigo` int(11) NOT NULL,
  `acu_nombre` varchar(100) NOT NULL,
  `acu_apellidos` varchar(100) NOT NULL DEFAULT '',
  `acu_nacimiento` date DEFAULT NULL,
  `acu_usuario` varchar(40) NOT NULL,
  `acu_correo` varchar(120) NOT NULL,
  `acu_clave` varchar(255) NOT NULL,
  `acu_foto` varchar(255) DEFAULT NULL,
  `acu_gru_grupo` varchar(5) DEFAULT NULL,
  `acu_creado` datetime DEFAULT current_timestamp(),
  `acu_correo_verificado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `administradores`
--

CREATE TABLE `administradores` (
  `adm_codigo` int(11) NOT NULL,
  `adm_nombre` varchar(100) NOT NULL,
  `adm_apellidos` varchar(100) NOT NULL DEFAULT '',
  `adm_nacimiento` date DEFAULT NULL,
  `adm_usuario` varchar(40) NOT NULL,
  `adm_correo` varchar(120) NOT NULL,
  `adm_clave` varchar(255) NOT NULL,
  `adm_foto` varchar(255) DEFAULT NULL,
  `adm_creado` datetime DEFAULT current_timestamp(),
  `adm_correo_verificado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignaciones`
--

CREATE TABLE `asignaciones` (
  `asi_codigo` int(11) NOT NULL,
  `asi_pro_profesor` int(11) NOT NULL,
  `asi_mat_materia` int(11) NOT NULL,
  `asi_gru_grupo` varchar(5) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigos_correo`
--

CREATE TABLE `codigos_correo` (
  `cod_codigo` int(11) NOT NULL,
  `cod_correo` varchar(120) NOT NULL,
  `cod_tipo` varchar(12) NOT NULL,
  `cod_hash` varchar(255) NOT NULL,
  `cod_datos` mediumtext DEFAULT NULL,
  `cod_intentos` tinyint(4) NOT NULL DEFAULT 0,
  `cod_expira` int(11) NOT NULL,
  `cod_creado` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `entregas`
--

CREATE TABLE `entregas` (
  `ent_codigo` int(11) NOT NULL,
  `ent_act_actividad` int(11) NOT NULL,
  `ent_est_estudiante` int(11) NOT NULL,
  `ent_archivo_nombre` varchar(255) NOT NULL,
  `ent_archivo_ruta` varchar(500) NOT NULL,
  `ent_fecha` datetime DEFAULT current_timestamp(),
  `ent_tarde` tinyint(4) DEFAULT 0,
  `ent_nota` decimal(2,1) DEFAULT NULL,
  `ent_comentario` varchar(300) DEFAULT NULL,
  `ent_calificada` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estudiantes`
--

CREATE TABLE `estudiantes` (
  `est_codigo` int(11) NOT NULL,
  `est_nombre` varchar(100) NOT NULL,
  `est_apellidos` varchar(100) NOT NULL DEFAULT '',
  `est_nacimiento` date DEFAULT NULL,
  `est_usuario` varchar(40) NOT NULL,
  `est_correo` varchar(120) NOT NULL,
  `est_clave` varchar(255) NOT NULL,
  `est_foto` varchar(255) DEFAULT NULL,
  `est_gru_grupo` varchar(5) NOT NULL,
  `est_creado` datetime DEFAULT current_timestamp(),
  `est_acu_correo` varchar(120) DEFAULT NULL,
  `est_acu_verificado` tinyint(1) NOT NULL DEFAULT 0,
  `est_correo_verificado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos`
--

CREATE TABLE `eventos` (
  `eve_codigo` int(11) NOT NULL,
  `eve_titulo` varchar(150) NOT NULL,
  `eve_descripcion` text DEFAULT NULL,
  `eve_fecha` date NOT NULL,
  `eve_tipo` varchar(10) DEFAULT 'colegio',
  `eve_gru_grupo` varchar(5) DEFAULT NULL,
  `eve_pro_profesor` int(11) DEFAULT NULL,
  `eve_adm_administrador` int(11) DEFAULT NULL,
  `eve_lote` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupos`
--

CREATE TABLE `grupos` (
  `gru_codigo` varchar(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horarios`
--

CREATE TABLE `horarios` (
  `hor_codigo` int(11) NOT NULL,
  `hor_gru_grupo` varchar(5) NOT NULL,
  `hor_mat_materia` int(11) NOT NULL,
  `hor_pro_profesor` int(11) DEFAULT NULL,
  `hor_dia` varchar(10) NOT NULL,
  `hor_inicio` time NOT NULL,
  `hor_fin` time NOT NULL,
  `hor_salon` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `intentos_login`
--

CREATE TABLE `intentos_login` (
  `int_codigo` int(11) NOT NULL,
  `int_ip` varchar(45) NOT NULL,
  `int_clave` varchar(120) NOT NULL,
  `int_tiempo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lecturas`
--

CREATE TABLE `lecturas` (
  `lec_codigo` int(11) NOT NULL,
  `lec_not_notificacion` int(11) NOT NULL,
  `lec_est_estudiante` int(11) DEFAULT NULL,
  `lec_pro_profesor` int(11) DEFAULT NULL,
  `lec_adm_administrador` int(11) DEFAULT NULL,
  `lec_leida` datetime DEFAULT current_timestamp(),
  `lec_acu_acudiente` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materias`
--

CREATE TABLE `materias` (
  `mat_codigo` int(11) NOT NULL,
  `mat_nombre` varchar(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `not_codigo` int(11) NOT NULL,
  `not_tipo` varchar(20) DEFAULT 'aviso',
  `not_titulo` varchar(150) NOT NULL,
  `not_texto` varchar(300) DEFAULT NULL,
  `not_pagina` varchar(20) DEFAULT NULL,
  `not_gru_grupo` varchar(5) DEFAULT NULL,
  `not_est_estudiante` int(11) DEFAULT NULL,
  `not_pro_profesor` int(11) DEFAULT NULL,
  `not_para_admin` tinyint(4) DEFAULT 0,
  `not_creada` datetime DEFAULT current_timestamp(),
  `not_autor_rol` varchar(12) DEFAULT NULL,
  `not_autor_codigo` int(11) DEFAULT NULL,
  `not_autor_nombre` varchar(100) DEFAULT NULL,
  `not_lote` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profesores`
--

CREATE TABLE `profesores` (
  `pro_codigo` int(11) NOT NULL,
  `pro_nombre` varchar(100) NOT NULL,
  `pro_apellidos` varchar(100) NOT NULL DEFAULT '',
  `pro_nacimiento` date DEFAULT NULL,
  `pro_usuario` varchar(40) NOT NULL,
  `pro_correo` varchar(120) NOT NULL,
  `pro_clave` varchar(255) NOT NULL,
  `pro_foto` varchar(255) DEFAULT NULL,
  `pro_creado` datetime DEFAULT current_timestamp(),
  `pro_correo_verificado` tinyint(1) NOT NULL DEFAULT 0,
  `pro_estado` enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `actividades`
--
ALTER TABLE `actividades`
  ADD PRIMARY KEY (`act_codigo`),
  ADD KEY `act_mat_materia` (`act_mat_materia`),
  ADD KEY `act_gru_grupo` (`act_gru_grupo`),
  ADD KEY `act_pro_profesor` (`act_pro_profesor`),
  ADD KEY `act_adm_administrador` (`act_adm_administrador`);

--
-- Indices de la tabla `acudientes`
--
ALTER TABLE `acudientes`
  ADD PRIMARY KEY (`acu_codigo`),
  ADD UNIQUE KEY `acu_usuario` (`acu_usuario`),
  ADD UNIQUE KEY `acu_correo` (`acu_correo`),
  ADD KEY `acu_gru_grupo` (`acu_gru_grupo`);

--
-- Indices de la tabla `administradores`
--
ALTER TABLE `administradores`
  ADD PRIMARY KEY (`adm_codigo`),
  ADD UNIQUE KEY `adm_usuario` (`adm_usuario`),
  ADD UNIQUE KEY `adm_correo` (`adm_correo`);

--
-- Indices de la tabla `asignaciones`
--
ALTER TABLE `asignaciones`
  ADD PRIMARY KEY (`asi_codigo`),
  ADD KEY `asi_pro_profesor` (`asi_pro_profesor`),
  ADD KEY `asi_mat_materia` (`asi_mat_materia`),
  ADD KEY `asi_gru_grupo` (`asi_gru_grupo`);

--
-- Indices de la tabla `codigos_correo`
--
ALTER TABLE `codigos_correo`
  ADD PRIMARY KEY (`cod_codigo`),
  ADD KEY `idx_correo_tipo` (`cod_correo`,`cod_tipo`);

--
-- Indices de la tabla `entregas`
--
ALTER TABLE `entregas`
  ADD PRIMARY KEY (`ent_codigo`),
  ADD UNIQUE KEY `ent_act_actividad` (`ent_act_actividad`,`ent_est_estudiante`),
  ADD KEY `ent_est_estudiante` (`ent_est_estudiante`);

--
-- Indices de la tabla `estudiantes`
--
ALTER TABLE `estudiantes`
  ADD PRIMARY KEY (`est_codigo`),
  ADD UNIQUE KEY `est_usuario` (`est_usuario`),
  ADD UNIQUE KEY `est_correo` (`est_correo`),
  ADD KEY `est_gru_grupo` (`est_gru_grupo`);

--
-- Indices de la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD PRIMARY KEY (`eve_codigo`),
  ADD KEY `eve_gru_grupo` (`eve_gru_grupo`),
  ADD KEY `eve_pro_profesor` (`eve_pro_profesor`),
  ADD KEY `eve_adm_administrador` (`eve_adm_administrador`);

--
-- Indices de la tabla `grupos`
--
ALTER TABLE `grupos`
  ADD PRIMARY KEY (`gru_codigo`);

--
-- Indices de la tabla `horarios`
--
ALTER TABLE `horarios`
  ADD PRIMARY KEY (`hor_codigo`),
  ADD KEY `hor_gru_grupo` (`hor_gru_grupo`),
  ADD KEY `hor_mat_materia` (`hor_mat_materia`),
  ADD KEY `hor_pro_profesor` (`hor_pro_profesor`);

--
-- Indices de la tabla `intentos_login`
--
ALTER TABLE `intentos_login`
  ADD PRIMARY KEY (`int_codigo`),
  ADD KEY `int_ip_tiempo` (`int_ip`,`int_tiempo`),
  ADD KEY `int_clave_tiempo` (`int_clave`,`int_tiempo`);

--
-- Indices de la tabla `lecturas`
--
ALTER TABLE `lecturas`
  ADD PRIMARY KEY (`lec_codigo`),
  ADD KEY `lec_not_notificacion` (`lec_not_notificacion`),
  ADD KEY `lec_est_estudiante` (`lec_est_estudiante`),
  ADD KEY `lec_pro_profesor` (`lec_pro_profesor`),
  ADD KEY `lec_adm_administrador` (`lec_adm_administrador`),
  ADD KEY `lec_acu_acudiente` (`lec_acu_acudiente`);

--
-- Indices de la tabla `materias`
--
ALTER TABLE `materias`
  ADD PRIMARY KEY (`mat_codigo`),
  ADD UNIQUE KEY `mat_nombre` (`mat_nombre`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`not_codigo`),
  ADD KEY `not_gru_grupo` (`not_gru_grupo`),
  ADD KEY `not_est_estudiante` (`not_est_estudiante`),
  ADD KEY `not_pro_profesor` (`not_pro_profesor`);

--
-- Indices de la tabla `profesores`
--
ALTER TABLE `profesores`
  ADD PRIMARY KEY (`pro_codigo`),
  ADD UNIQUE KEY `pro_usuario` (`pro_usuario`),
  ADD UNIQUE KEY `pro_correo` (`pro_correo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `actividades`
--
ALTER TABLE `actividades`
  MODIFY `act_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `acudientes`
--
ALTER TABLE `acudientes`
  MODIFY `acu_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `administradores`
--
ALTER TABLE `administradores`
  MODIFY `adm_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `asignaciones`
--
ALTER TABLE `asignaciones`
  MODIFY `asi_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `codigos_correo`
--
ALTER TABLE `codigos_correo`
  MODIFY `cod_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `entregas`
--
ALTER TABLE `entregas`
  MODIFY `ent_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `estudiantes`
--
ALTER TABLE `estudiantes`
  MODIFY `est_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `eventos`
--
ALTER TABLE `eventos`
  MODIFY `eve_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `horarios`
--
ALTER TABLE `horarios`
  MODIFY `hor_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `intentos_login`
--
ALTER TABLE `intentos_login`
  MODIFY `int_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `lecturas`
--
ALTER TABLE `lecturas`
  MODIFY `lec_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `materias`
--
ALTER TABLE `materias`
  MODIFY `mat_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `not_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `profesores`
--
ALTER TABLE `profesores`
  MODIFY `pro_codigo` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `actividades`
--
ALTER TABLE `actividades`
  ADD CONSTRAINT `actividades_ibfk_1` FOREIGN KEY (`act_mat_materia`) REFERENCES `materias` (`mat_codigo`),
  ADD CONSTRAINT `actividades_ibfk_2` FOREIGN KEY (`act_gru_grupo`) REFERENCES `grupos` (`gru_codigo`),
  ADD CONSTRAINT `actividades_ibfk_3` FOREIGN KEY (`act_pro_profesor`) REFERENCES `profesores` (`pro_codigo`) ON DELETE SET NULL,
  ADD CONSTRAINT `actividades_ibfk_4` FOREIGN KEY (`act_adm_administrador`) REFERENCES `administradores` (`adm_codigo`) ON DELETE SET NULL;

--
-- Filtros para la tabla `acudientes`
--
ALTER TABLE `acudientes`
  ADD CONSTRAINT `acudientes_ibfk_1` FOREIGN KEY (`acu_gru_grupo`) REFERENCES `grupos` (`gru_codigo`);

--
-- Filtros para la tabla `asignaciones`
--
ALTER TABLE `asignaciones`
  ADD CONSTRAINT `asignaciones_ibfk_1` FOREIGN KEY (`asi_pro_profesor`) REFERENCES `profesores` (`pro_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `asignaciones_ibfk_2` FOREIGN KEY (`asi_mat_materia`) REFERENCES `materias` (`mat_codigo`),
  ADD CONSTRAINT `asignaciones_ibfk_3` FOREIGN KEY (`asi_gru_grupo`) REFERENCES `grupos` (`gru_codigo`);

--
-- Filtros para la tabla `entregas`
--
ALTER TABLE `entregas`
  ADD CONSTRAINT `entregas_ibfk_1` FOREIGN KEY (`ent_act_actividad`) REFERENCES `actividades` (`act_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `entregas_ibfk_2` FOREIGN KEY (`ent_est_estudiante`) REFERENCES `estudiantes` (`est_codigo`) ON DELETE CASCADE;

--
-- Filtros para la tabla `estudiantes`
--
ALTER TABLE `estudiantes`
  ADD CONSTRAINT `estudiantes_ibfk_1` FOREIGN KEY (`est_gru_grupo`) REFERENCES `grupos` (`gru_codigo`);

--
-- Filtros para la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD CONSTRAINT `eventos_ibfk_1` FOREIGN KEY (`eve_gru_grupo`) REFERENCES `grupos` (`gru_codigo`),
  ADD CONSTRAINT `eventos_ibfk_2` FOREIGN KEY (`eve_pro_profesor`) REFERENCES `profesores` (`pro_codigo`) ON DELETE SET NULL,
  ADD CONSTRAINT `eventos_ibfk_3` FOREIGN KEY (`eve_adm_administrador`) REFERENCES `administradores` (`adm_codigo`) ON DELETE SET NULL;

--
-- Filtros para la tabla `horarios`
--
ALTER TABLE `horarios`
  ADD CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`hor_gru_grupo`) REFERENCES `grupos` (`gru_codigo`),
  ADD CONSTRAINT `horarios_ibfk_2` FOREIGN KEY (`hor_mat_materia`) REFERENCES `materias` (`mat_codigo`),
  ADD CONSTRAINT `horarios_ibfk_3` FOREIGN KEY (`hor_pro_profesor`) REFERENCES `profesores` (`pro_codigo`) ON DELETE SET NULL;

--
-- Filtros para la tabla `lecturas`
--
ALTER TABLE `lecturas`
  ADD CONSTRAINT `lecturas_ibfk_1` FOREIGN KEY (`lec_not_notificacion`) REFERENCES `notificaciones` (`not_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecturas_ibfk_2` FOREIGN KEY (`lec_est_estudiante`) REFERENCES `estudiantes` (`est_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecturas_ibfk_3` FOREIGN KEY (`lec_pro_profesor`) REFERENCES `profesores` (`pro_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecturas_ibfk_4` FOREIGN KEY (`lec_adm_administrador`) REFERENCES `administradores` (`adm_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `lecturas_ibfk_5` FOREIGN KEY (`lec_acu_acudiente`) REFERENCES `acudientes` (`acu_codigo`) ON DELETE CASCADE;

--
-- Filtros para la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`not_gru_grupo`) REFERENCES `grupos` (`gru_codigo`),
  ADD CONSTRAINT `notificaciones_ibfk_2` FOREIGN KEY (`not_est_estudiante`) REFERENCES `estudiantes` (`est_codigo`) ON DELETE CASCADE,
  ADD CONSTRAINT `notificaciones_ibfk_3` FOREIGN KEY (`not_pro_profesor`) REFERENCES `profesores` (`pro_codigo`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
