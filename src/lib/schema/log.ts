import { Connections } from './../controller/initialize';
import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    key: {
        type: String,
        required() {
            return !this.paciente;
        }
    },
    paciente: {
        type: mongoose.Types.ObjectId,
        required() {
            return !this.key;
        }
    },
    fecha: {
        type: Date,
        required: true,
    },
    operacion: {
        type: String,
        required: true
    },
    usuario: mongoose.Schema.Types.Mixed,
    app: mongoose.Schema.Types.Mixed,
    organizacion: mongoose.Schema.Types.Mixed,
    data: {
        anterior: mongoose.Schema.Types.Mixed,
        valor: mongoose.Schema.Types.Mixed,
    },
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
    },
    error: String
});

// Indices
schema.index({ key: 1, fecha: -1 });
schema.index({ paciente: 1, fecha: -1 });

// Hay que diferir la inicialización del modelo está que esté lista la colección
// jgabriel | Igual esta solución no me gusta mucho :(
let _model = null;
export function initModel(): mongoose.Model<mongoose.Document> {
    if (!_model) {
        _model = Connections.main.model('logs', schema, 'logs');
    }
    return _model;
}
