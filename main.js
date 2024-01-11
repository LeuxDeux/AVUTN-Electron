//Importación de modulos
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');


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

app.whenReady().then(createWindow);

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
  const appProcess = require('child_process').spawn('node', [appPath]); //inicia proceso para ejecutar app.js

  appProcess.stdout.on('data', (data) => { //salida estandar
    console.log(`[app.js] stdout: ${data}`);
  });

  appProcess.stderr.on('data', (data) => { //salida de error
    console.error(`[app.js] stderr: ${data}`);
  });

  appProcess.on('close', (code) => { //manejo de cierre del proceso hijo
    console.log(`[app.js] child process exited with code ${code}`);
  });
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
  /*let remitentesWindow;

  function createRemitentesWindow() {
    remitentesWindow = new BrowserWindow({
      width: 600,
      height: 400,
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
  ipcMain.on('update-remitentes', (event, formattedSenderId) => {
    if (remitentesWindow) {
      remitentesWindow.webContents.send('update-remitentes', formattedSenderId);
    }
  });*/