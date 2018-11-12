import { log } from '../lib/controller/log';
import { Connections } from '../lib/controller/initialize';

async function prueba() {
    let host = 'mongodb://localhost:27017/andes';
    let options: {
        reconnectTries: 5,
        reconnectInterval: 1500
    }
    let con = Connections.initialize(host);
    let x = await log('sss', 'x', 'pepe', 'save', 'xxx', 'yy')

}

prueba();
