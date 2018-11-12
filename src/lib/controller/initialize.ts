import * as mongoose from 'mongoose';


export class Connections {
    static main: mongoose.Connection;

    static initialize(host: any) {
        mongoose.connect(host);
        this.main = mongoose.connection;
        // Configura eventos
        this.configEvents('main', this.main);
    }

    private static configEvents(name: string, connection: mongoose.Connection) {
        connection.on('connecting', () => console.log('connecting...'));
        connection.on('error', (error) => console.log('error'));
        connection.on('connected', () => console.log('conectado'));
        connection.on('reconnected', () => console.log('reconectado'));
        connection.on('disconnected', () => console.log('desconectado'));
    }

}