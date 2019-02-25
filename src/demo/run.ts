import { log, query } from '../lib/controller/log';
import * as mongoose from 'mongoose';

async function write() {
    console.log('Writing log...');
    try {
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

        let document = await log(fakeRequest, 'microservice:operacion:subnivel', '57f67a7ad86d9f64130a138d', 'guardar', 'xx', 'yy');
        console.log('OK');
    } catch (err) {
        console.error('ERROR', err);
    }
}

async function read() {
    let result;
    console.log('Read log by key...');
    result = await query('microservice:operacion:subnivel', null);
    console.log(result);

    console.log('Read log by regex key...');
    result = await query(/microservice:operacion/, null);
    console.log(result);

    console.log('Read log by paciente...');
    result = await query(null, mongoose.Types.ObjectId('57f67a7ad86d9f64130a138d'));
    console.log(result);
}

export async function run() {
    await write();
    await read();
    process.exit();
}
