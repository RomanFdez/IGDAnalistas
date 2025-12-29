# Guía de Migración a Firebase

Vamos a migrar tu aplicación de un servidor Express/MongoDB customizado a una arquitectura serverless con Firebase.

## Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/).
2. Crea un nuevo proyecto (ej: `imputaciones-gd`).
3. Desactiva Google Analytics si no lo necesitas (simplifica el setup).

## Paso 2: Configurar Servicios

### Authentication
1. En el menú izquierdo, ve a **Build > Authentication**.
2. Pulsa "Get Started".
3. En "Sign-in method", habilita **Email/Password**.

### Firestore Database
1. Ve a **Build > Firestore Database**.
2. Pulsa "Create Database".
3. Selecciona una ubicación (ej: `eur3` para Europa).
4. Empieza en **Test mode** (Modo de prueba) para facilitar el desarrollo inicial.

## Paso 3: Obtener Configuración

1. En la vista general del proyecto (Project Overview), pulsa el icono de **Web** (</>).
2. Registra la app (ej: `ImputacionesWeb`).
3. Copia el objeto `firebaseConfig` que aparece.
4. Pega estos valores en `src/firebase/config.js` en tu código.

## Paso 4: Instalar Dependencias

Ejecuta el siguiente comando en tu terminal para instalar el SDK de Firebase:

```bash
npm install firebase
```

## Paso 5: Migración de Datos (Importante)

Antes de cortar el acceso a MongoDB, necesitamos extraer tus datos actuales.

1. Asegúrate de que tu servidor actual está corriendo.
2. Abre tu navegador y ve a: `http://localhost:3001/api/backup` (o el puerto que uses).
3. Guarda el JSON resultante como `copia_seguridad.json` en la raíz del proyecto.
4. Usaremos este archivo para poblar Firestore.

## Paso 6: Despliegue

Usaremos Firebase Hosting para servir la aplicación.

1. Instala las herramientas de Firebase: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Inicializa: `firebase init`
   - Selecciona **Hosting**.
   - Use an existing project.
   - Public directory: `dist`
   - Configure as a single-page app: **Yes**.
