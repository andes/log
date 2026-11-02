/**
 * Fixture de tipos: replica el uso documentado en el README.
 * Falla si `httpMiddleware()` deja de ser un middleware de Express compatible.
 */
import express from 'express';
import { createLogger, httpMiddleware, wideEventMiddleware, enrichWideEvent } from '../../src';

const app = express();

app.use(httpMiddleware());
app.use(wideEventMiddleware(createLogger('wide-event')));

app.get('/ok', (req, res) => {
    enrichWideEvent(req, res, { paciente: { id: '123' } });
    res.json({ ok: true });
});
