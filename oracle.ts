import * as oracledb from 'oracledb';
import { IConnectionPool, IConnection, IExecuteOptions, IPromise, IExecuteReturn } from 'oracledb';

export class Database {
    private static pool: IConnectionPool;

    static createPool(user: string, password: string, connectString: string): Promise<IConnectionPool> {
        (<any>oracledb).fetchAsString = [oracledb.CLOB];
        return new Promise(function (resolve, reject) {
            oracledb.createPool(
                {
                    user: user, // "hydadm",
                    password: password, // "HyTest$6",
                    connectString: connectString, //"cne35db03/HYD1E35",
                    poolMin: 10,
                    poolMax: 10,
                    poolIncrement: 0,
                },
                function (err, p) {
                    if (err) {
                        return reject(err);
                    }

                    Database.pool = p;

                    resolve(Database.pool);
                }
            );
        });
    }

    static terminatePool(): Promise<void> {
        return new Promise(function (resolve, reject) {
            if (Database.pool) {
                Database.pool.terminate(function (err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    static getConnection(): Promise<IConnection> {
        return new Promise(function (resolve, reject) {
            Database.pool.getConnection(function (err, connection) {
                if (err) {
                    return reject(err);
                }

                resolve(connection);
            });
        });
    }

    static releaseConnection(connection: IConnection): Promise<void> {
        return new Promise(function (resolve, reject) {
            connection.close()
                .then(() => resolve())
                .catch((err) => reject(err));
        });
    }

    static execute(sql, bindParams, options: IExecuteOptions, connection: IConnection): Promise<IExecuteReturn> {
        return new Promise(function (resolve, reject) {
            connection.execute(sql, bindParams, options, function (err, results) {
                if (err) {
                    return reject(err);
                }

                resolve(results);
            });
        });
    }

    static fetch(sql, bindParams?, options?: IExecuteOptions): Promise<IExecuteReturn> {
        let b = bindParams || {};
        let o = options || {};
        o.autoCommit = true;
        o.outFormat = oracledb.OBJECT;

        return new Promise(function (resolve, reject) {
            Database.getConnection()
                .then(function (connection) {
                    Database.execute(sql, b, o, connection)
                        .then(function (results) {
                            resolve(results);

                            process.nextTick(function () {
                                Database.releaseConnection(connection);
                            });
                        })
                        .catch(function (err) {
                            reject(err);

                            process.nextTick(function () {
                                Database.releaseConnection(connection);
                            });
                        });
                })
                .catch(function (err) {
                    reject(err);
                });
        });
    }
}
