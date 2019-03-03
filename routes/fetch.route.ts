import { NextFunction, Request, Response, Router } from 'express';
import { Database } from '../oracle';

export class FetchRoute {
    public static create(router: Router) {
        console.log('Fetch route create');

        //Execute API
        router.post('/fetch', (req: Request, res: Response, next: NextFunction) => {
            FetchRoute.execute(req, res, next);
        });
    }

    private static execute(req: Request, res: Response, next: NextFunction) {
        Database.fetch(req.body.sql).then((ret) => {
            res.json(ret.rows);
        }, (reason) => {
            console.log(req.body.sql);
            console.log(`Fetch failed: ${reason.message}`);
            res.json({
                status: 1,
                error: reason.message
            });
        });
    }
}