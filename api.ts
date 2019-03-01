import * as ref from 'ref';
import * as ffi from 'ffi';

export class APIResult {
    errorMsg: string;
    result: number;
}

export class API {
    static _inited: boolean = false;
    static _isBusy: boolean = false;
    static _def: any;

    public static initialize(host: string, user: number) {
        if (!API._inited) {
            API._def = ffi.Library('./ddcom64.dll', {
                'ddinit': ['int', ['string', 'short']],
                'ddsend': ['int', ['string', ref.refType('short')]],
                'ddreceive': ['int', [ref.refType(ref.types.CString), ref.refType('short')]]
            });

            let ret = API._def.ddinit(host, user);

            if (ret !== 0)
                throw new Error(`API init failed: ${ret}`);

            API._inited = true;
        }
    }

    public static queueToExecute(dialog: string) {
        if (API._isBusy) {
            setTimeout(() => API.queueToExecute(dialog), 100);
        } else {
            API._isBusy = true;
            API.execute(dialog).then(ret => {
                API._isBusy = false;
            }, (reason) => {
                API._isBusy = false;
                console.log(`BAPI Executed failed: ${reason}`);
            });
        }
    }

    public static execute(dialog: string): Promise<string> {
        return new Promise(function (resolve, reject) {
            if (!API._inited) {
                reject(`API not init yet`);
                return;
            }

            let sent = API._def.ddsend(dialog, ref.alloc('short'));

            if (sent !== 0) {
                reject(`Message sent failed: ${sent}`);
                return;
            }

            console.log(`Dialog: ${dialog}`)
            API.receive(resolve, reject);
        });
    }

    private static receive(resolve, reject) {
        let buf: any = new Buffer(1024);
        buf.type = ref.types.CString;

        console.log(`receive called!`);
        let receive = API._def.ddreceive(buf, ref.alloc('short'));

        if (receive === 13) {
            setTimeout(() => {
                console.log(`receive 13!`);
                API.receive(resolve, reject);
            }, 100);
            return null;
        }
        if (receive !== 0) {
            reject(`Message received failed: ${receive}`);
            return;
        }

        resolve(API.parseResult(buf.toString().replace(/\0/g, '')));
    }

    private static parseResult(result: string) {
        let array = result.split('|');

        console.log(`BAPI result: ${result}`);

        let isSuccess = (array[0] === 'RET=0');
        let error = array[1].replace('KT=', '');
        let description = array[2].replace('LT=', '').trimRight();

        return {
            isSuccess: isSuccess,
            error: error,
            description: description,
            content: result
        };
    }
}