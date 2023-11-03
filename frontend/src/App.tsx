import { ChatPanel } from "Chat";
import React from "react"
import { render } from "react-dom";
import { SignInPanel } from "SignIn";

/**
 * Interface de definición para atributos de componente.
 */
interface AppState {
    id: string;
}

/**
 * Componente central de aplicaión.
 */
class App extends React.Component<{}, AppState> {

    /**
     * Constructor.
     * @param props Atributos. 
     */
    constructor(props: {}) {
        super(props);
        this.state = { id: "" };
    }

    /**
     * @inheritdoc
     */
    render(): React.ReactNode {
        const childs: Array<React.ReactNode> = [];
        if (this.state.id === "") {
            childs.push(<SignInPanel idConsumer={this.onIdResolved.bind(this)} />);
        } else {
            childs.push(<ChatPanel id={this.state.id} />);
        }
        return childs;
    }

    /**
     * Modifica el estado interno cuando un identificador de sesión es asignado.
     * @param id Identificador de sesión asignado.
     */
    private onIdResolved(id: string) {
        this.setState({ id: id });
    }
}

/**
 * Punto de entrada desde documentos HTML.
 * @param el Elemento HTML contenedor.
 */
export const mount = function (el: HTMLElement) {
    render(<App />, el);
}