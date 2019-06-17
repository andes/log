import * as mongoose from 'mongoose';

import { Logger } from '../../index';

let host = 'mongodb://localhost:27017/andesLogs';
let options: {
    reconnectTries: 5,
    reconnectInterval: 1500,
    useNewUrlParser: true
};

async function run() {
    const connection = await mongoose.createConnection(host, options);

    const mpiLogger = new Logger({ connection, module: 'mpi' });
    const tracer = mpiLogger.startTrace('123');

    const apellido = '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';

    for (let i = 0; i < 1024 * 1024; i++) {
        await tracer.info('patient', 'create', {
            _id: '123',
            nombre: 'juan',
            apellido,
            alias: apellido + apellido + apellido + apellido + apellido,
            gobierno: apellido + apellido + apellido + apellido + apellido,
            familia: apellido + apellido + apellido + apellido + apellido,
            familia2: apellido + apellido + apellido + apellido + apellido
        });
    }


    // await tracer.info('patient', 'create', { _id: '1234', nombre: 'pedro', tooHeavyArray }, null);

    process.exit(0);
}

run();
