import { Document } from 'mongoose';
import { model, schema } from '../schema/log';

/**
 * Crea un log en la base de datos
 *
 * @export
 * @param {Express.Request} req Request
 * @param {String} key Clave del registro. Debe ser en el formato modulo:clave1:valor2:clave2:valor2:.... (opcional)
 * @param {String} paciente Id del paciente (requerido si no se especifica key)
 * @param {String} operacion Nombre de la operación
 * @param {*} valor Datos actuales de la operación
 * @param {*} [anterior] Datos anterior de la operación
 * @returns {Promise<Document>}
 */
export function log(req: any, key: String, paciente: String, operacion: String, valor: any, anterior?: any): Promise<Document> {
    let data = new model({
        key,
        paciente,
        operacion,
        fecha: new Date(),
        usuario: 'Lalalal', // (req as any).user.usuario,
        app: 'mi app', // (req as any).user.app,
        organizacion: 'mi org', // (req as any).user.organizacion,
        data: anterior || valor ? {
            anterior,
            valor,
        } : null,
        cliente: {
            ip: 'mi ip', // (req as any).ip,
            userAgent: 'mi agente', // (req as any).useragent
        },
        servidor: {
            ip: 'mi local'// (req as any).connection.localAddress
        }
    });
    return data.save();
}