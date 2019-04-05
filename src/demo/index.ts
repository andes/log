import { Connections } from '../lib/controller/initialize';
import { run } from './run';

// Inicializa conexión
let host = 'mongodb://localhost:27017/andesLogs';
let options: {
    reconnectTries: 5,
    reconnectInterval: 1500,
    useNewUrlParser: true
};
Connections.initialize(host, options);

// Corre el test
run();
