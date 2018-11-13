import { Document } from 'mongoose';
import { model, schema } from '../schema/log';
import { IRequest } from '../interfaces/log';
/**
 * Crea un log en la base de datos
 *
 * @export
 * @param {Express.Request} req Request
 * @param {String} key Clave del registro. Debe ser en el formato modulo:clave1:valor2:clave2:valor2:.... (opcional)
 * @param {any} paciente Id del paciente (requerido si no se especifica key)
 * @param {String} operacion Nombre de la operación
 * @param {*} valor Datos actuales de la operación
 * @param {*} [anterior] Datos anterior de la operación
 * @returns {Promise<Document>}
 */
export function log(req: IRequest, key: String, paciente: any, operacion: String, valor: any, anterior?: any): Promise<Document> {
    let data = new model({
        key,
        paciente,
        operacion,
        fecha: new Date(),
        usuario: req.user && req.user.usuario,
        app: req.user && req.user.app,
        organizacion: req.user && req.user.organizacion,
        data: anterior || valor ? {
            anterior,
            valor,
        } : null,
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