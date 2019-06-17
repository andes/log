import { Schema, SchemaTypes } from 'mongoose';

export let schema = new Schema({
    level: String,
    type: String,
    start: Date,
    end: Date,
    expiredAt: Date,

    entries: [{
        date: Date,
        action: String,
        usuario: SchemaTypes.Mixed,
        app: SchemaTypes.Mixed,
        organizacion: SchemaTypes.Mixed,
        data: {
            anterior: SchemaTypes.Mixed,
            valor: SchemaTypes.Mixed,
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
    }]
});
