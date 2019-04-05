import * as mongoose from 'mongoose';

export class Connections {
    static main: mongoose.Connection;
    /**
     * Inicializa la conexión a la base de datos
     *
     * @static
     * @param {*} host Opciones de host
     * @param {*} options Opciones de conexión
     * @memberof Connections
     */
    static async initialize(host: any, options: any) {
        this.main = mongoose.createConnection(host, options);
    }

    /**
     * Cierra la conexión a la base de datos
     *
     * @memberof Connections
     */
    static close() {
        this.main.close();
    }
}
