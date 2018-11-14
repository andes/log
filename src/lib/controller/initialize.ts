import * as mongoose from 'mongoose';
import { throws } from 'assert';

export class Connections {
    static main: mongoose.Connection;

    /**
 * Crea una conexión a una base de datos mongodb
 *
 * @export
 * @param {Strin} host Un connection string.
 * @param {any} options un json con la opciones de conexión a la bd. 
 * @returns {Promise<Document>}
 */
    static async initialize(host: any, options: any) {
        try {
            mongoose.set('useCreateIndex', true);
            await mongoose.connect(host, { useNewUrlParser: true }, options);
            this.main = mongoose.connection;
        } catch (error) {
            throw error;
        }
    }
}