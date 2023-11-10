FROM alpine:latest as base

ENV GROUP=appgroup
ENV USER=appuser

# Instalar paquetes necesarios.
RUN apk add unzip
RUN apk add erlang
RUN apk add xz
RUN apk add tar
RUN apk add python3
RUN apk add py3-pip

# Crear grupo y usuario por defecto.
RUN addgroup -S $GROUP
RUN adduser -S $USER -G $GROUP
USER $USER

# Preparar rabbitmq.
WORKDIR /home/$USER
ENV rabbitmq_dir=rabbitmq_server-3.12.7
RUN wget https://github.com/rabbitmq/rabbitmq-server/releases/download/v3.12.7/rabbitmq-server-generic-unix-3.12.7.tar.xz
RUN tar -xf *.tar.xz
RUN rm -rf *.tar.xz

# Preparar servidor backend.
WORKDIR /home/$USER
RUN mkdir backend
COPY ./backend/requirements.txt /home/$USER/backend/requirements.txt
COPY ./backend/*.py /home/$USER/backend
RUN pip install -r ./backend/requirements.txt

# Preparar servidor frontend.
WORKDIR /home/$USER
RUN mkdir frontend
COPY ./frontend/dist /home/$USER/frontend/dist
COPY ./frontend/requirements.txt /home/$USER/frontend/requirements.txt
COPY ./frontend/*.py /home/$USER/frontend
COPY ./frontend/*.html /home/$USER/frontend
RUN pip install -r ./backend/requirements.txt

COPY ./docker/entrypoint.sh entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]

EXPOSE 5672
EXPOSE 15672
EXPOSE 8000
EXPOSE 8001