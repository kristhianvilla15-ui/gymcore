const mysql = require('mysql2'); //importamos el traductor para hablar con mysql
require('dotenv').config(); //carga las variables del .env

//configuramos un grupo de conexiones (pool) para que el API sea mas rapido

const pool = mysql.createPool({
    host: process.env.DB_HOST,//la direccion 
    user: process.env.DB_USER,//Usuario root
    password: process.env.DB_PASSWORD,//contraseña
    database: process.env.DB_NAME,//nombre de la db

    waitForConnections: true, // si esta lleno, espera a que se libere una conexion
    connectionLimit: 10 //maximo 10 conexiones simultaneas
});

//exportamos el pool usando promesas para poder usar await en otros archivos
module.exports = pool.promise();