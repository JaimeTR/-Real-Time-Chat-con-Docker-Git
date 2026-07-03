# Workspace de Chat en Tiempo Real (Express + Socket.io + Docker)

Un workspace de chat elegante y altamente interactivo que cuenta con mensajería privada en tiempo real. Esta aplicación tiene una interfaz de usuario premium inspirada en Slack y Microsoft Teams, diseñada utilizando un sistema de colores contrastados claros y oscuros, iconos modernos de Lucide y tipografía Plus Jakarta Sans.

El entorno de desarrollo está completamente dockerizado, preparado para producción, es reproducible y seguro.

---

## Arquitectura del Sistema

El sistema utiliza una arquitectura cliente-servidor con comunicación bidireccional en tiempo real provista por Socket.io, integrada en un ecosistema mixto con PHP para la inyección de eventos.

```
                  +----------------------------------+
                  |         Servidor Express         |
                  |     (Hosting y REST API POST)    |
                  +----------------------------------+
                                   ^
                                   | HTTP Request / Archivos Estáticos
                                   v
                  +----------------------------------+
                  |         Cliente Browser          |
                  |     (HTML5 + Vanilla CSS/JS)     |
                  +----------------------------------+
                                   ^
                                   | Conexión Socket.io
                                   v
             ==============================================
             |          FLUJO DE MENSAJERÍA SOCKET         |
             ==============================================
             
  [Cliente 1 (Jaime)]                                [Cliente 2 (Elena)]
         |                                                    |
         | --- 1. Registro ('register', 'Jaime') ---------->  |
         | <--- 2. Confirmación Registro (Éxito) ----------   |
         |                                                    |
         | <--- 3. Broadcast Lista Activos ('updateUserList') | <--- Conectado
         |                                                    |
         | --- 4. Mensaje Privado ('privateMessage') ------->  |
         |    { to: 'Elena', message: '¡Hola!' }              |
         |                                                    |
         |                                                    | (Servidor enruta usando
         |                                                    |  el socket.id de Elena)
         |                                                    v
         | <------------------------------------------------- | --- 5. Entrega Mensaje
         |                                                    |    { from: 'Jaime', ... }
```

### Protocolos Clave de Comunicación:
1. **Registro de Usuarios (`register`)**: Al iniciar sesión, el cliente envía sus credenciales. El servidor valida el usuario y la contraseña contra una base de datos segura en memoria. Si es exitoso, asocia la sesión del socket con el nombre de usuario.
2. **Directorio en Línea (`updateUserList`)**: Al conectarse, registrarse o desconectarse un usuario, el servidor emite la lista actualizada de nombres activos a todos los sockets conectados.
3. **Enrutamiento Privado (`privateMessage`)**: Para mensajería privada, el cliente emite un evento con el destinatario y contenido. El servidor busca el ID de socket del destinatario en su mapa en memoria y le envía el mensaje de forma exclusiva mediante `io.to(socketId).emit()`.
4. **Inyección de Eventos PHP (`systemMessage`)**: Un script externo de PHP realiza un POST HTTP al endpoint `/api/notify`. El servidor procesa la petición y emite un mensaje de sistema global (broadcast) o dirigido (privado) a los clientes de Socket.io.

---

## Docker y Contenedorización

La aplicación está dockerizada para garantizar la máxima reproducibilidad del entorno mediante las siguientes optimizaciones:

* **Imagen Base**: Utiliza `node:20-alpine`, una imagen ultra-ligera que minimiza el tamaño del contenedor y reduce la superficie de posibles vulnerabilidades.
* **Instalación de Dependencias**: Ejecuta `npm ci --only=production`, asegurando una instalación rápida, limpia y exacta basada únicamente en el archivo `package-lock.json` y omitiendo dependencias de desarrollo.
* **Seguridad de Ejecución**: Cambia la propiedad de ejecución del proceso al usuario no privilegiado `node` en lugar de correr como `root` (práctica estándar de seguridad en contenedores).
* **Orquestación**: Configurado mediante `docker-compose.yml` para mapear el puerto de red `3000:3000` y definir las variables de entorno de producción.

---

## Configuración y Ejecución

### Método 1: Ejecución con Docker (Recomendado)

1. Asegúrate de tener **Docker** y **Docker Compose** instalados y ejecutándose.
2. Abre una terminal y sitúate en la raíz del proyecto:
   ```bash
   cd socket-chat
   ```
