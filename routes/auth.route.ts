import { NextFunction, Request, Response, Router } from 'express';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';

import { asyncMiddleware } from '../utils/utility';

const RSA_PRIVATE_KEY = fs.readFileSync('./jwtRS256.key');

export class AuthRoute {
    public static create(router: Router) {
        console.log('Auth route create');

        router.post('/passport/login', asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
            AuthRoute.login(req, res, next);
        }));
    }

    private static async login(req: Request, res: Response, next: NextFunction) {
        let errorMsg: string = '';
        const username = req.body.username;
        const password = req.body.password;

        const user = {
            id: 1,
            name: `admin`,
            email: `xyz@abc.com`,
            avatar: `assets/people.png`
        }

        // res.status(200).json({
        //     status: 1,
        //     error: `Wrong Password!`
        // });
        const jwtBearerToken = jwt.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }, RSA_PRIVATE_KEY, {
                algorithm: 'RS256',
                //expiresIn: 12000,
                subject: user.name
            });
        res.status(200).json({
            status: 0,
            _token: jwtBearerToken
        });
    }
}
