import * as ref from 'ref';
import * as ffi from 'ffi';
import { resolveSoa } from 'dns';

export class APIResult {
    errorMsg: string;
    result: number;
}

export class API {
    static _inited: boolean;
    static _def: any;

    public static initialize(host: string, user: number) {
        if (!this._inited) {
            this._def = ffi.Library('./ddcom64.dll',{ 
                'ddinit':['int',['string','short']],
                'ddsend':['int',['string',ref.refType('short')]],
                'ddreceive': ['int',[ref.refType(ref.types.CString),ref.refType('short')]]
            });

            let ret = this._def.ddinit(host, user);

            if (ret !== 0)
                throw new Error(`API init failed: ${ret}`);

            this._inited = true;
        }
    }

    public static execute(dialog: string): Promise<string> {
        if (!this._inited)
            throw new Error(`API not init yet`);

        let sent = this._def.ddsend(dialog, ref.alloc('short'));

        if (sent !== 0)
            throw new Error(`Message sent failed: ${sent}`);

        console.log(`Dialog: ${dialog}`);
        return new Promise(function (resolve, reject) {
             API.receive(resolve, reject);
        });
    }

    private static receive(resolve, reject) {
        let buf: any = new Buffer(1024);
        buf.type = ref.types.CString;

        console.log(`receive called!`);
        let receive = this._def.ddreceive(buf,ref.alloc('short'));

        if (receive === 13) {
            setTimeout(() => {
                console.log(`receive 13!`);
                API.receive(resolve, reject);
            }, 1000);
            return null;
        }
        if (receive !== 0)
            throw new Error(`Message received failed: ${receive}`);
            
        resolve(API.parseResult(buf.toString().replace(/\0/g, '')));
    }

    private static parseResult(result: string) {
        let array = result.split('|');

        console.log(`BAPI result: ${result}`);

        let isSuccess = (array[0] === 'RET=0');
        let error = array[1].replace('KT=','');
        let description = array[2].replace('LT=','').trimRight();

        return {
            isSuccess: isSuccess,
            error: error,
            description: description,
            content: result
        };
    }
}