3. Construye y levanta el contenedor en segundo plano:
   ```bash
   docker compose up -d --build
   ```
4. Accede al chat desde tu navegador en: **`http://localhost:3000`**
5. Para inspeccionar los logs en tiempo real:
   ```bash
   docker compose logs -f
   ```
6. Para apagar y eliminar los contenedores del entorno:
   ```bash
   docker compose down
   ```

### Método 2: Ejecución Local (Requiere Node.js)

1. Asegúrate de tener instalado **Node.js (v18 o superior)**.
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Inicia el servidor de Express:
   ```bash
   npm start
   ```
4. Accede al chat en: **`http://localhost:3000`**

---

## Credenciales de Acceso para Pruebas

Para validar el inicio de sesión y probar la comunicación, puedes utilizar las siguientes credenciales pre-configuradas en el servidor:

| Username (Usuario) | Password (Contraseña) | Rol Asignado |
| :--- | :--- | :--- |
| `JaimeTR` | `admin123` | Administrador / Candidato |
| `ElenaVance` | `admin123` | Senior Product Designer |
| `JordanSmith` | `admin123` | Tech Lead |
| `AlexRivera` | `admin123` | Support Engineer |

---

## Cómo Probar la Mensajería Privada (Parte 1)

1. Abre una pestaña normal de tu navegador en `http://localhost:3000` e inicia sesión como **`JaimeTR`** (password: `admin123`).
2. Abre una ventana de **Incógnito** (o usa otro navegador) en `http://localhost:3000` e inicia sesión como **`ElenaVance`** (password: `admin123`).
3. En ambas pantallas verás aparecer al otro usuario en la lista lateral de **Recent Messages** con un círculo verde de estado activo.
4. En la pantalla de Jaime, haz clic en **Elena Vance**, escribe un mensaje en la parte inferior y presiona Enviar.
5. Verás cómo el mensaje se entrega instantáneamente en la pantalla de Elena. Selecciónala en su lista y respóndele de manera privada.

---

## Cómo Probar la Inyección de Eventos PHP (Parte 2)

El notificador de PHP permite que procesos externos en backend (alertas automáticas, logs, reportes de caída de servicios) se reporten en vivo en el chat.

### 1. Detalles del Endpoint Node:
* **Ruta**: `POST http://localhost:3000/api/notify`
* **Cuerpo JSON**:
  ```json
  {
    "message": "Alerta del Servidor: Espacio en disco al 95%",
    "to": "JaimeTR" 
  }
  ```
  *(Nota: El parámetro `to` es opcional. Si se define, envía la alerta al usuario indicado. Si se omite, se difunde como alerta de sistema global a todos los conectados).*

### 2. Probar desde la Consola (CLI):
Ejecuta el script PHP desde tu terminal pasando los argumentos requeridos:

* **Alerta Global (Broadcast)**:
  ```bash
  php php/notificador.php "Servidor de Producción: Estado OK - 14:00"
  ```
  *Ambos navegadores recibirán un banner de alerta flotante en la parte superior y verán el registro del sistema en el historial.*

* **Alerta Dirigida (Privada)**:
  ```bash
  php php/notificador.php "Alerta de Seguridad: Intento de acceso denegado" JaimeTR
  ```
  *Solo la pantalla de `JaimeTR` mostrará la notificación.*

### 3. Probar desde el Navegador:
Si cuentas con un servidor local de PHP (Laragon, XAMPP, Apache), puedes colocar el script en tu directorio de servicios web y acceder a la URL:
* `http://localhost/php/notificador.php?message=Alerta+Global+Web`

---

## Detalles del Repositorio y Git

Seguimos una metodología de commits atómicos para cada tarea del examen:
* **First Commit**: Commit inicial vacío para marcar el inicio del examen.
* **Task 2**: Configuración de archivos base (`package.json`, `.gitignore`).
* **Task 3**: Lógica del servidor Express + Socket.io.
* **Task 4**: Interfaz de usuario Slack-like (HTML, CSS y JS cliente).
* **Task 5**: Dockerización completa (Dockerfile y compose).
* **Task 6**: Documentación inicial.
* **Parte 2**: Inyección de eventos PHP y enrutamiento API de notificaciones.
* **Refactor**: Estructuración final modular y organización de directorios.

---
*Prueba técnica desarrollada por **Jaime Tarazona**.*
