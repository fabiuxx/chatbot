/**
 * Interface de definición para un resultado genérico obtenido al ejecutar
 * alguna operación del API.
 */
export interface ApiResult<T> {
    /**
     * Verifica si el resultado representa un estado de éxito.
     */
    isOk(): boolean;

    /**
     * Obtiene el dato asociado al estado de éxito.
     * @returns Dato obtenido.
     */
    getData: () => T;

    /**
     * Obtiene el error asociado al estado de fallo.
     * @returns Error capturado.
     */
    getError: () => Error;
}

/**
 * Implementación para ApiResult.
 */
class ApiResultImpl<T> implements ApiResult<T> {
    /**
     * Dato para estado de éxito.
     */
    private data: T | null;

    /**
     * Dato para estado de fallo.
     */
    private error: Error | null;

    /**
     * Constructor.
     * @param data Dato para estado de éxito.
     * @param error Dato para estao de fallo.
     */
    constructor(data: T | null, error: Error | null) {
        this.data = data;
        this.error = error;
    }

    /**
     * @inheritdoc
     */
    public isOk(): boolean {
        return (this.data !== null) && (this.error === null);
    }

    /**
     * @inheritdoc
     */
    public getData(): T {
        if (this.data === null) {
            throw new Error("data is null.");
        }
        return this.data;
    }

    /**
     * @inheritdoc
     */
    public getError(): Error {
        if (this.error === null) {
            throw new Error("error is null.");
        }
        return this.error;
    }

}

/**
 * Generador de instancias concretas de resultados para estado de éxito.
 * @param data Dato para estado de éxito.
 * @returns Resultado de API.
 */
const OK = function <T>(data: T): ApiResult<T> {
    return new ApiResultImpl(data, null);
}

/**
 * Generador de instancias concretas de resultados para estado de fallo.
 * @param error Dato para estado de fallo.
 * @returns Resultado de API.
 */
const KO = function <T>(error: Error | string): ApiResult<T> {
    let err: Error;
    if (error instanceof Error) {
        err = error;
    } else {
        err = new Error(error);
    }
    return new ApiResultImpl<T>(null, err);
}

/**
 * Procesa la respuesta obtenida al consumir un API REST para generar un ApiResult.
 * @param response Respuesta HTTP obtenida.
 * @returns Respuesta de API.
 */
const handleResponse = async function <T = any>(response: Response): Promise<ApiResult<T>> {
    const statusCode = response.status;

    if (statusCode === 404) {
        return KO("Ocurrió un error procesando petición. URL no encontrada.");
    }

    if (statusCode === 500) {
        return KO("Ocurrió un error procesando petición. Verificar servidor.");
    }

    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType !== "") {
        // Contenido JSON.
        if (contentType.indexOf("javascript") !== -1 || contentType.indexOf("json") !== -1) {
            const json = await response.json();
            if (statusCode === 200 || statusCode === 202 || statusCode === 400) {
                if (json.status !== null && json.status !== undefined) {
                    if (json.status.success === false) {
                        const msg = json.status.cause ?? "Ocurrió un error procesando petición. Datos inválidos.";
                        return KO(msg);
                    } else {
                        return OK(json.payload);
                    }
                } else {
                    return KO("Ocurrió un error procesando petición. Respuesta con formato inesperado.");
                }
            }
        }
    }

    // TODO: DAR SOPORTE A OTROS TIPOS DE CONTENIDO DE RESPUESTA.
    return KO("Ocurrió un error procesando petición. Por favor vuelva a intentar.");
};

/**
 * Genera una petición GET y espera obtener una respuesta en formato JSON.
 * @param url URL de destino.
 * @returns Resultado de API.
 */
const doGetJson = async function <T>(url: string): Promise<ApiResult<T>> {
    return new Promise((resolve, reject) => {
        (async function () {
            try {
                const response = await fetch(url, {
                    method: "GET",
                    mode: "cors",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                resolve(handleResponse(response));
            } catch (err) {
                resolve(KO(err));
            }
        })();
    });
}

/**
 * Genera una petición POST, enviando datos en formato JSON, y espera obtener una respuesta
 * en formato JSON.
 * @param url URL de destino.
 * @param json Datos a enviar.
 * @returns Resultado de API.
 */
const doPostJson = async function <T>(url: string, json: unknown): Promise<ApiResult<T>> {
    const body = json ?? "";
    return new Promise((resolve, reject) => {
        (async function () {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                resolve(handleResponse(response));
            } catch (err) {
                resolve(KO(err));
            }
        })();
    });
}

export type PingResponse = "pong";

/**
 * Consulta si el servicio de backend está activo.
 * @returns Respuesta de API.
 */
export const ping = async function (): Promise<ApiResult<PingResponse>> {
    return doGetJson("http://localhost:8000/ping");
}

export type SignInResponse = string;

/**
 * Permite iniciar una nueva sesión.
 * @param alias Alias a utilizar.
 * @returns Respuesta de API.
 */
export const signIn = async function (alias: string): Promise<ApiResult<SignInResponse>> {
    return doPostJson("http://localhost:8000/sign_in", { alias: alias });
}

export type SignOutResponse = "ok" | "ko";

/**
 * Permite finalizar una sesión existente.
 * @param id Identificador de sesión.
 * @returns Respuesta de API.
 */
export const signOut = async function (id: string): Promise<ApiResult<SignOutResponse>> {
    return doPostJson("http://localhost:8000/sign_out", { id: id });
}
