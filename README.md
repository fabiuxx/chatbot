# chatbot
Sistema para manejo de mensajes estilo chatbot.

## Arquitectura
Incluye tres componentes principales:
- **Servicio de mensajes:** Se utiliza un *broker* de mensajes que permita abstraer los diferentes canales por los cuales pueden ser transmitidos los mensaje del chat. Para este ejemplo concreto se utiliza rabbitmq ([home](https://www.rabbitmq.com/)).
- **Servicio backend:** Servidor en python que se encarga de dos funcionalidades principales: i) manejo de sesiones para usuarios, ii) transmision de mensajes entrantes al servicio de mensajes.
- **Servicio frontend:** Servidor en python que permite acceder a una pequenha interfaz grafica implementada con ReactJS ([home](https://es.react.dev/)).

En el servicio de mensajes, existe un *exchange* principal que se encarga de recepcionar todos los mensajes entrantes y mantenerlos en una cola exclusiva. Existe un único consumidor de esta cola que permite redirigir de vuelta cada mensaje procesado al *exchange* propio creado para cada sesión. Cada uno de estos *exchanges* se vinculan a una cola independiente que pueden ser consumidas al ritmo deseado para generar las respuestas correspondientes.

Cada consumidor de las colas de destino para mensajes, pueden mantener su propia lógica de generación de respuestas y transmitirlas por el canal que mejor les parezca. Para fines prácticos, en esta implementación sólo se reenvía el mismo mensaje recibido (*echo*) y se utilizan *websockets* para la comunicación con la interfaz gráfica. Estos consumidores, manejo de sesiones y administración de *websockets* son realizados por el servicio de backend.

En el servicio de frontend, se encuentran los puntos de entrada para el inicio de nuevas sesiones y apertura del canal de comunicacion via websockets con el servicio backend. Al crear una nueva sesión y abrir un nuevo canal *websocket*, todos los mensajes recibidos desde el backend son desplegados en pantalla.

**DISCLAIMER:** El frontened presenta 0 estilos visuales.

## Escalabilidad
Cada componente del sistema aumentarse para dar respuesta a mayores cargas de trabajo:
- **Servicio de mensajes:** Escalable mediante la formación de *clusters* de rabbitmq.
- **Servicio backend:** Se puede mantener un cluster de varias instancias de este servicio, accesibles a través de un balanceador de carga.
- **Servicio frontend:** Se puede mantener un cluster de varias instancias de este servicio, accesibles a través de un balanceador de carga.

# Ejecución
Se puede generar una imagen Docker para poner todos los servicios en marcha. Se incluye un *script* de Windows para generar la imagen Docker, pero el mismo puede ser extrapolado a entornos Linux. Una vez iniciado un contenedor con la imagen creada, se debe esperar a que se apliquen las configuraciones necesarias (principalmente de rabbitmq) antes de poder acceder a la interfaz gráfica de entrada.

Si todo está correcto, la interfaz gráfica debe ser accesible por: http://127.0.0.1:8001/.

También se expone un panel de administración, propio de rabbitmq, en: http://127.0.0.1:15672/.