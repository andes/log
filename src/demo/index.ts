import { log } from '../lib/controller/log';
import { Connections } from '../lib/controller/initialize';

async function prueba() {
    let host = 'mongodb://localhost:27017/andesLogs';
    let options: {
        reconnectTries: 5,
        reconnectInterval: 1500
    }
    try {
        Connections.initialize(host, options);

        let paciente = {
            nombre: 'Juan',
            apellido: 'Perez',
            fechaNacimiento: '01-01-1900',
            sexo: 'Masculino',
            activo: true
        }
        let fakeRequest = {
            user: {
                usuario: '777777777',
                app: 'mi app',
                organizacion: {
                    id: '121324543543543',
                    nombre: 'Los Aromos',
                    direccion: 'Los alerces 1234'
                }
            },
            connection: {
                localAddress: '127.0.0.1'
            },
            ip: '192.168.1.1',
            useragent: {
                isMobile: false,
                isDesktop: false,
                isBot: false,
                browser: true,
                version: '1.1.1',
                os: 'Android',
                platform: 'Android',
                source: 'Mi source'
            }
        };
        // No me cuadra q un argumento sea un paciente, no queda genérico
        await log(fakeRequest, 'microservice:hostias:tio', paciente, 'guardar', 'xx', 'yy')

    } catch (err) {
        console.log(err);
    }
};



prueba();
