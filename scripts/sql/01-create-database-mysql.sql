-- ============================================================
-- Script 01: Create Database (MySQL)
-- Confera Event Management System
-- ============================================================

DROP DATABASE IF EXISTS confera_event_management;

CREATE DATABASE confera_event_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE confera_event_management;

SELECT 'Database confera_event_management created successfully.' AS message;
