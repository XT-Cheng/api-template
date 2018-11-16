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
            name: `admin`,
            email: `xyz@abc.com`,
            avatar: `assets/people.png`
        }

        const jwtBearerToken = jwt.sign({
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }, RSA_PRIVATE_KEY, {
                algorithm: 'RS256',
                //expiresIn: 12000,
                subject: user.name
            });
        res.status(200).json({
            auth_app_token: jwtBearerToken
        });
    }
}
