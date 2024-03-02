// Supports ES6
// import { create, Whatsapp } from 'venom-bot';
//importacion de modulos: uuid, venom, mysql2, moment, admin firebase
//importacion de archivos: dialogflow, responsemappings, sessionIds como objeto de mapeo, serviceAccount como credenciales de firebase
const uuid = require("uuid");
const venom = require('venom-bot');
const dialogflow=require("./dialogflow");
const sessionIds = new Map(); //asociar ID diferente para cada numero de wssp
const responseMappings = require('./responseMappings'); // mapping de modificacion de respuestas
const mysql = require('mysql2/promise');
const moment = require('moment');
const admin = require('firebase-admin');
const serviceAccount = require('./qrimgfbs.json');
//////////////////////////////////////////////////////////////// Inicio de funcion de control de log.txt
/*function enviarLogMain(log) {
  process.emit('mensaje-log', log);
}
// Sobrescribe console.log
/*console.log = function () {
  for (let i = 0; i < arguments.length; i++) {
    enviarLogMain({ tipo: 'log', mensaje: arguments[i] });
  }
};
// Sobrescribe console.error
/*console.error = function () {
  for (let i = 0; i < arguments.length; i++) {
    enviarLogMain({ tipo: 'error', mensaje: arguments[i] });
  }
};*/
//////////////////////////////////////////////////////////////// Fin de funcion de control de log.txt
//////////////////////////////////////////////////////////////// Inicio Bloque de Comunicación con Firebasestorage
  /*admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://qrimgbotutn.appspot.com'
  });
  const bucket = admin.storage().bucket();*/
//////////////////////////////////////////////////////////////// Fin Bloque de Comunicación con Firebasestorage
//////////////////////////////////////////////////////////////// Inicio Bloque principal de libreria Venom-bot
  venom
  .create(
    'Agente Virtual Whatsapp UTN',
    (base64Qr, asciiQR, attempts, urlCode) => {
      console.log(asciiQR); 
      var matches = base64Qr.match(/^data:([A-Za-z-+/]+);base64,(.+)$/),
        response = {};

      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');
      var imageBuffer = response;
      require('fs').writeFile(
        'out.png',
        imageBuffer['data'],
        'binary',
        function (err) {
          if (err != null) {
            console.log(err);
          }
          //////////////////////////////////////////////////////////////// Inicio subir out.png a firebasestore y obtener url
          /*bucket.upload('out.png', {
            destination: 'path/to/upload/out.png' // La ruta en Firebase Storage donde deseas almacenar el archivo
          }).then(() => {
            console.log('Archivo subido exitosamente a Firebase Storage.');
            bucket.file('path/to/upload/out.png').getSignedUrl({
              action: 'read',
              expires: '01-01-2025' // Fecha de expiración de la URL firmada
          }).then(signedUrl => {
              console.log('URL de la imagen:', signedUrl);
          }).catch(error => {
              console.error('Error al obtener URL firmada:', error);
          });
          }).catch((error) => {
            console.error('Error al subir el archivo a Firebase Storage:', error);
          });*/
          //////////////////////////////////////////////////////////////// Fin subir out.png a firebasestore y obtener url
        }
        
      );
      
    },
    undefined,
    { logQR: false }
    
  )
  .then((client) => {
    start(client);
    
  })
  .catch((erro) => {
    console.log(erro);
  });
//////////////////////////////////////////////////////////////// Fin Bloque principal de libreria Venom-bot
//////////////////////////////////////////////////////////////// Cadena de conexion con mysql
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'intbotutn2023',
  database: 'nros_telefono',
};
/*venom // bloque de biblioteca original de venom-bot, objeto para la creacion de una sesion en whatsapp
  .create({
    session: 'Agente Virtual WhatsApp UTN' 
  })
  .then((client) => start(client))
  .catch((erro) => {
    console.log(erro);
  });*/
