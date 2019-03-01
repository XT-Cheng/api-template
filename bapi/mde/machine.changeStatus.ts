import { DialogBase } from "../dialog.base";
import { DialogTypeEnum } from "../constants";

export class ChangeMachineStatus extends DialogBase {
    constructor(private machineName: string, private newStatus: number, private badge: number) {
        super(DialogTypeEnum.CHANGE_MACHINE_STATUS);
    }

    public dialogString(): string {
        return `${super.dialogString()}MNR=${this.machineName}|MST=${this.newStatus}|KNR=${this.badge}`;
    }
}
