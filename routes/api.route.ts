import { NextFunction, Request, Response, Router } from 'express';
import { API } from '../api';

export class APIRoute {
    public static create(router: Router) {
        console.log('API route create');

        //Execute API
        router.post('/bapi', (req: Request, res: Response, next: NextFunction) => {
            APIRoute.execute(req, res, next);
        });
    }

    private static execute(req: Request, res: Response, next: NextFunction) {
        API.execute(req.body.dialog).then(ret => {
            res.json(ret);
        }, (reason) => {
            console.log(`BAPI Executed failed: ${reason}`);
            console.log(reason);
            res.json({
                status: 1,
                error: reason
            });
        });
    }
}