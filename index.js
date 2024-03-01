const { ipcRenderer } = require('electron');
//Definicion de funciones para enviar start-app y stop-app al proceso principal
function startApp() {
  ipcRenderer.send('start-app');
  ipcRenderer.on('app-started', () => {
    // Lógica para indicar que la aplicación se inició correctamente
    console.log('App iniciada correctamente');
  });
  ipcRenderer.on('app-error', (event, errorMessage) => {
    // Lógica para manejar errores durante la ejecución de la aplicación
    console.error('Error en la ejecución de la aplicación:', errorMessage);
    // Puedes actualizar la interfaz de usuario aquí
  });
}
function stopApp() {
    ipcRenderer.send('stop-app');
  }