import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema({
    key: {
        type: String,
        required: () => {
            return !this.paciente;
        }
    },
    paciente: {
        type: mongoose.Schema.Types.Mixed,
        required: () => {
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
        userAgent: { // utiliza plugin https://github.com/biggora/express-useragent
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
});

// Indices
schema.index({ key: 1, fecha: -1 });
schema.index({ paciente: "text", fecha: -1 });

export let model = mongoose.model('logs', schema, 'logs');