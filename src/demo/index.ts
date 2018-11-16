import { log } from '../lib/controller/log';
import { Connections } from '../lib/controller/initialize';

async function demo() {
    let host = 'mongodb://localhost:27017/andesLogs';
    let options: {
        reconnectTries: 5,
        reconnectInterval: 1500,
        useNewUrlParser: true
    };
    try {
        await Connections.initialize(host, options);

        let fakeRequest = {
            user: {
                app: 'mi-pp',
                organizacion: {
                    id: '121324543543543',
                    nombre: 'Los Aromos',
                    direccion: 'Los alerces 1234'
                }
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

        let document = await log(fakeRequest, 'microservice:hostias:tio', null, 'guardar', 'xx', 'yy');
        // tslint:disable-next-line:no-console
        console.log('OK');
    } catch (err) {
        // tslint:disable-next-line:no-console
        console.error('ERROR', err);
    }
    process.exit();
}

demo();
