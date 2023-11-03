import { signOut } from "API";
import React, { Fragment } from "react"

/**
 * Interface de definición para atributos de componente.
 */
export interface ChatPanelProps {
    /**
     * Identificador de sesíón activa.
     */
    id: string;
}

/**
 * Interface de definición para atributos de estado de componente.
 */
export interface ChatPanelState {
    /**
     * Bandera que indica si la comunicación con el servicio backend está activa.
     */
    alive: boolean;

    /**
     * Historial de mensajes.
     * NOTE: Esto debe ser reemplazado por algo mas robusto.
     */
    messages: Array<Message>;
}

/**
 * Interface de definición para mensajes intercambiados.
 */
export interface Message {
    /**
     * Tiempo (epoch) de generación de mensaje, ya sea entrante o saliente.
     */
    time: number;
    /**
     * Tipo de mensaje.
     */
    kind: MessageKind;
    /**
     * Cuerpo de mensaje.
     */
    body: Array<string>;
}

/**
 * Enumeración para tipos de mensajes posibles.
 */
export enum MessageKind {
    INCOMING = 1,
    OUTGOING = 2
}

// Códigos de tipo de mensajes transmitidos vía websockets.
const WS_MSG_TYPE_CLIENT_PUBLISH_MSG = 1;
const WS_MSG_TYPE_CLIENT_RECEIVE_MSG = 2;

/**
 * Componente para panel de chat.
 */
export class ChatPanel extends React.Component<ChatPanelProps, ChatPanelState> {
    private refTextArea: React.RefObject<HTMLTextAreaElement>;
    private ws: WebSocket | null;

    constructor(props: ChatPanelProps) {
        super(props);
        this.state = { alive: true, messages: [] };
        this.refTextArea = React.createRef();
        this.ws = null;
    }

    render(): React.ReactNode {
        return (
            <div>
                <div>
                    <div>Mensaje:</div>
                    <textarea rows={5} ref={this.refTextArea} />
                    <br />
                    <button title="Enviar" onClick={this.onBtnEnviarClick.bind(this)}>ENVIAR</button>
                </div>
                <div style={{ marginTop: 10 }}>
                    {this.state.messages.map((m, i) => <ChatMessageItem key={i} msg={m} />)}
                </div>
            </div>
        )
    }

    componentDidMount(): void {
        // Foco en componente de texto para mensaje.
        this.refTextArea.current?.focus();

        // Crear web socket.
        if (this.ws === null) {
            // Conectarnos a servidor via web socket.
            this.ws = new WebSocket('ws://localhost:8000/ws');

            // Procesamiento de mensajes entrantes desde servidor.
            this.ws.onmessage = (event: MessageEvent<string>) => {
                const response = JSON.parse(event.data);
                if (response.status.success === true) {
                    // NOTE: AGREGAR SOPORTE A OTROS TIPOS DE MENSAJE, SI HUBIERE.
                    const type: number = response.payload.msg_type;
                    switch (type) {
                        case WS_MSG_TYPE_CLIENT_RECEIVE_MSG:
                            const message = this.buildMsg(response.payload.msg, MessageKind.INCOMING);
                            this.state.messages.push(message);
                            this.setState({ messages: this.state.messages });
                            break;
                    }
                }
            }

            // Logica de finalización.
            this.ws.onerror = () => {
                // Finalizar sesión.
                signOut(this.props.id);
                this.setState({ alive: false });
            }

            // Logica de finalización.
            this.ws.onclose = () => {
                // Finalizar sesión.
                signOut(this.props.id);
                this.setState({ alive: false });
            }
        }
    }

    componentWillUnmount(): void {
        // Cerrar websocket y finalizar sesión.
        if (this.ws !== null) {
            this.ws.close();
            signOut(this.props.id);
        }
    }

    /**
     * Envía el texto ingresado en el elemento HTML de mensajes.
     */
    private onBtnEnviarClick() {
        // Control.
        if (this.state.alive !== true) {
            alert("No conectado a servidor.");
        }

        // Mensaje a enviar.
        const msg = this.refTextArea.current?.value ?? "";
        if (msg !== "") {
            // Enviar via websocket.
            const data = {
                id: this.props.id,
                msg_type: WS_MSG_TYPE_CLIENT_PUBLISH_MSG,
                msg: msg
            };
            this.ws?.send(JSON.stringify(data));

            // Agregar a historial.
            const message = this.buildMsg(msg, MessageKind.OUTGOING);
            this.state.messages.push(message);
            this.setState({ messages: this.state.messages });
        }
    }

    /**
     * Construye un mensaje intercambiado.
     * @param msg Texto de mensaje.
     * @param kind Tipo de mensaje.
     * @param time Tiempo de generación de mensaje, opcional.
     * @returns Mensaje intercambiado.
     */
    private buildMsg(msg: string, kind: MessageKind, time?: number): Message {
        let time0 = time ?? Date.now();
        return {
            time: time0,
            kind: kind,
            body: [msg]
        };
    }
}

/**
 * Interface de defición para atributos de componente.
 */
interface ChatMessageItemProps {
    /**
     * Mensaje intercambiado.
     */
    msg: Message
}

/**
 * Componente.
 */
class ChatMessageItem extends React.Component<ChatMessageItemProps> {

    render(): React.ReactNode {
        const stamp = this.genTimestamp();
        const prefix = this.genPrefix();
        return (
            <Fragment>
                {this.props.msg.body.map((txt, i) => {
                    return (
                        <div key={i}>
                            <span>{stamp}</span>&nbsp;<span>{prefix}</span>&nbsp;{txt}
                        </div>
                    );
                })}
            </Fragment>
        );
    }

    /**
     * Genera un prefijo que permite entender visualmente el tipo de mensaje mostrado.
     * @returns Prefijo.
     */
    private genPrefix(): string {
        switch (this.props.msg.kind) {
            case MessageKind.INCOMING:
                return "<<<";
            case MessageKind.OUTGOING:
                return ">>>";
            default:
                return "---";
        }
    }

    /**
     * Genera un texto, en formato humano, para el tiempo en que el mensaje fue generado.
     * @returns Texto con fecha de generación de mensaje.
     */
    private genTimestamp(): string {
        return new Date(this.props.msg.time).toISOString();
    }

}