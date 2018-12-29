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
        console.log(req.body.sql);
        Database.fetch(req.body.sql).then((ret) => {
            res.json(ret.rows);
        });
    }
}