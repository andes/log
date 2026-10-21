import { Request, Response } from 'express';

declare module 'express-serve-static-core' {
    interface Request {
        request_id?: string;
        user?: Record<string, unknown>;
    }
}

export function enrichWideEvent(req: Request, res: Response, data: Record<string, unknown>): void {
    const wideEvent = res.locals.wideEvent as Record<string, unknown> | undefined;
    if (!wideEvent) {
        return;
    }
    Object.assign(wideEvent, data);
}

export function enrichWideEventUser(req: Request, res: Response): void {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) {
        return;
    }
    enrichWideEvent(req, res, {
        user: {
            id: user._id || user.id,
            rol: user.rol || user.role,
        },
    });
}
