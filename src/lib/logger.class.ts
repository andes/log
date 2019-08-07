import { Connection, Types } from 'mongoose';
import * as moment from 'moment';
const ObjectId = Types.ObjectId;

export interface LoggerOptions {
    connection: Connection;
    module: string;
    type?: string;
    expiredAt?: string;
    bucketBy?: string;
    level?: string;
    application?: string;
    traceId?: string;
}

export class Logger {
    private connection: Connection = null;
    private module = '';
    private type = '';
    private expiredAt = '';
    private bucketBy = 'day';
    private level: string;
    private duration = null;
    private application = '';
    private traceId: string;
    private _options: LoggerOptions;

    constructor(options: LoggerOptions) {
        this._options = options;
        const {
            connection,
            module,
            type = null,
            expiredAt = null,
            bucketBy = 'd',
            level = null,
            application = undefined,
            traceId = undefined
        } = options;

        if (!connection) {
            throw new Error('no connection parameter');
        }

        if (!module || typeof module !== 'string') {
            throw new Error('no module parameter');
        }

        this.connection = connection;
        this.module = module;
        this.type = type;
        this.expiredAt = expiredAt;
        this.bucketBy = bucketBy;
        this.level = level;
        this.application = application;
        this.traceId = traceId;

        if (this.expiredAt) {
            this.duration = this.expiredOffset(this.expiredAt);
        }

        this.createCollection();
    }

    private async createCollection() {
        const collection = this.connection.collection(this.module);
        collection.createIndex({ expiredAt: 1 }, { expireAfterSeconds: 0 });
        collection.createIndex({ type: 1, start: 1, end: 1, level: 1, bucketNumber: 1 }, { expireAfterSeconds: 0 });
    }

    private getCollection(module) {
        module = module || this.module;
        return this.connection.collection(module);
    }

    private expiredOffset(expiredAt: String) {
        const [num, unit] = expiredAt.split(' ');
        return moment.duration(parseInt(num, 2), unit as any);

    }

    async log(options: any = {}) {
        const collection = this.getCollection(this.module);
        const now = new Date();
        const level = options.level || this.level;
        const type = options.type || this.type;
        const bucketBy = options.bucketBy || this.bucketBy;
        const application = options.application || this.application;
        const expiredAt = this.duration ? moment(now).add(this.duration).toDate() : null;

        const { action, data, req, error } = options;

        function client(request) {
            if (!request) { return undefined; }
            return {
                ip: request.ip,
                userAgent: request.useragent
            };
        }

        function server(request) {
            if (!request) {
                return {
                    hostname: require('os').hostname()
                };
            } else {
                return {
                    hostname: require('os').hostname(),
                    ip: request.connection && request.connection.localAddress
                };
            }
        }

        function user(request) {
            if (!request) { return undefined; }
            return request.user && (request.user.usuario || request.user.app);
        }

        function organizacion(request) {
            if (!request) { return undefined; }
            return request.user && request.user.organizacion;
        }

        function url(request) {
            if (!request) { return undefined; }
            return { url: req.originalUrl, method: req.method };
        }

        let bucketNumber = 0;

        const execLog = async () => {
            return collection.update(
                {
                    level,
                    type,
                    start: { $lte: now },
                    end: { $gte: now },
                    bucketNumber
                }, {
                    $inc: { count: 1 },
                    $setOnInsert: {
                        start: moment(now).startOf(bucketBy).toDate(),
                        end: moment(now).endOf(bucketBy).toDate(),
                        level,
                        type,
                        expiredAt,
                        bucketNumber
                    },
                    $push: {
                        entries: {
                            application,
                            date: now,
                            id: data && data._id,
                            traceId: this.traceId,
                            data,
                            error,
                            action,
                            user: user(req),
                            organizacion: organizacion(req),
                            cliente: client(req),
                            servidor: server(req),
                            url: url(req)
                        }
                    }
                }, {
                    upsert: true
                }
            );
        };

        let retry = true;
        while (retry) {
            try {
                await execLog();
                retry = false;
            } catch (err) {

                if (err.code === 17419) {
                    console.warn('document size limit: consider an smaller bucket');
                    bucketNumber++;
                } else {
                    retry = false;
                }
            }
        }
    }

    private getOptions(args: IArguments) {
        if (typeof args[0] === 'object') {
            return args[0];
        } else {
            return {
                action: args[0],
                data: args[1],
                req: args[2]
            };
        }
    }

    info(args: any);
    info(action: String, data: any, req?: any);
    info() {
        let args = this.getOptions(arguments);
        return this.log({
            ...args,
            level: 'info'
        });
    }

    error(args: any);
    error(action: String, data: any, error: any, req?: any);
    error() {
        let args;
        if (typeof arguments[0] === 'object') {
            args = arguments[0];
        } else {
            args = {
                action: arguments[0],
                data: arguments[1],
                error: arguments[2],
                req: arguments[3]
            };
        }
        return this.log({
            ...args,
            level: 'error'
        });
    }

    startTrace(id = null) {
        if (!id) {
            id = String(new ObjectId());
        }

        return new Logger({
            traceId: id,
            ...this._options
        });

    }
}
