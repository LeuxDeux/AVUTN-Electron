// Supports ES6
// import { create, Whatsapp } from 'venom-bot';
//importacion de modulos, uuid identificadores unicos, venom-bot framework para interactuar con wssp
//dialogflow modulo para comunicarse con el servicio de procesamiento de dialogflow
const uuid = require("uuid");
const venom = require('venom-bot');
const dialogflow=require("./dialogflow");
const sessionIds = new Map(); //asociar ID diferente para cada numero de wssp
const responseMappings = require('./responseMappings'); // mapping de modificacion de respuestas
const mysql = require('mysql2/promise');
  venom
  .create(
    'Agente Virtual Whatsapp UTN',
    (base64Qr, asciiQR, attempts, urlCode) => {
      console.log(asciiQR); // Optional to log the QR in the terminal
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

/*const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'intbotutn2023',
  database: 'nros_telefono',
};*/
/*venom // bloque de biblioteca venom-bot, objeto para la creacion de una sesion en whatsapp
  .create({
    session: 'Agente Virtual WhatsApp UTN' 
  })
  .then((client) => start(client))
  .catch((erro) => {
    console.log(erro);
  });*/
  
  /////////////////////////
function findCustomResponse(originalText) { // busca en "const=responseMappings" las respuestas personalizadas para enviar a un usuario de wssp, si hay modificacion la devuelve, sino no realiza ninguna modificacion
  const mapping = responseMappings.find(mapping => originalText.startsWith(mapping.original));
  return mapping ? mapping.custom : originalText;
}
//funcion llamada cuando se inicia sesion de wssp con exito, define un manejador de eventos para los mensajes entrantes
function start(client) {
  client.onMessage(async (message) => { // activacion cuando cliente recibe un nuevo mensaje (manejador de eventos)
    setSessionAndUser(message.from); //asocia el num tel del remitente con una sesion (setSessionAndUser), se envia mensaje a dialogflow para procesarlo y se obtiene respuesta, recorre cada respuesta y realiza modificaciones opcionales, por ultimo llama a la funcion sendMessageToWhatsapp para enviar respuestas al remitente
    let session = sessionIds.get(message.from);
    let payload=await dialogflow.sendToDialogFlow(message.body, session); // envia el cuerpo de "message.body" y la sesion de dialogflow utilizando .sendToDialogFlow, la respuesta de dialogflow se almacena en "payload"
    let responses=payload.fulfillmentMessages; // recupera las respuestas de dialogflow del campo "fulfillmentMessages" en payload y las almacena en "responses"
    for (const response of responses) { // inicio de blucle que recorra cada respuesta obtenida de dialogflow
      if (response.text && response.text.text.length > 0) { // verificacion de campos vacios
        response.text.text[0] = findCustomResponse(response.text.text[0]); //modificacion de respuestas personalizadas configuradas en el mapping "responseMappings" 
      }
       await sendMessageToWhatsapp(client, message, response);
    }
      
     });
}
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
//asocia un num tel de remitente con una sesion generada mediante uuid.v1(), verifica si ya existe una sesion para el remitente y la crea si no existe
async function setSessionAndUser(senderId) {
    try {
        console.log(`\x1b[35m`, 'Mensaje Entrante: ', senderId.replace(/@c\.us$/, "")); //imprime por la consola el numero de la persona que envió un mensaje al cliente, x1b[35m para cambiar el color en la consola, .replace para quitar caracteres innecesarios en la devolucion por consola.
        if (!sessionIds.has(senderId)) { //verifica si existe sesion, sino la crea.
            sessionIds.set(senderId, uuid.v1());
           //await insertarNumeroTelefono(senderId.replace(/@c\.us$/, "")); // linea de codigo de prueba para insercion de senderId (numero tel), en tanto una tabla mysql como en un .txt alojado en la carpeta de la aplicacion
        }
    }  catch (error) {
        throw error;
    }
}
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