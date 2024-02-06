//Archivo para ejecución con nodejs. Inicializa conexion con firebasestorage, lee out.png e imprime su URL, similar al bloque dedicado en 'app.js'
/*const admin = require('firebase-admin');
const serviceAccount = require('./qrimgfbs.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://qrimgbotutn.appspot.com'
  });
  const bucket = admin.storage().bucket();

  bucket.file('path/to/upload/out.png').getSignedUrl({
    action: 'read',
    expires: '01-01-2025' // Fecha de expiración de la URL firmada
}).then(signedUrl => {
    console.log('URL de la imagen:', signedUrl);
}).catch(error => {
    console.error('Error al obtener URL firmada:', error);
});*/