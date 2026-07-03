<?php
/**
 * PHP Event Injection Script (Ecosistema Mixto)
 * 
 * Este script permite a procesos de backend en PHP (logs, cronjobs, alertas) 
 * inyectar notificaciones en tiempo real en la plataforma de chat.
 * 
 * Ejecución:
 * - CLI:     php notificador.php "Alerta de Servidor: Memoria al 95%" [Destinatario Opcional]
 * - Browser: http://localhost:80/notificador.php?message=Alerta+Browser&to=JaimeTR
 */

// Establecer cabecera de tipo de contenido
$is_cli = (php_sapi_name() === 'cli');

// 1. Obtener mensaje y destinatario de CLI o parámetros GET
if ($is_cli) {
    $message = isset($argv[1]) ? $argv[1] : null;
    $to = isset($argv[2]) ? $argv[2] : null;
} else {
    header('Content-Type: text/html; charset=utf-8');
    $message = isset($_GET['message']) ? $_GET['message'] : null;
    $to = isset($_GET['to']) ? $_GET['to'] : null;
}

// Mensaje por defecto si no se ingresa ninguno
if (!$message) {
    $message = "Server Status: OK - Live Check at " . date('H:i:s');
}

// 2. Configurar la petición POST a la API del chat en Node.js
// Cuando corre dentro del host, el puerto 3000 del contenedor está mapeado en localhost.
$url = 'http://localhost:3000/api/notify';

$payload = array(
    'message' => $message,
    'to' => $to
);

$json_payload = json_encode($payload);

// 3. Ejecutar la petición HTTP POST usando PHP Streams (sin dependencias externas)
$options = array(
    'http' => array(
        'header'  => "Content-Type: application/json\r\n" .
                     "Content-Length: " . strlen($json_payload) . "\r\n",
        'method'  => 'POST',
        'content' => $json_payload,
        'ignore_errors' => true // Permitir leer la respuesta aunque haya errores HTTP
    )
);

$context  = stream_context_create($options);
$response = @file_get_contents($url, false, $context);

// 4. Analizar respuesta de la API
$success = false;
$error_msg = '';
$http_code = 'Unknown';

if (isset($http_response_header)) {
    // Extraer código HTTP del primer header
    preg_match('{HTTP\/\S*\s(\d{3})}', $http_response_header[0], $match);
    $http_code = isset($match[1]) ? $match[1] : 'Unknown';
}

if ($response !== false) {
    $response_data = json_decode($response, true);
    if ($http_code == '200' && isset($response_data['success']) && $response_data['success']) {
        $success = true;
    } else {
        $error_msg = isset($response_data['error']) ? $response_data['error'] : 'Unknown API Error';
    }
} else {
    $error_msg = 'Could not connect to Socket.io Node server on port 3000. Verify the container is running.';
}

// 5. Mostrar resultados
if ($is_cli) {
    if ($success) {
        echo "\033[32m✔ [ÉXITO] Notificación enviada con éxito.\033[0m\n";
        echo "Mensaje: \"$message\"\n";
        if ($to) {
            echo "Destinatario: $to\n";
        } else {
            echo "Tipo: Difusión Global (Broadcast)\n";
        }
    } else {
        echo "\033[31m✘ [ERROR] Falló al enviar notificación (HTTP $http_code).\033[0m\n";
        echo "Causa: $error_msg\n";
    }
} else {
    // Renderizado responsivo para navegador
    ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificador PHP - Event Injector</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Plus Jakarta Sans', sans-serif;
                background-color: #0f0e13;
                color: #ffffff;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .card {
                background-color: #16151a;
                border: 1px solid #2d2b33;
                border-radius: 12px;
                padding: 30px;
                width: 100%;
                max-width: 480px;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
            }
            h2 { margin-top: 0; font-size: 20px; font-weight: 700; color: #8fa9ff; }
            .status {
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            .success { background-color: rgba(46, 196, 182, 0.15); color: #2ec4b6; border: 1px solid rgba(46, 196, 182, 0.3); }
            .error { background-color: rgba(230, 57, 70, 0.15); color: #e63946; border: 1px solid rgba(230, 57, 70, 0.3); }
            .meta-item {
                font-size: 13px;
                margin-bottom: 8px;
                color: #94a3b8;
            }
            .meta-item strong { color: #ffffff; }
            .btn {
                display: inline-block;
                padding: 10px 16px;
                background-color: #1f51e5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                margin-top: 15px;
                transition: background-color 0.2s;
            }
            .btn:hover { background-color: #163cb3; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>PHP Event Injector (Ecosistema Mixto)</h2>
            
            <?php if ($success): ?>
                <div class="status success">✔ Notificación enviada exitosamente</div>
                <div class="meta-item"><strong>Mensaje:</strong> <?php echo htmlspecialchars($message); ?></div>
                <div class="meta-item"><strong>Destinatario:</strong> <?php echo htmlspecialchars($to ? $to : 'DIFUSIÓN GLOBAL (Todos)'); ?></div>
                <div class="meta-item"><strong>HTTP Status:</strong> <?php echo htmlspecialchars($http_code); ?> OK</div>
            <?php else: ?>
                <div class="status error">✘ Falló el envío de la notificación</div>
                <div class="meta-item"><strong>Error:</strong> <?php echo htmlspecialchars($error_msg); ?></div>
                <div class="meta-item"><strong>HTTP Status:</strong> <?php echo htmlspecialchars($http_code); ?></div>
            <?php endif; ?>
            
            <a href="?message=Alerta+manual+desde+browser+a+las+<?php echo date('H:i:s'); ?>" class="btn">Probar Alerta Manual</a>
        </div>
    </body>
    </html>
    <?php
}
?>
