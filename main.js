//Importación de modulos app, BrowserWindow e ipcMain, los 3 de electron respectivamente controlan el ciclo de vida de la aplicacion con eventos y metodos de gestion (inicio, activacion, cierre), creación y control de ventanas de navegador que a su vez gestiona el contenido y por ultimo un módulo de manejo de comunicaciones entre procesos "ipcMain"
//path: utilidades de manejo de archivos y directorios, extrae y construye rutas,
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } =require('child_process');
let mainWindow; //variable global
function createWindow() { //funcion para crear la ventana principal
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, //habilita node.js en la vista principal
      contextIsolation: false, //Deshabilitar el aislamiento de contexto para poder usar ipcRenderer desde HTML
    },
  });
  mainWindow.loadFile('index.html'); //carga archivo html en la ventana principal
  mainWindow.on('closed', function () { // evento para cuando la ventana se cierre
    mainWindow = null;
  });
}
app.whenReady().then(createWindow); //create window para renderizar el main sin fubnciones extras
/*app.whenReady().then(() => { //create window pero con un registro de logs para ver ciertos errores
  const logFilePath = path.join(__dirname, 'log.txt');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  // Crea la ventana principal
  createWindow();

  // Redirige la salida estándar (stdout) a la consola y al archivo de registro
  const originalStdoutWrite = process.stdout.write;
  process.stdout.write = function (chunk, encoding, callback) {
    originalStdoutWrite.apply(process.stdout, arguments);
    logStream.write(chunk, encoding, callback);
  };

  // Redirige la salida de error estándar (stderr) a la consola y al archivo de registro
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = function (chunk, encoding, callback) {
    originalStderrWrite.apply(process.stderr, arguments);
    logStream.write(`[app.js] stderr: ${chunk}`, encoding, callback);
  };
});*/

app.on('window-all-closed', function () { //Esperar hasta que la aplicación esté lista para crear la ventana principal
  if (process.platform !== 'darwin') app.quit(); // // Salir de la aplicación si no es macOS
});
//Evento para cuando la aplicacion se active
app.on('activate', function () {
  if (mainWindow === null) createWindow(); // Crear la ventana principal si aún no existe
});
// Manejar el evento 'start-app' enviado desde la interfaz de usuario
ipcMain.on('start-app', () => {
  console.log('Evento Start-App recibido. Iniciando app...');
  const appPath = path.join(__dirname, 'app.js'); //obtener ruta app.js
  //const appProcess = require('child_process').spawn('node', [appPath]); //inicia proceso para ejecutar app.js//FUNCIONA EN DESARROLLO NO EN EJECUCION
  const appProcess = require('child_process').fork(appPath); //forma mas eficiente de iniciar arch node pero con ciertos errores//FUNCIONA EN EJECUCION NO EN DESARROLLO
  /*if (fs.existsSync(appPath)) {
    const appProcess = require('child_process').fork(appPath); //forma mas eficiente de obtener arch node con intento de console.log, no funcionan en ejecucion
    appProcess.on('message', (message) => {
      console.log(`[app.js] child process message: ${message}`);
      if (message === 'app-started') {
        mainWindow.webContents.send('app-started');
      }
    });

    appProcess.on('error', (error) => {
      console.error(`[app.js] child process error: ${error}`);
      mainWindow.webContents.send('app-error', `Error en el proceso hijo: ${error}`);
      
    });
  } else {
    console.error(`[app.js] El archivo ${appPath} no existe.`);
    mainWindow.webContents.send('app-error', `El archivo ${appPath} no existe.`);

  }*/
  appProcess.on('message', (message) => {
    if (message.type === 'stdout') {
      console.log(`[app.js] stdout: ${message.data}`);
    } else if (message.type === 'stderr') {
      console.error(`[app.js] stderr: ${message.data}`);
      mainWindow.webContents.send('app-error', message.data.toString());
    }
  });
  // Manejar el evento 'exit' para capturar el cierre del proceso hijo
  appProcess.on('exit', (code) => {
    console.log(`[app.js] child process exited with code ${code}`);
    if (code === 0) {
      // Emitir evento 'app-started' al proceso de representación
      mainWindow.webContents.send('app-started');
    }
  });
  ///forma normal de mensajes de errores para desarrollo
  /*appProcess.stdout.on('data', (data) => { //salida estandar
    console.log(`[app.js] stdout: ${data}`);
  });

  appProcess.stderr.on('data', (data) => { //salida de error
    console.error(`[app.js] stderr: ${data}`);
    mainWindow.webContents.send('app-error', data.toString());
  });

  appProcess.on('close', (code) => { //manejo de cierre del proceso hijo
    console.log(`[app.js] child process exited with code ${code}`);
    if (code === 0) {
      // Emitir evento 'app-started' al proceso de representación
      mainWindow.webContents.send('app-started');

    }
  });*///Comentado para pruebas de compatibilidad entre entorno de desarrollo y .exe
});
//manejo de evento stop app enviado desde la interfaz de usuario
ipcMain.on('stop-app', () => {
    if (mainWindow) {
      mainWindow.close(); //cerrar ventana principal de electron
      console.log('Aplicación cerrada.');
    }
    const imagePath = path.join(__dirname, 'out.png'); //obtiene ruta de out.png
    if(fs.existsSync(imagePath)) {
      try {
      fs.unlinkSync(imagePath); //elimina out.png
      console.log('Archivo eliminado con exito.');
      }catch (err) {
        console.error('Error al eliminar el archivo', err);
      }
    }else{
      console.log('El archivo no existe. No re realizo ninguna accion');
    }
    
  });
  //////Prueba remitentes.html
  let remitentesWindow;

  function createRemitentesWindow() {
    remitentesWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    remitentesWindow.loadFile('remitentes.html');
    remitentesWindow.on('closed', function () {
      remitentesWindow = null;
    });
  }
  ipcMain.on('open-remitentes-window', () => {
    if (!remitentesWindow) {
      createRemitentesWindow();
    }
  });
  ipcMain.on('close-remitentes-window', () => {
    if (remitentesWindow) {
      remitentesWindow.close();
    }
  });
  /////////////////////////////////////////////////
  //Ventana filtro.html
  let filtroWindow; // Agrega una variable global para la ventana de filtro

function createFiltroWindow(datosFiltrados) {
  filtroWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  filtroWindow.loadFile('filtro.html');

  // Enviar datos filtrados a la nueva ventana sin cambiar la URL
  filtroWindow.webContents.on('did-finish-load', () => {
    filtroWindow.webContents.send('datosFiltrados', datosFiltrados);
  });

  filtroWindow.on('closed', function () {
    filtroWindow = null;
  });
}

ipcMain.on('abrir-ventana-filtro', (event, datosFiltrados) => {
  if (!filtroWindow) {
    createFiltroWindow(datosFiltrados);
  }
});
