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
        try {
            mongoose.set('useCreateIndex', true);
            await mongoose.connect(host, options);
            this.main = mongoose.connection;
        } catch (error) {
            throw error;
        }
    }
}