//////////////////////////////////////////////////////////////// Inicio funcion obtener mapeo y modificar respuestas en 'responseMappings.js'
function findCustomResponse(originalText) { // busca en "const=responseMappings" las respuestas personalizadas para enviar a un usuario de wssp, si hay modificacion la devuelve, sino no realiza ninguna modificacion
  const mapping = responseMappings.find(mapping => originalText.startsWith(mapping.original));
  return mapping ? mapping.custom : originalText;
}
//////////////////////////////////////////////////////////////// Fin funcion obtener mapeo y modificar respuestas en 'responseMappings.js'
//////////////////////////////////////////////////////////////// Inicio funcion Star()t para mensajes entrantes una vez validada la sesión
//funcion llamada cuando se inicia sesion de wssp con exito, define un manejador de eventos para los mensajes entrantes
function start(client) {
  client.onMessage(async (message) => { // activacion cuando cliente recibe un nuevo mensaje (manejador de eventos)
    setSessionAndUser(message.from); //asocia el num tel del remitente con una sesion (setSessionAndUser), se envia mensaje a dialogflow para procesarlo y se obtiene respuesta, recorre cada respuesta y realiza modificaciones opcionales, por ultimo llama a la funcion sendMessageToWhatsapp para enviar respuestas al remitente
    let session = sessionIds.get(message.from);
    /*for (let attempt = 0; attempt < 5; attempt++){
      if(!message.body || message.body.trim() === ''){
        if(attempt === 4){
            console.log('Mensaje vacio despues de 2 intentos no se pudo procesar');
            console.log('Puedes volver a repetir el mensaje'); 
            client.sendText(message.from, 'Puedes volver a enviar el mensaje?');
            return;
          }else{
            console.log('Mensaje vacio Reintentando');
            continue;
          }
      }
    }*/
    let payload=await dialogflow.sendToDialogFlow(message.body, session); // envia el cuerpo de "message.body" y la sesion de dialogflow utilizando .sendToDialogFlow, la respuesta de dialogflow se almacena en "payload"
    let responses=payload.fulfillmentMessages; /// recupera las respuestas de dialogflow del campo "fulfillmentMessages" en payload y las almacena en "responses"
    for (const response of responses) { // inicio de blucle que recorra cada respuesta obtenida de dialogflow
      if (response.text && response.text.text.length > 0) { // verificacion de campos vacios
        response.text.text[0] = findCustomResponse(response.text.text[0]); //modificacion de respuestas personalizadas configuradas en el mapping "responseMappings" 
        let num = message.from.replace(/@c\.us$/, "");
        let msnin = message.body;
        let msnout = response.text.text[0];
        let intemp = payload.intent.displayName;
        const currentDateTime = moment();
        const currentDay = currentDateTime.format('YYYY-MM-DD');
        const currentHour = currentDateTime.format('HH:mm:ss');
        console.log('Numero de telefono:', num); /* numero de telefono*/
        console.log('Mensaje recibido: ', msnin);
        console.log('Respuesta enviada: ', msnout);
        console.log('Intent Emparejado: ', intemp);
        console.log('Dia de la consulta', currentDay);
        console.log('Hora de la consulta', currentHour);
        await insertarDatosEnTablas(num, msnin, msnout, intemp);
        
      }
       await sendMessageToWhatsapp(client, message, response);
    }
      start(client);
     });
}
//////////////////////////////////////////////////////////////// Fin funcion Start() para mensajes entrantes una vez validada la sesión
//////////////////////////////////////////////////////////////// Inicio funcion 'sendMessageToWhatsApp()' 
//toma un mensaje entrante y una respuesta, envia la respuesta al remitente, utiliza promesas y devuelve una promesa que se resuelve cuando el mensaje se envia correctamente o se rechaza si hay un error
function sendMessageToWhatsapp(client, message, response) { // cliente whatsapp - mensaje entrante que será respondido - respuesta que se enviará al remitente
    return new Promise((resolve, reject) => { // devolucion de promesa para manejar envios de whatsapp de manera asincrona para lograr una mejorar "estructura" de codigo
        client
        .sendText(message.from, response.text.text[0]) // envia el mensaje al remitente [0] de la respuesta de dialogflow basandose en si se la respuesta está personalizada o no 
        .then((result) => {
            console.log('Result: ', result); // Si fue exitoso se resuelve la promesa con el objeto "result" que contiene informacion sobre el éxito del envio
            resolve(result);
        })
        .catch((erro) => {
            console.error('Error when sending: ', erro); // manejo de errores donde se rechace la promesa y devuelve el objeto "erro" util para leer errores por consola (Siempre que se envie una respuesta enriquecida mostrará un error en consola que permite al desarrollador saber que tipo de respuesta se está enviando, se puede modificar para que no afecte la visualizacion de las respuestas de la consola pero es util durante desarrollo y captura de errores.)
            reject(erro);
        });
    });
}
//////////////////////////////////////////////////////////////// Fin funcion 'sendMessageToWhatsApp()' 
//asocia un num tel de remitente con una sesion generada mediante uuid.v1(), verifica si ya existe una sesion para el remitente y la crea si no existe
//////////////////////////////////////////////////////////////// Inicio setSessionAndUser()...Mantenimiento pendiente
async function setSessionAndUser(senderId) {
    try {
        //const formattedSenderId = senderId.replace(/@c\.us$/, "");
        //console.log('\x1b[35m', 'Mensaje Entrante: ', formattedSenderId);
        //console.log(`\x1b[35m`, 'Mensaje Entrante: ', senderId.replace(/@c\.us$/, "")); //imprime por la consola el numero de la persona que envió un mensaje al cliente, x1b[35m para cambiar el color en la consola, .replace para quitar caracteres innecesarios en la devolucion por consola.
        if (!sessionIds.has(senderId)) { //verifica si existe sesion, sino la crea.
            sessionIds.set(senderId, uuid.v1());
           //await insertarNumeroTelefono(senderId.replace(/@c\.us$/, "")); // linea de codigo de prueba para insercion de senderId (numero tel), en tanto una tabla mysql como en un .txt alojado en la carpeta de la aplicacion
          }
                function printAllSessions() {
                console.log("Sesiones almacenadas:");
                sessionIds.forEach((sessionId, senderId) => {
                  console.log(`SenderID: ${senderId}, SessionID: ${sessionId}`);
                });
              }
                //printAllSessions();
      } catch (error) {
        throw error;
      }
}
//////////////////////////////////////////////////////////////// Fin setSessionAndUser()...Mantenimiento pendiente
//////////////////////////////////////////////////////////////// Inicio insertarDatosEnTablas() funcion para conectar con mysql 
async function insertarDatosEnTablas(num, msnin, msnout, intemp) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [telefonosRows] = await connection.execute(
      'INSERT IGNORE INTO telefonos (numero_telefono, cantidad_consultas) VALUES (?, 0)',
      [num]
    );
    //Obtiene el ID del número de teléfono
    const [idTelefonoRow] = await connection.execute(
      'SELECT id_telefono FROM telefonos WHERE numero_telefono = ?',
      [num]
    );
    const idTelefono = idTelefonoRow[0].id_telefono;
    //Genera un UUID para la consulta
    const idConsulta = uuid.v4();
    //OBtener fecha y hora actual
    const currentDateTime = moment();
    const fechaActual = currentDateTime.format('YYYY-MM-DD');
    const horaActual = currentDateTime.format('HH:mm:ss');
    //Insertar la consulta asociada al número de teléfono
    await connection.execute(
      'INSERT INTO consultas (id_consulta, id_telefono, numero_telefono, mensaje_entrante, respuesta_saliente, intent_emparejado, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [idConsulta, idTelefono, num, msnin, msnout, intemp, fechaActual, horaActual]
    );
    //Incrementar la cantidad de consultas en la tabla de telefonos
    await connection.execute(
      'UPDATE telefonos SET cantidad_consultas = cantidad_consultas + 1 WHERE id_telefono = ?',
      [idTelefono]
    );

    console.log('Datos insertados con éxito en las tablas.');
  } catch (error) {
    console.error('Error al insertar datos en las tablas:', error);
  } finally {
    //Cerrar la conexión después de usarla
    connection.end();
  }
}
//////////////////////////////////////////////////////////////// Fin insertarDatosEnTablas() funcion para conectar con mysql 
//////////////////////////////////////////////////////////////// Codigo de pruebas, no relevante.
/*const fs = require('fs'); // importación de "fs, file system" para trabajar con archivos del sistema operativo
// codigo no relevante, de prueba de insercion de datos en tablas y archivo local, puede ser cambiado o eliminado para probar otras maneras (importante modificar arriba las llamadas a las siguientes funciones declaradas en este bloque en caso de eliminar este bloque)
async function insertarNumeroTelefono(numeroTelefono) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // Verificar si el número ya existe en la base de datos
    const [existingRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM numeros_telefono WHERE numero_telefono = ?',
      [numeroTelefono]
    );
    const count = existingRows[0].count;
    if (count === 0) {
      // El número no existe, proceder con la inserción en la base de datos y en el archivo
      await connection.execute(
        'INSERT INTO numeros_telefono (numero_telefono) VALUES (?)',
        [numeroTelefono]
      );
      console.log('Número de teléfono insertado con éxito:', numeroTelefono);
      // Verificar si el número ya existe en el archivo
      const fileContent = fs.readFileSync('numeros_telefono.txt', 'utf8');
      if (!fileContent.includes(numeroTelefono)) {
        // El número no existe en el archivo, se procede con la inserción en el archivo
        fs.appendFileSync('numeros_telefono.txt', `${numeroTelefono}\n`);
        console.log('Número de teléfono guardado en el archivo:', numeroTelefono);
      } else {
        console.log('El número de teléfono ya existe en el archivo.', numeroTelefono);
      }
    } else {
      console.log('El número de teléfono ya existe en la base de datos.');
    }
  } catch (error) {
    console.error('Error al insertar el número de teléfono:', error);
  } finally {
    // Cerrar la conexión después de usarla
    connection.end();
  }
}*/
