import { initModel } from '../schema/log';
import { IRequest } from '../interfaces/log';
import * as mongoose from 'mongoose';

/**
 * Crea un log en la base de datos
 *
 * @export
 * @param {IRequest} req Contiene dato de autenticación (usuario, aplicación, organización), conexión, etc.
 * @param {String} key Clave del registro. Debe ser en el formato modulo:clave1:valor2:clave2:valor2:.... (opcional)
 * @param {*} paciente Id del paciente (requerido si no se especifica key)
 * @param {String} operacion Nombre de la operación
 * @param {*} valor Datos actuales de la operación
 * @param {*} [anterior] Datos anteriores de la operación
 * @param {String} error Un string que representa al error (opcional)
 * @returns {Document} Documento guardado en la base de datos
 */
export function log(req: IRequest, paciente: any, prestacion: any, motivoAcceso: String, profesional: any, turno?: any, fueraDeAgenda?: Boolean): Promise<any> {
    let model = initModel();
    let data = new model({
        fecha: new Date(),
        paciente,
        profesional,
        prestacion,
        turno,
        fueraDeAgenda,
        motivoAcceso,
        usuario: req.user && req.user.usuario,
        app: req.user && req.user.app,
        organizacion: req.user && req.user.organizacion,
        cliente: {
            ip: req.ip,
            userAgent: req.useragent
        },
        servidor: {
            ip: req.connection && req.connection.localAddress
        }
    });
    return data.save();
}

/**
 * Lee un log desde la base de datos
 *
 * @export
 * @param {(string | RegExp)} key Clave del registro. Debe ser en el formato modulo:clave1:valor2:clave2:valor2:....
 * @param {mongoose.Types.ObjectId} paciente Id del paciente (requerido si no se especifica key).
 * @param {Date} [desde=null] Cota inferior para consultar un período de tiempo.
 * @param {Date} [hasta=null] Cota superior para consultar un período de tiempo.
 * @param {number} [skip=0] Indica si desea saltar una serie de registros. Se utiliza para paginar los resultados.
 * @param {number} [limit=0] Limita los consultados a una serie de registros.
 * @returns
 */
export function query(paciente: mongoose.Types.ObjectId, desde: Date = null, hasta: Date = null, skip = 0, limit = 0): Promise<any> {
    if (!paciente) {
        throw new Error('Debe ingresar el parámetro  \'paciente\'');
    }

    let model = initModel();
    let data = model.find({});
    // Opciones de búsqueda

    if (paciente) {
        data.where('paciente').equals(paciente);
        data.sort({ paciente: 1, fecha: -1 });
    }
    if (desde) {
        data.where('fecha').gte(desde as any);
    }
    if (hasta) {
        data.where('fecha').gte(hasta as any);
    }
    // Paginado
    data.skip(skip);
    data.limit(Math.min(limit, 50));
    // Ejecuta la consulta
    return data.exec();
}
