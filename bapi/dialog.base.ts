import { DialogTypeEnum, DIALOG_USER } from "./constants";
import { leftPad } from "../utils/utility";

export abstract class DialogBase {
  //#region Private members

  private _dialogDate: Date;
  private _date: Date;

  //#endregion

  //#region Constructor

  constructor(protected _type: DialogTypeEnum) {
    this._dialogDate = this._date = new Date();
  }

  //#endregion

  //#region Private properties

  private get seconds(): number {
    return this._date.getHours() * 3600 + this._date.getMinutes() * 60 + this._date.getSeconds();
  }

  private get dialogSeconds(): number {
    return this._dialogDate.getHours() * 3600 + this._dialogDate.getMinutes() * 60 + this._dialogDate.getSeconds();
  }

  //#endregion

  //#region Private methods
  private getResult(res: any) {
    return {
      isSuccess: res.isSuccess,
      error: res.error,
      description: res.description,
      content: res.content
    };
  }


  //#endregion

  //#region Public methods
  public dialogString(): string {
    return `DLG=${this._type}|` +
      `DAT=${leftPad(this._dialogDate.getMonth() + 1, 2)}/${leftPad(this._date.getDate(), 2)}/${this._date.getFullYear()}|` +
      `ZEI=${this.seconds}|` +
      `USR=${DIALOG_USER}|` +
      // tslint:disable-next-line:max-line-length
      `DLGDAT=${leftPad(this._dialogDate.getMonth() + 1, 2)}/${leftPad(this._dialogDate.getDate(), 2)}/${this._dialogDate.getFullYear()}|` +
      `DLGZEI=${this.dialogSeconds}|`;
  }

  //#endregion
}
