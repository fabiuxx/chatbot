import { ping, signIn } from "API";
import React from "react"

/**
 * Interface de definición para atributos de componente.
 */
export interface SignInPanelProps {
    /**
     * Callback que permite, principalmente a componentes padres, conocer el identificador de sesión obtenido
     * por este componente.
     * @param id Identificador obtenido.
     * @returns nada.
     */
    idConsumer: (id: string) => void;
}

/**
 * Interface de definición para estado de componente.
 */
interface SignInPanelState {
    /**
     * Bandera que indica que la verificación del alias, para una nueva sesíón, está en proceso.
     */
    verificando: boolean;
    /**
     * Mensajes informativos para el proceso de verificacíón del alias.
     */
    verificando_msgs: Array<string>;
}

/**
 * Componente.
 */
export class SignInPanel extends React.Component<SignInPanelProps, SignInPanelState> {

    /**
     * Referencia a DOM para elemento de ingreso de texto.
     */
    private refInputAlias: React.RefObject<HTMLInputElement>;

    constructor(props: SignInPanelProps) {
        super(props);
        this.refInputAlias = React.createRef();
        this.state = { verificando: false, verificando_msgs: [] };
    }

    render(): React.ReactNode {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h1>Acceso</h1>
                <div>
                    <label>MI ALIAS:&nbsp;</label>
                    <input ref={this.refInputAlias} placeholder="Ingresar Alias" title="Ingresar Alias" />
                </div>
                <div style={{ marginTop: "1em" }}>
                    <button onClick={this.doSignIn.bind(this)} title="Acceder">ACCEDER</button>
                </div>
                {this.state.verificando && (
                    <div style={{ marginTop: "1em" }}>
                        {this.state.verificando_msgs.map((txt, i) => <div key={i} dangerouslySetInnerHTML={{ __html: txt }} />)}
                    </div>
                )}
            </div>
        );
    }

    componentDidMount(): void {
        this.refInputAlias.current?.focus();
    }

    private alertError(err: string) {
        this.setState({ verificando: false, verificando_msgs: [] }, () => {
            alert(err);
        });
    }

    private doSignIn() {
        this.setState({ verificando: true }, async () => {
            // Ping.
            this.pushVerificationMsg(`verificando <em>backend</em> en línea ...`);
            const respPing = await ping();
            if (!respPing.isOk()) {
                this.alertError(respPing.getError().message);
                return;
            }

            // Verificar alias.
            const alias: string = this.refInputAlias.current?.value ?? "";
            this.pushVerificationMsg(`verificando alias <strong>${alias}</strong> ...`);
            const respSignIn = await signIn(alias);
            if (!respSignIn.isOk()) {
                this.alertError(respSignIn.getError().message);
                return;
            }

            // Ok. Notificar id generado.
            const id = respSignIn.getData();
            this.props.idConsumer(id);
        });
    }

    /**
     * Agrega un nuevo mensaje informativo generado durante verificacíón de alias.
     * @param txt Mensaje.
     */
    private pushVerificationMsg(txt: string) {
        this.state.verificando_msgs.push(txt);
        this.setState({ verificando_msgs: this.state.verificando_msgs });
    }

}