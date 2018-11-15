export interface IRequest {
    user?: {
        usuario?: any,
        app?: String,
        organizacion?: any
    };
    ip?: String;
    useragent?: any;
    connection?: {
        localAddress?: String
    };
}
