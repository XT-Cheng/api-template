import { NextFunction, Request, Response, Router } from 'express';
import { Database } from '../oracle';

export class FetchRoute {
    public static create(router: Router) {
        console.log('Fetch route create');

        //Execute API
        router.get('/fetch', (req: Request, res: Response, next: NextFunction) => {
            FetchRoute.execute(req, res, next);
        });
    }

    private static execute(req: Request, res: Response, next: NextFunction) {
        console.log(req.query.sql);
        Database.fetch(req.query.sql).then((ret) => {
            res.json(ret.rows);
        });
    }
}