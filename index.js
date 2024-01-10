const { ipcRenderer } = require('electron');
//Definicion de funciones para enviar start-app y stop-app al proceso principal
function startApp() {
  ipcRenderer.send('start-app');
}
function stopApp() {
    ipcRenderer.send('stop-app');
  }