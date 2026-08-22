-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: bd_imav
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `tipo_cliente` enum('NIT','CI','EXTRANJERO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ci` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pasaporte` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pais_origen` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `uq_nit` (`nit`),
  UNIQUE KEY `uq_ci` (`ci`),
  UNIQUE KEY `uq_pasaporte` (`pasaporte`),
  CONSTRAINT `chk_datos_por_tipo` CHECK ((((`tipo_cliente` = _utf8mb4'NIT') and (`nit` is not null)) or ((`tipo_cliente` = _utf8mb4'CI') and (`ci` is not null)) or ((`tipo_cliente` = _utf8mb4'EXTRANJERO') and (`pasaporte` is not null) and (`pais_origen` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_proforma`
--

DROP TABLE IF EXISTS `detalles_proforma`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_proforma` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_proforma` int NOT NULL,
  `id_item` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) GENERATED ALWAYS AS ((`cantidad` * `precio_unitario`)) STORED,
  PRIMARY KEY (`id_detalle`),
  KEY `id_proforma` (`id_proforma`),
  KEY `id_item` (`id_item`),
  CONSTRAINT `detalles_proforma_ibfk_1` FOREIGN KEY (`id_proforma`) REFERENCES `proformas` (`id_proforma`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `detalles_proforma_ibfk_2` FOREIGN KEY (`id_item`) REFERENCES `items_taller` (`id_item`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `detalles_proforma_chk_1` CHECK ((`cantidad` > 0)),
  CONSTRAINT `detalles_proforma_chk_2` CHECK ((`precio_unitario` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `ci` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paterno` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `materno` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol` enum('RECEPCIONISTA','MECANICO','ADMINISTRADOR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('ACTIVO','INACTIVO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `uq_ci_empleado` (`ci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_completo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('ADMINISTRADOR','USUARIO','LECTURA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LECTURA',
  `id_empleado` int DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uq_username` (`username`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `fk_usuario_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ingresos_taller`
--

DROP TABLE IF EXISTS `ingresos_taller`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingresos_taller` (
  `id_ingreso` int NOT NULL AUTO_INCREMENT,
  `id_vehiculo` int NOT NULL,
  `id_empleado_receptor` int NOT NULL,
  `id_mecanico_asignado` int NOT NULL,
  `fecha_ingreso` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `kilometraje` int NOT NULL,
  `nivel_combustible` enum('VACIO','1/4','1/2','3/4','LLENO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `observaciones_estado` text COLLATE utf8mb4_unicode_ci,
  `deja_accesorios` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `falla_reportada` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_ingreso` enum('EN_REVISION','EN_TRABAJO','TERMINADO','ENTREGADO') COLLATE utf8mb4_unicode_ci DEFAULT 'EN_REVISION',
  `fecha_salida` datetime DEFAULT NULL,
  PRIMARY KEY (`id_ingreso`),
  KEY `id_vehiculo` (`id_vehiculo`),
  KEY `id_empleado_receptor` (`id_empleado_receptor`),
  KEY `id_mecanico_asignado` (`id_mecanico_asignado`),
  CONSTRAINT `ingresos_taller_ibfk_1` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ingresos_taller_ibfk_2` FOREIGN KEY (`id_empleado_receptor`) REFERENCES `empleados` (`id_empleado`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ingresos_taller_ibfk_3` FOREIGN KEY (`id_mecanico_asignado`) REFERENCES `empleados` (`id_empleado`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ingresos_taller_chk_1` CHECK ((`kilometraje` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items_taller`
--

DROP TABLE IF EXISTS `items_taller`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items_taller` (
  `id_item` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_item` enum('REPUESTO','SERVICIO') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_item`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=1024 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proformas`
--

DROP TABLE IF EXISTS `proformas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proformas` (
  `id_proforma` int NOT NULL AUTO_INCREMENT,
  `id_ingreso` int NOT NULL,
  `fecha_emision` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `monto_total` decimal(10,2) DEFAULT '0.00',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `numero_proforma` int DEFAULT NULL,
  PRIMARY KEY (`id_proforma`),
  KEY `id_ingreso` (`id_ingreso`),
  CONSTRAINT `proformas_ibfk_1` FOREIGN KEY (`id_ingreso`) REFERENCES `ingresos_taller` (`id_ingreso`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repuestos`
--

DROP TABLE IF EXISTS `repuestos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repuestos` (
  `id_item` int NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `stock_actual` int DEFAULT '0',
  PRIMARY KEY (`id_item`),
  CONSTRAINT `repuestos_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `items_taller` (`id_item`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `servicios`
--

DROP TABLE IF EXISTS `servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios` (
  `id_item` int NOT NULL,
  `precio_base` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_item`),
  CONSTRAINT `servicios_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `items_taller` (`id_item`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehiculos`
--

DROP TABLE IF EXISTS `vehiculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehiculos` (
  `id_vehiculo` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `placa` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `anio` int DEFAULT NULL,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `uq_placa` (`placa`),
  KEY `id_cliente` (`id_cliente`),
  CONSTRAINT `vehiculos_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 16:51:53
