//modulo de nodejs para interactuar con el servicio de dialogflow de google cloud
const dialogflow = require("dialogflow");  //importa biblioteca de dialogflow
const config = require("./config");  //credenciales de google cloud
const credentials = { //se toman las credenciales del "config" para validar credenciales
  client_email: config.GOOGLE_CLIENT_EMAIL,
  private_key: config.GOOGLE_PRIVATE_KEY,
};
const sessionClient = new dialogflow.SessionsClient({ //instancia para interactuar con dialogflow, el cliente se configura con el proyec de dialogflow y sus creds.
  projectId: config.GOOGLE_PROJECT_ID,
  credentials,
});
/** IGNORAR
 * Envia una consulta al agente de dialogflow y devuelve el resultado de la consulta
 * @param {string} projectId proyecto usado
 */
//la estructura de la funcion sendToDialogFlow se obtuvo del repositorio en github de venom-bot y dialogflow (npm venom-bot, npm dialogflow), se modificó y adaptó de acuerdo a lo que queria mostrar, en este caso, muestra casi todos los valores interesantes que debemos leer por consola para saber que tipo de información está devolviendo
async function sendToDialogFlow(msg, session, params) { //funcion asincronica con 3 parametros, mensaje del usuario, identificacion de sesion y params adicionales
  let textToDialogFlow = msg;  //msn del usuario se almacena en esta var
  try { //trycath para manejar excepciones, errores se capturan y se muestran en consola
    const sessionPath = sessionClient.sessionPath( //ruta de sesion utilizando proyecto e iden de sesion proporcionada con params
      config.GOOGLE_PROJECT_ID,
      session
    );
    const request = { //objeto "request" contiene info de consulta que se enviara a dialogflow ruta de sesion, msn usuario, lenguaje de consulta y params adicionales (precaucion al modificar)
      session: sessionPath,
      queryInput: {
        text: {
          text: textToDialogFlow,
          languageCode: config.DF_LANGUAGE_CODE,
        },
      },
      queryParams: {
        payload: {
          data: params,
        },
      },
    };
    const responses = await sessionClient.detectIntent(request); //se utiliza cliente de sesion para enviar solicitud a dialogflow y se espera respuesta, esta se almacena en la var "responses"
    const result = responses[0].queryResult; //se extrae info de resp de dialogflow, se almacena en var "result", tanto el intent como en la respuesta del agente
    //console.log("INTENT EMPAREJADO: ", result.intent.displayName);
    let defaultResponses = [];
    if (result.action !== "input.unknown") {
      result.fulfillmentMessages.forEach((element) => {
          defaultResponses.push(element);
      });
    }
    if (defaultResponses.length === 0) {
      result.fulfillmentMessages.forEach((element) => {
        if (element.platform === "PLATFORM_UNSPECIFIED") {
          defaultResponses.push(element);
        }
      });
    }
    result.fulfillmentMessages = defaultResponses;
    //console.log(JSON.stringify(result,null," "));  
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    /*console.log(`\x1b[36m`,'////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////\nIntent Emparejado:', result.intent.displayName, `\x1b[36m`);*/
    /*console.log(`\x1b[36m`, '////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////\nTexto Respuesta:', result.fulfillmentText, `\x1b[36m`);*/
    /*console.log(`\x1b[36m`, '////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////\nMensaje Entrante:', result.queryText, `\x1b[36m`);*/
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    return result;
    
  
    //devuelve obj "result" info procesada de la respuesta de dialogflow
    // console.log("se enviara el resultado: ", result);
  } catch (e) {
    console.log("error");
    console.log(e);
  };
}
//se exporta la func sendToDialogFlow para que pueda ser usada por otros modulos o scrips
//permite que otros componentes de la app interactuen con dialogflow
module.exports = {
  sendToDialogFlow,
};
