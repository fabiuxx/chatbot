import time
import traceback
from flask import Flask, request
from flask_cors import CORS
from flask_sock import Sock, ConnectionClosed
import hashlib
import random
import string
import json
import mq

'''
Clase que encapsula a una sesión activa.
'''
class Session():
    def __init__(self, alias, id):
        self.id = id
        self.alias = alias
        self.created_s = time.time()
        self.last_access_s = self.created_s
        self.ws = None

'''
Caché para sesiones activas, en una implementación mas robusta esto
debe reemplazarse por un soporte en base de datos o similar.
'''
SESSIONS = list()

'''
Dado un alias, se genera un identificador que permite el seguimiento de la sesión.
'''
def gen_session_id_from_alias(alias):
    # NOTE: AQUI A MODO DE PRUEBA DE CONCEPTO SOLO SE GENERA UN HASH CON UN VALOR ALEATORIO A PARTIR DEL ALIAS INDICADO.
    salt = ''.join(random.choice(string.printable) for i in range(16))
    hash = hashlib.sha256('{0};{1}'.format(alias, salt).encode("utf-8"))
    return hash.hexdigest()

'''
Obtiene una sesión existente, dado un alias.
'''
def search_session_by_alias(alias):
    for session in SESSIONS:
        if session.alias == alias:
            return session
    return None

'''
Obtiene una sesión existente, dado un identificador.
'''
def search_session_by_id(id):
    for session in SESSIONS:
        if session.id == id:
            return session
    return None

# Códigos para tipos de mensajes intercambiados a través de websockets.
WS_MSG_TYPE_CLIENT_PUBLISH_MSG = 1;
WS_MSG_TYPE_CLIENT_RECEIVE_MSG = 2;

# Componentes propios de Flask.
app = Flask(__name__)
cors = CORS(app)
sock = Sock(app)

'''
Permite generar un objeto json que encapsula una respuesta de éxito para peticiones HTTP.
'''
def resp_success(payload):
    d = dict()
    d['status'] = dict()
    d['status']['success'] = True
    d['payload'] = payload
    return d

'''
Permite generar un objeto json que encapsula una respuesta de fallo para peticiones HTTP.
'''
def resp_failure(cause: str, payload=None):
    d = dict()
    d['status'] = dict()
    d['status']['success'] = False
    d['status']['cause'] = cause
    if payload is not None:
        d['payload'] = payload
    return d

'''
Permite consultar si el servicio está activo.
'''
@app.route("/ping", methods=["GET"])
def ping():
    return (resp_success("pong"), 200)

'''
Permite crear una nueva sesión.
'''
@app.route("/sign_in", methods=["POST"])
def sign_in():
    try:
        # Generar identificador de sesion a partir de alias.
        alias = request.json["alias"]
        id = gen_session_id_from_alias(alias)
        
        # Verificar si ya existe una sesion activa.
        session = search_session_by_alias(alias)
        if session is not None:
            return (resp_success(session.id), 202)
   
        # Crear nuevo exchange para mensajes destinados a esta sesion.
        mq.create_simple_exchange_queue(id)
        mq.setup_simple_exchange_queue_consumer(id, sent_to_client_consumer)
   
        # Crear nueva sesion.         
        session = Session(alias, id)
        SESSIONS.append(session)
        return (resp_success(id), 200)
    except:
        traceback.print_exc()
        return (resp_failure("ko"), 400)

'''
Callback que permite procesar y generar una respuesta ante un mensaje recibido desde el cliente.
Aquí es donde podemos aplicar toda nuestras reglas de negocio para hacer que el chatbot responda como
queramos. De momento, el chatbot solo responde lo mismo que se le fue enviado.
'''
def sent_to_client_consumer(ch, method, properties, body):
    try:
        data = json.loads(body.decode("utf-8"))
        session = search_session_by_id(data["id"])
        if session is not None:
            # Generar mensaje de respuesta.
            payload = {
                "msg_type": WS_MSG_TYPE_CLIENT_RECEIVE_MSG,
                "msg": data["msg"]
            }
            payload = resp_success(payload)
            
            # Responder por websocket asociado.
            if session.ws is not None:
                session.ws.send(json.dumps(payload))
    except:
        traceback.print_exc()
        pass

'''
Permite finalizar una sesión existente.
'''
@app.route("/sign_out", methods=["POST"])
def sign_out():
    try:
        # Id de sesion.
        id = request.json["id"]
        
        # Eliminar sesion activa, si hubiere.
        session = search_session_by_id(id)
        if session is not None:
            SESSIONS.remove(session)

        return (resp_success("ok"), 200)
    except:
        traceback.print_exc()
        return (resp_failure("ko"), 400)

'''
Permite inicializar un nuevo canal de comunicación utilizando websockets.
'''
@sock.route("/ws")
def ws_open(ws):
    # NOTE: SE CREA UN BUCLE INFINITO PARA EVITAR QUE EL WEBSOCKET SE CIERRE ANTES DE TIEMPO.
    while True:
        try:
            # Recibir datos de mensaje.
            msg = ws.receive()
            if msg is None or msg == "":
                continue
            
            # Procesar mensaje como JSON.
            data = json.loads(msg)
            
            # Determinar sesion activa.
            id = data["id"]
            session = search_session_by_id(id)
            if session is None:
                resp = resp_failure("Sin sesión")
                ws.send(json.dumps(resp))
                continue
            
            # Vincular web socket a sesion, si hubiere.
            session.ws = ws
                
            # Modificar ultimo acceso.
            session.last_access_s = time.time()
            
            # Procesar mensaje segun tipo.
            msg_type = data["msg_type"]
            
            # Publicacion de mensaje.
            if msg_type == WS_MSG_TYPE_CLIENT_PUBLISH_MSG:
                # Derivar mensaje a exchange general.
                queue_message = { "id": id, "msg": data["msg"] }
                mq.publish_pull_msg(json.dumps(queue_message))
                
                # Notificar a cliente.
                resp = resp_success({"msg_type": WS_MSG_TYPE_CLIENT_PUBLISH_MSG})
                ws.send(json.dumps(resp))
        except ConnectionClosed:
            # Terminar bucle si la conexión está terminada.
            break;
        except:
            # Error no administrado.
            traceback.print_exc()
            resp = resp_failure("Error")
            ws.send(json.dumps(resp))

# Punto de entrada de programa.
if __name__ == '__main__':
    mq.setup_pull_exchange()
    app.run(host="0.0.0.0", port=8000, debug=True)