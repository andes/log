import { Connections } from './../controller/initialize';
import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    /*
    La propiedad fecha no es necesaria, se puede inferir del objectId con la funcion getTimeStamp()
    */
    paciente: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    // fechaInicio y fin pueden usarse como límites del bucket y así dividir los logs entre fechas (mensual - bimestral - semestral etc)
    fechaInicio: {
        type: Date,
        required: true
    },
    fechaFin: {
        type: Date,
        required: true
    },
    dataAccessos: [{
        // sub-schema de la prestación - {id, tipoPrestacion(de la solicitud):{id,term}, fechaEjecucion(?) }
        prestacion: mongoose.Schema.Types.Mixed,
        turno: {
            type: mongoose.Types.ObjectId,
        },
        fueraDeAgenda: {
            type: Boolean,
            default: false
        },
        motivoAcceso: {
            type: String,  // continuidad del cuidado del paciente, auditoría, urgencia/emergencia, facturación/auditoría
            required: true
        },
        usuario: mongoose.Schema.Types.Mixed,
        // sub-schema del profesional - {id, matricula}
        profesional: mongoose.Schema.Types.Mixed,
        app: mongoose.Schema.Types.Mixed,
        organizacion: mongoose.Schema.Types.Mixed,
        cliente: {
            ip: String,
            userAgent: { // schema de plugin https://github.com/biggora/express-useragent
                isMobile: Boolean,
                isDesktop: Boolean,
                isBot: Boolean,
                browser: String,
                version: String,
                os: String,
                platform: String,
                source: String
            }
        },
        servidor: {
            ip: String
        }
    }],
});

// Indices
schema.index({ paciente: 1, fecha: -1 });

// Hay que diferir la inicialización del modelo está que esté lista la colección
// jgabriel | Igual esta solución no me gusta mucho :(
let _model = null;
export function initModel(): mongoose.Model<mongoose.Document> {
    if (!_model) {
        _model = Connections.main.model('accessLogsBucket', schema, 'accessLogsBucket');
    }
    return _model;
}
