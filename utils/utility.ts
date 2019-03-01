export const dateFormatOracle = 'YYYY-MM-DD HH24:MI:ss';
export const dateFormat = 'YYYY-MM-DD HH:mm:ss';

export const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch(next);
    };

export function replaceAll(str: string, finds: string[], replaces: string[]) {
    let final = str;

    for (let i = 0; i < finds.length; i++) {
        final = final.replace(new RegExp(escapeRegExp(finds[i]), 'g'), replaces[i]);
    }

    return final;
}

export function leftPad(str: any, len: number, ch: any = '0') {
    str = String(str);

    let i = -1;

    if (!ch && ch !== 0) {
        ch = ' ';
    }

    len = len - str.length;

    while (++i < len) {
        str = ch + str;
    }

    return str;
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}