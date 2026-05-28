DROP DATABASE IF EXISTS gymcore;
CREATE DATABASE gymcore;
USE gymcore;

CREATE TABLE usuarios(
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(50) NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    sexo ENUM('M','F','O'),
    objetivo_general VARCHAR(100) NOT NULL,
    fecha_registro DATE DEFAULT (CURRENT_DATE),
    estado ENUM('activo','inactivo') DEFAULT 'activo'
);

CREATE TABLE entrenadores(
    id_entrenador INT AUTO_INCREMENT PRIMARY KEY,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(50) NOT NULL UNIQUE,
    especialidad VARCHAR(50),
    fecha_registro DATE DEFAULT(CURRENT_DATE),
    estado ENUM('activo','inactivo') DEFAULT 'activo'
);

CREATE TABLE tipo_mensualidad(
    id_tipo_mensualidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    duracion_meses INT NOT NULL,
    descripcion VARCHAR(50)
);

CREATE TABLE dias(
    id_dia INT AUTO_INCREMENT PRIMARY KEY,
    nombre_dia VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE membresia_usuario(
    id_membresia INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_mensualidad_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('activa','vencida','cancelada') DEFAULT 'activa',

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (tipo_mensualidad_id) REFERENCES tipo_mensualidad(id_tipo_mensualidad)
);

CREATE TABLE rutinas(
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150),
    nivel ENUM('principiante','intermedio','avanzado') NOT NULL,
    objetivo VARCHAR(100) NOT NULL,
    duracion_semanas INT,
    entrenador_id INT NOT NULL,
    estado ENUM('activa','inactiva') DEFAULT 'activa',

    FOREIGN KEY (entrenador_id) REFERENCES entrenadores(id_entrenador) ON DELETE CASCADE
);

CREATE TABLE ejercicios (
    id_ejercicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    grupo_muscular VARCHAR(50) NOT NULL,
    estado ENUM('activo','inactivo') DEFAULT 'activo'
);

CREATE TABLE rutina_ejercicio(
    id_rutina_ejercicio INT AUTO_INCREMENT PRIMARY KEY,
    rutina_id INT NOT NULL,
    ejercicio_id INT NOT NULL,
    series INT NOT NULL,
    repeticiones INT NOT NULL,
    orden INT NOT NULL,

    UNIQUE (rutina_id, ejercicio_id),

    FOREIGN KEY (rutina_id) REFERENCES rutinas(id_rutina) ON DELETE CASCADE,
    FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id_ejercicio)
);

CREATE TABLE dietas(
    id_dieta INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    objetivo VARCHAR(100) NOT NULL,
    entrenador_id INT NOT NULL,
    estado ENUM('activa','inactiva') DEFAULT 'activa',

    FOREIGN KEY (entrenador_id) REFERENCES entrenadores(id_entrenador) ON DELETE CASCADE
);

CREATE TABLE clases (
    id_clase INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150),
    entrenador_id INT NOT NULL,
    cupo_maximo INT,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado ENUM('activa','inactiva') DEFAULT 'activa',

    FOREIGN KEY (entrenador_id) REFERENCES entrenadores(id_entrenador) ON DELETE CASCADE
);

CREATE TABLE clase_dias (
    id_clase_dia INT AUTO_INCREMENT PRIMARY KEY,
    clase_id INT NOT NULL,
    dia_id INT NOT NULL,

    UNIQUE (clase_id, dia_id),

    FOREIGN KEY (clase_id) REFERENCES clases(id_clase) ON DELETE CASCADE,
    FOREIGN KEY (dia_id) REFERENCES dias(id_dia)
);

CREATE TABLE asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha DATE DEFAULT (CURRENT_DATE),
    hora_entrada TIME,
    hora_salida TIME,

    UNIQUE (usuario_id, fecha),

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE seguimiento_medidas(
    id_medicion INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha DATE DEFAULT (CURRENT_DATE),
    peso DECIMAL(5,2) NOT NULL,
    medida_brazo DECIMAL(5,2),
    medida_pecho DECIMAL(5,2),
    medida_pierna DECIMAL(5,2),
    observacion VARCHAR(150),
    entrenador_id INT,

    UNIQUE (usuario_id, fecha),

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (entrenador_id) REFERENCES entrenadores(id_entrenador)
);


CREATE TABLE usuarios_rutinas(
id_usuario_rutina INT AUTO_INCREMENT PRIMARY KEY,
usuario_id INT NOT NULL,
rutina_id INT NOT NULL,
dia_id INT NOT NULL,
fecha_asignacion DATE DEFAULT (CURRENT_DATE),
estado ENUM('activa','inactiva') DEFAULT 'activa',

FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,

FOREIGN KEY (rutina_id) REFERENCES rutinas(id_rutina) ON DELETE CASCADE,

FOREIGN KEY (dia_id) REFERENCES dias(id_dia),

UNIQUE (usuario_id,dia_id)
);

CREATE TABLE usuarios_clases(
    id_usuario_clase INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    clase_id INT NOT NULL,
    fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa','cancelada') DEFAULT 'activa',

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (clase_id) REFERENCES clases(id_clase) ON DELETE CASCADE
);

-- insercion de datos minimos 

INSERT INTO dias(nombre_dia) VALUES
('lunes'), ('martes'), ('miercoles'), ('jueves'),
('viernes'), ('sabado'), ('domingo');

INSERT INTO tipo_mensualidad (nombre, duracion_meses) VALUES
('mensual', 1), ('trimestral', 3), ('anual', 12);

INSERT INTO entrenadores(cedula, nombre, apellido, telefono, correo)
VALUES ('1001', 'Carlos', 'Lopez', '3001234567', 'carlos@gym.com');

INSERT INTO usuarios (cedula, nombre, apellido, telefono, correo, objetivo_general)
VALUES
('2001', 'Juan', 'Perez', '3007654321', 'juan@gmail.com', 'ganar masa muscular');


INSERT INTO membresia_usuario (usuario_id, tipo_mensualidad_id, fecha_inicio, fecha_fin)
VALUES (1,1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH));

INSERT INTO rutinas(nombre, nivel, objetivo, entrenador_id)
VALUES
('tren superior','principiante', 'fuerza', 1),
('pierna', 'principiante', 'resistencia',1);


INSERT INTO ejercicios (nombre, grupo_muscular) VALUES
('press banca', 'pecho'),
('curl biceps', 'biceps'),
('sentadilla', 'pierna');


INSERT INTO rutina_ejercicio (rutina_id, ejercicio_id, series, repeticiones, orden)
VALUES
(1, 1, 4, 10, 1),
(1, 2, 3, 12, 2),
(2, 3, 4, 10, 1);

INSERT INTO usuarios_rutinas (usuario_id, rutina_id, dia_id)
VALUES
(1, 1, 1),
(1, 2, 2);


SELECT d.nombre_dia, r.nombre AS rutina
FROM usuarios_rutinas ur
JOIN rutinas r ON ur.rutina_id = r.id_rutina
JOIN dias d ON ur.dia_id = d.id_dia
WHERE ur.usuario_id = 1;

SELECT r.nombre, e.nombre, re.series, re.repeticiones
FROM rutina_ejercicio re
JOIN ejercicios e ON re.ejercicio_id = e.id_ejercicio
JOIN rutinas r ON re.rutina_id = r.id_rutina;




