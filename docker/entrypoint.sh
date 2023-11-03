#!/bin/sh

# Inicializa lo necesario para ejecutar rabbitmq.
function setup_rabbitmq() {
    echo "iniciando rabbitmq ..."
    cd /home/$USER/$rabbitmq_dir/sbin
    ./rabbitmq-server -detached

    # Cuando se inicia el server en modo detached, no se escribe el pidfile directamente por lo que
    # no podriamos utilizar 'rabbitmqctl wait <pidfile>'.
    echo "esperando a rabbitmq ..."
    while true; do
        ./rabbitmqctl await_online_nodes 1 >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            break
        fi
        sleep 1s
    done

    echo "configurando rabbitmq ..."
    ./rabbitmqctl add_user "chatbot" "chatbot" >/dev/null 2>&1
    ./rabbitmqctl set_permissions "chatbot" ".*" ".*" ".*" >/dev/null 2>&1
    ./rabbitmqctl set_user_tags "chatbot" "management" >/dev/null 2>&1
    ./rabbitmq-plugins enable rabbitmq_management >/dev/null 2>&1
    ./rabbitmq-plugins enable rabbitmq_management_agent >/dev/null 2>&1
}

# Inicializa lo necesario para ejecutar el servidor backend.
function setup_server_backend() {
    echo "iniciando servidor backend ..."
    cd /home/$USER/backend
    nohup python server.py >/dev/null 2>&1 &
}

# Inicializa lo necesario para ejecutar el servidor frontend.
function setup_server_frontend() {
    echo "iniciando servidor frontend ..."
    cd /home/$USER/frontend
    nohup python server.py >/dev/null 2>&1 &
}

setup_rabbitmq
setup_server_backend
setup_server_frontend

echo "listo."
tail -f /dev/null