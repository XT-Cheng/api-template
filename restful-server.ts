import * as bodyParser from 'body-parser';
import errorHandler = require('errorhandler');
import * as express from 'express';
import { createServer, Server } from 'http';
import * as logger from 'morgan';
import { concat, Observable } from 'rxjs';

import { AuthRoute } from './routes/auth.route';
import { Database } from './oracle';
import { API } from './api';
import { APIRoute } from './routes/api.route';
import { FetchRoute } from './routes/fetch.route';

/**
 * The server.
 *
 * @class RestfulServer
 */
export class RestfulServer {

    public app: express.Application;
    private port: any;
    private httpServer: Server

    private dbUser: string;
    private dbPassword: string;
    private dbConnectString: string;

    private bapiHost: string;
    private bapiTerminal: number;

    /**
     * start the restful server
     *
     * @class Server
     * @method start
     * @static
     * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
     */
    public start() {
        this.httpServer = createServer(this.app);

        //listen on provided ports
        this.httpServer.listen(this.port);

        //add error handler
        this.httpServer.on("error", this.onError);

        //start listening on port
        this.httpServer.on("listening", this.onListening.bind(this));
    }

    /**
     * Constructor.
     *
     * @class Server
     * @constructor
     */
    constructor() {
        //create expressjs application
        this.app = express();
        this.port = this.normalizePort(process.env.PORT || 4000);
        console.log(`PORT: ${this.port}`);

        this.dbUser = process.env.DBUSER || `hydadm`;
        this.dbPassword = process.env.DBPASSWORD || `HyTest$6`;
        this.dbConnectString = process.env.DBCONNECTSTRING || `cne35db03/HYD1E35`;
        console.log(`DB USER: ${this.dbUser}`);
        console.log(`DB PASSWORD: ${this.dbPassword}`);
        console.log(`DB CONNECTSTRING: ${this.dbConnectString}`);

        this.bapiHost = process.env.BAPIHOST || `cne35db03`;
        this.bapiTerminal = Number.parseInt(process.env.BAPITERMINAL || `3600`);
        console.log(`BAPI HOST: ${this.bapiHost}`);
        console.log(`BAPI TERMINAL: ${this.bapiTerminal}`);

        concat(this.connectDb(), this.initBapi(), this.preRoute(), this.routes(), this.postRoute()).subscribe(
            _ => {
                console.log("RESTful Server Initialized!");
            }, err => console.error(`RESTful Server start failed:${err}`)
        )
    }

    private connectDb(): Observable<void> {
        return Observable.create(observer => {
            Database.createPool(this.dbUser, this.dbPassword, this.dbConnectString).then(() => {
                console.log("db connected");
                observer.complete();
            }, err => observer.error(err));
        });
    }

    private initBapi(): Observable<void> {
        return Observable.create(observer => {
            try {
                API.initialize(this.bapiHost, this.bapiTerminal);
                console.log("Bapi initialized");
                observer.complete();
            } catch (err) {
                observer.error(err);
            }
        });
    }

    private preRoute(): Observable<void> {
        return Observable.create(observer => {
            //use logger middlware
            this.app.use(logger("dev"));
            //use json form parser middlware
            this.app.use(bodyParser.json());
            //CORS on ExpressJS
            this.app.use(function (req, res, next) {
                res.header("Access-Control-Allow-Origin", <string>req.headers['origin']);
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
                res.header('Access-Control-Allow-Credentials', 'true');
                next();
            });

            console.log("preRoute");
            observer.complete();
        })
    }

    private postRoute(): Observable<void> {
        return Observable.create(observer => {
            this.app.use(errorHandler());
            console.log("postRoute");
            observer.complete();
        })
    }

    private routes(): Observable<void> {
        let router: express.Router;

        return Observable.create(observer => {
            router = express.Router();

            AuthRoute.create(router);

            //Route create
            APIRoute.create(router);
            FetchRoute.create(router);

            //use router middleware
            this.app.use(router);
            observer.complete();
        })
    }

    private normalizePort(val: any) {
        var port = parseInt(val, 10);

        if (isNaN(port)) {
            // named pipe
            return val;
        }

        if (port >= 0) {
            // port number
            return port;
        }

        return false;
    }

    private onError(error) {
        if (error.syscall !== "listen") {
            throw error;
        }

        var bind = typeof this.port === "string"
            ? "Pipe " + this.port
            : "Port " + this.port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case "EACCES":
                console.error(bind + " requires elevated privileges");
                process.exit(1);
                break;
            case "EADDRINUSE":
                console.error(bind + " is already in use");
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    private onListening() {
        var addr = this.httpServer.address();
        var bind = typeof addr === "string"
            ? "pipe " + addr
            : "port " + addr.port;
        console.log("Listening on " + bind);
    }
}

process.env.UV_THREADPOOL_SIZE = '10';
new RestfulServer().start();