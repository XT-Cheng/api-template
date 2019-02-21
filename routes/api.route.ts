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
        if (API._isBusy) {
            setTimeout(() => APIRoute.execute(req, res, next), 100);
        } else {
            API._isBusy = true;
            API.execute(req.body.dialog).then(ret => {
                API._isBusy = false;
                res.json(ret);
            }, (reason) => {
                API._isBusy = false;
                console.log(`BAPI Executed failed: ${reason}`);
                console.log(reason);
                res.json({
                    status: 1,
                    error: reason
                });
            });
        }
    }
}