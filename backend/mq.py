import pika
import json
import threading
import traceback

'''
Credenciales de autenticación/conexión contra servicio de mensajes rabbitmq.
'''
RABBITMQ_CREDENTIALS = pika.PlainCredentials('chatbot', 'chatbot')
RABBITMQ_CONNECTION_PARAMETERS = pika.ConnectionParameters(host='localhost', port=5672, credentials=RABBITMQ_CREDENTIALS, virtual_host="/")
RABBITMQ_PULL_QUEUE_NAME = 'q.pull';
RABBITMQ_PULL_EXCHANGE_NAME = 'x.pull';

'''
Caché para seguimiento de threads iniciados.
NOTE: ESTO SE PUEDE REEMPLAZAR POR UN POOL DE HILOS O ALGUNA SOLUCION REAL MAS ROBUSTA.
'''
THREADS = list()

'''
Inicia un nuevo hilo en segundo plano.
'''
def spawn_thread(cb):
    th = threading.Thread(target=cb)
    th.daemon = True
    th.start()
    THREADS.append(th)

'''
Crea una nueva conexión a rabbitmq.
'''
def connect():
    connection = pika.BlockingConnection(RABBITMQ_CONNECTION_PARAMETERS)
    channel = connection.channel()
    return connection, channel

'''
Inicializa un exchange principal para recibir todos los mensajes entrantes.
'''
def setup_pull_exchange():
    # Crear exchange y cola por defecto.
    connection, channel = connect()
    result = channel.queue_declare(queue=RABBITMQ_PULL_QUEUE_NAME)
    channel.exchange_declare(exchange=RABBITMQ_PULL_EXCHANGE_NAME, exchange_type='fanout')
    channel.queue_bind(exchange=RABBITMQ_PULL_EXCHANGE_NAME, queue=result.method.queue)
    connection.close()
    
    # Crear hilo de trabajo para consumir mensajes.
    spawn_thread(consume_pull_queue)

'''
Permite consumir los mensajes encolados que pasan por el exchange principal de
recepción de mensajes entrantes.
'''
def consume_pull_queue():
    def rabbit_callback(ch, method, properties, body):
        try:
            # Control.
            if body is None or body == '':
                return
            
            # Obtener identificador de sesion.
            data = json.loads(body)
            id = data["id"]
            
            # Redirigir a exchange correspondiente a sesion.
            exchange_name = 'x.push.{0}'.format(id)
            connection, channel = connect()
            channel.basic_publish(exchange=exchange_name, routing_key='', body=body)
            connection.close()
        except:
            traceback.print_exc()
            pass

    # Consumir cola.
    connection, channel = connect()
    channel.basic_consume(queue=RABBITMQ_PULL_QUEUE_NAME, on_message_callback=rabbit_callback, auto_ack=True)
    channel.start_consuming()
    connection.close()

'''
Encola un nuevo mensaje en el exchange principal de mensajes entrantes.
'''
def publish_pull_msg(msg):
    connection, channel = connect()
    channel.basic_publish(exchange=RABBITMQ_PULL_EXCHANGE_NAME, routing_key='', body=msg)
    connection.close()

'''
Permite consumir los mensajes en una cola indicada.
'''
def consume_queue(name, cb):
    # Consumir cola.
    queue_name = 'q.push.{0}'.format(name)
    connection, channel = connect()
    channel.basic_consume(queue=queue_name, on_message_callback=cb, auto_ack=True)
    channel.start_consuming()
    connection.close()
    
'''
Crea un exchange y una cola asociada, con un nombre indicado.
'''
def create_simple_exchange_queue(name):
    queue_name = 'q.push.{0}'.format(name)
    exchange_name = 'x.push.{0}'.format(name)
    connection, channel = connect()
    result = channel.queue_declare(queue=queue_name)
    channel.exchange_declare(exchange=exchange_name, exchange_type='fanout')
    channel.queue_bind(exchange=exchange_name, queue=result.method.queue)
    connection.close()

'''
Crea un nuevo hilo consumidor para una cola dada.
'''
def setup_simple_exchange_queue_consumer(name, on_message_callback):
    def run():
        queue_name = 'q.push.{0}'.format(name)
        connection, channel = connect()
        channel.basic_consume(queue=queue_name, on_message_callback=on_message_callback, auto_ack=True)
        channel.start_consuming()
        connection.close()
        
    # Iniciar nuevo hilo para consumo de cola indicada.
    spawn_thread(run)