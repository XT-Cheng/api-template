import { dateFormatOracle, replaceAll, dateFormat } from "../utils/utility";
import { Database } from "../oracle";
import { API } from "../api";
import { ChangeMachineStatus } from "../bapi/mde/machine.changeStatus";
import { format } from "date-fns";

export class CheckListResultMonitor {
    // #region Const
    static USER_BADGE = 20120821;

    static SHIFT_CHECK_MACHINE = 'KM-00001';
    static SHIFT_CHANGE_STATUS = 160;
    static ARTICLE_CHANGE_STATUS = 161;
    static PRODUCTION_STATUS = 200;

    static SHIFT_CHANGE_PROCESS_TYPE = 'CHANGESHIFT';
    static ARTICLE_CHANGE_PROCESS_TYPE = 'CHANGEOVER';

    static MachinesTBR = `MachinesTBR`;
    static ProcessTypeTBR = `ProcessTypeTBR`;
    static StatusTBR = `StatusTBR`;
    static HeaderIdTBR = `HeaderIdTBR`;
    static ShiftStartTBR = `ShiftStartTBR`;

    static currentShift: { shiftStart: Date, shiftNbr: number } = null;
    //#endregion

    //#region SQL
    static getShiftSql = `SELECT SCHICHTNR, (DATUM + SCHICHTANF / 60 / 60 / 24) AS SHIFTSTART 
    FROM MASCHINEN_STATUS WHERE MASCH_NR = '${CheckListResultMonitor.SHIFT_CHECK_MACHINE}'`;

    static getMachineWithSpecificStatus = `SELECT MASCH_NR AS MACHINE, M_STATUS AS STATUS FROM MASCHINEN_STATUS WHERE M_STATUS IN (${CheckListResultMonitor.StatusTBR})`;

    static getMachinesSql = `SELECT MACHINE.MASCH_NR AS MACHINE
     FROM STOER_TABELLE STATUSASSIGN,MASCHINEN MACHINE
     WHERE STATUSASSIGN.MASCH_NR = MACHINE.MASCH_NR AND STATUSASSIGN.STOERNR = ${CheckListResultMonitor.SHIFT_CHANGE_STATUS}`;

    static getMachineWithOperationSql =
        `SELECT DISTINCT(SUBKEY1) AS MACHINE FROM HYBUCH, MASCHINEN_STATUS
     WHERE HYBUCH.KEY_TYPE = 'A'
     AND HYBUCH.SUBKEY1 IN (${CheckListResultMonitor.MachinesTBR}) AND  MASCHINEN_STATUS.MASCH_NR = HYBUCH.SUBKEY1 
     AND MASCHINEN_STATUS.M_STATUS <> ${CheckListResultMonitor.SHIFT_CHANGE_STATUS}`;

    static getCheckListItemsSql =
        `SELECT CHECKLIST_TYPE.PMDM_HEADER_ID,CHECKLIST_TYPE.MACHINE_NUMBER,CHECKLIST_TYPE.CHECKLIST_TYPE
     FROM (SELECT DISTINCT H.PMDM_HEADER_ID,
            HD1.PMDM_HEADER_DATA AS MACHINE_NUMBER,
            HD2.PMDM_HEADER_DATA AS CHECKLIST_TYPE,
            HD3.PMDM_HEADER_DATA AS PROCESS_TYPE
          FROM U_TE_PMDM_HEADER H,
            U_TE_PMDM_HEADER_DATA HD1,
            U_TE_PMDM_PROCESSES PCS1,
            U_TE_PMDM_PROCESS P,
            U_TE_PMDM_HEADER_DATA HD2,
            U_TE_PMDM_PROCESSES PCS2,
            U_TE_PMDM_HEADER_DATA HD3,
            U_TE_PMDM_PROCESSES PCS3
          WHERE H.PMDM_HEADER_ID           = HD1.PMDM_HEADER_ID
          AND HD1.PMDM_PROCESSES_ID        = PCS1.PMDM_PROCESSES_ID
          AND PCS1.PMDM_PROCESS_ID         = P.PMDM_PROCESS_ID
          AND H.PMDM_HEADER_ID             = HD2.PMDM_HEADER_ID
          AND HD2.PMDM_PROCESSES_ID        = PCS2.PMDM_PROCESSES_ID
          AND P.PMDM_PROCESS_ID            = PCS2.PMDM_PROCESS_ID
          AND H.PMDM_HEADER_ID             = HD3.PMDM_HEADER_ID
          AND HD3.PMDM_PROCESSES_ID        = PCS3.PMDM_PROCESSES_ID
          AND P.PMDM_PROCESS_ID            = PCS3.PMDM_PROCESS_ID
          AND (PCS1.PMDM_FIELD_NAME        = 'MachineNumber')
          AND (PCS2.PMDM_FIELD_NAME        = 'CheckListType')
          AND (PCS3.PMDM_FIELD_NAME        = 'ProcessType')
          AND (P.PMDM_BUSINESS_PROCESS     = 'CheckLists')
          AND H.PMDM_STATUS_VALUE          = '09'
          AND UPPER(HD1.PMDM_HEADER_DATA)  = '${CheckListResultMonitor.MachinesTBR}'
          AND UPPER(HD3.PMDM_HEADER_DATA) = '${CheckListResultMonitor.ProcessTypeTBR}') CHECKLIST_TYPE,
          (SELECT U_TE_PMDM_DATA.PMDM_HEADER_ID,
            U_TE_PMDM_DATA.PMDM_DATA
          FROM U_TE_PMDM_PROCESS,
            U_TE_PMDM_PROCESSES,
            U_TE_PMDM_DATA
          WHERE U_TE_PMDM_PROCESS.PMDM_PROCESS_ID       = U_TE_PMDM_PROCESSES.PMDM_PROCESS_ID
          AND U_TE_PMDM_DATA.PMDM_PROCESSES_ID          = U_TE_PMDM_PROCESSES.PMDM_PROCESSES_ID
          AND (U_TE_PMDM_PROCESS.PMDM_BUSINESS_PROCESS  = 'CheckLists')
          AND (U_TE_PMDM_PROCESSES.PMDM_FIELD_NAME      = 'CheckList')) PMDM_DATA
          WHERE PMDM_DATA.PMDM_HEADER_ID = CHECKLIST_TYPE.PMDM_HEADER_ID`;

    static getCheckListDoneOfChangeOver =
        `SELECT TERMINAL_NR,PMDM_HEADER_ID,CHECKLIST_TYPE,CHECKLIST_TIMESTAMP,CHECKLIST_SEQUENCE,MACHINE_NUMBER,PART_NUMBER,
     PART_DESCRIPTION, RESOURCE_NUMBER,OPERATION_NUMBER,OPERATION_DESCRIPTION,CHECKLIST_QUESTION,CHECKLIST_ANSWER, CHECKLIST_CRITICAL_ANSWERS,
     TOLERANCES_REQUIRED, TOLERANCES_COMPARER, TOLERANCES_INPUT, STEP_START_TIMESTAMP, STEP_START_USER,STEP_END_TIMESTAMP,
     STEP_END_USER,STEP_COMMENT,ORIGINAL_CHECKLIST_ITEM_STRING,ORIGINAL_HEADER_STRING,CHECKLIST_IS_CRITICAL_ANSWER,
     SSRW_EVENT_ID, PERSONALSTAMM.NAME
     FROM U_TE_PMDM_CHECKLIST_RESULTS, PERSONALSTAMM  WHERE MACHINE_NUMBER = '${CheckListResultMonitor.MachinesTBR}'
     AND PMDM_HEADER_ID =  '${CheckListResultMonitor.HeaderIdTBR}'
     AND OPERATION_NUMBER = (SELECT SUBKEY2 FROM HYBUCH WHERE SUBKEY1 = '${CheckListResultMonitor.MachinesTBR}' AND KEY_TYPE = 'A' AND ROWNUM < 2)
     AND PERSONALSTAMM.PERSONALNUMMER(+) = U_TE_PMDM_CHECKLIST_RESULTS.STEP_END_USER
     ORDER BY STEP_END_TIMESTAMP DESC, CHECKLIST_SEQUENCE`;

    static getCheckListDoneOfShiftChange = `SELECT TERMINAL_NR,PMDM_HEADER_ID,CHECKLIST_TYPE,CHECKLIST_TIMESTAMP,CHECKLIST_SEQUENCE,MACHINE_NUMBER,PART_NUMBER,
     PART_DESCRIPTION, RESOURCE_NUMBER,OPERATION_NUMBER,OPERATION_DESCRIPTION,CHECKLIST_QUESTION,CHECKLIST_ANSWER,
     TOLERANCES_REQUIRED, TOLERANCES_COMPARER, TOLERANCES_INPUT, STEP_START_TIMESTAMP, STEP_START_USER,STEP_END_TIMESTAMP,
     STEP_END_USER,STEP_COMMENT,ORIGINAL_CHECKLIST_ITEM_STRING,ORIGINAL_HEADER_STRING,CHECKLIST_IS_CRITICAL_ANSWER,
     CHECKLIST_CRITICAL_ANSWERS, SSRW_EVENT_ID, PERSONALSTAMM.NAME
     FROM U_TE_PMDM_CHECKLIST_RESULTS, PERSONALSTAMM WHERE MACHINE_NUMBER = '${CheckListResultMonitor.MachinesTBR}'
     AND PMDM_HEADER_ID =  '${CheckListResultMonitor.HeaderIdTBR}'
     AND STEP_END_TIMESTAMP IS NOT NULL
     AND STEP_END_TIMESTAMP > TO_DATE('${CheckListResultMonitor.ShiftStartTBR}', '${dateFormatOracle}')
     AND PERSONALSTAMM.PERSONALNUMMER(+) = U_TE_PMDM_CHECKLIST_RESULTS.STEP_END_USER
     ORDER BY STEP_END_TIMESTAMP DESC, CHECKLIST_SEQUENCE`;

    //#endregion

    //#region Public methods

    public static async getCurrentShift() {
        return ((await Database.fetch(CheckListResultMonitor.getShiftSql)).rows as any[]).map((row: any) => {
            return {
                shiftNbr: row.SCHICHTNR,
                shiftStart: new Date(row.SHIFTSTART)
            };
        })[0];
    }

    public static async execute() {
        console.log(`CheckListResultMonitor execute start`);
        await CheckListResultMonitor.ShiftChangeCheck();
        await CheckListResultMonitor.CheckListResultCheck();
        setTimeout(CheckListResultMonitor.execute, 1000);
        console.log(`CheckListResultMonitor execute end`);
    }

    //#region Private methods

    private static async ifShiftChangeCheckListFinished(machine: {
        Machine: string,
        Status: string,
        CheckListResultsOfCurrentShift: Map<number, any>
    }) {
        let shouldChangeStatus = false;
        // If machine has Article Change Items?
        let checkListItems = ((await Database.fetch(replaceAll(CheckListResultMonitor.getCheckListItemsSql
            , [CheckListResultMonitor.MachinesTBR, CheckListResultMonitor.ProcessTypeTBR]
            , [machine.Machine, CheckListResultMonitor.SHIFT_CHANGE_PROCESS_TYPE]))).rows as any[]).map((row: any) => {
                return { HeaderId: row.PMDM_HEADER_ID, CheckListType: row.CHECKLIST_TYPE };
            });
        if (checkListItems.length == 0) {
            shouldChangeStatus = true;
        } else {
            // One machine should have only 1 Check List Item for Article Change
            // If all CheckList Item has been finished with current Shift
            ((await Database.fetch(replaceAll(CheckListResultMonitor.getCheckListDoneOfShiftChange
                , [CheckListResultMonitor.MachinesTBR, CheckListResultMonitor.HeaderIdTBR, CheckListResultMonitor.ShiftStartTBR]
                , [machine.Machine, checkListItems[0].HeaderId,
                format(CheckListResultMonitor.currentShift.shiftStart, dateFormat)]))).rows as any[]).map((row: any) => {
                    const result = {
                        HeaderId: row.PMDM_HEADER_ID,
                        Sequence: row.CHECKLIST_SEQUENCE,
                        Answer: row.CHECKLIST_ANSWER,
                        CriticalAnswer: row.CHECKLIST_CRITICAL_ANSWERS,
                        FinishedAt: row.STEP_END_TIMESTAMP ? new Date(row.STEP_END_TIMESTAMP) : null,
                        FinishedBy: row.NAME,
                        CheckListType: row.CHECKLIST_TYPE,
                        Comment: row.STEP_COMMENT,
                        OperationName: row.OPERATION_NUMBER
                    };

                    if (machine.CheckListResultsOfCurrentShift.has(result.Sequence)) {
                        const exist = machine.CheckListResultsOfCurrentShift.get(result.Sequence);
                        if (exist.finishedAt < result.FinishedAt) {
                            machine.CheckListResultsOfCurrentShift.set(result.Sequence, result);
                        }
                    } else {
                        machine.CheckListResultsOfCurrentShift.set(result.Sequence, result);
                    }
                });

            if (machine.CheckListResultsOfCurrentShift.size > 0 && Array.from(machine.CheckListResultsOfCurrentShift.values()).every(result => {
                return !!result.FinishedAt && result.Answer === result.CriticalAnswer;
            })) {
                shouldChangeStatus = true;
            }
        }
        return shouldChangeStatus;
    }

    private static async ifChangeOverCheckListFinished(machine: {
        Machine: string,
        Status: string,
        CheckListResultsOfChangeOver: Map<number, any>,
    }) {
        let shouldChangeStatus = false;
        // If machine has Article Change Items?
        let checkListItems = ((await Database.fetch(replaceAll(CheckListResultMonitor.getCheckListItemsSql
            , [CheckListResultMonitor.MachinesTBR, CheckListResultMonitor.ProcessTypeTBR]
            , [machine.Machine, CheckListResultMonitor.ARTICLE_CHANGE_PROCESS_TYPE]))).rows as any[]).map((row: any) => {
                return { HeaderId: row.PMDM_HEADER_ID, CheckListType: row.CHECKLIST_TYPE };
            });
        if (checkListItems.length == 0) {
            shouldChangeStatus = true;
        } else {
            // One machine should have only 1 Check List Item for Article Change
            // If all CheckList Item has been finished with current Operation
            ((await Database.fetch(replaceAll(CheckListResultMonitor.getCheckListDoneOfChangeOver
                , [CheckListResultMonitor.MachinesTBR, CheckListResultMonitor.HeaderIdTBR]
                , [machine.Machine, checkListItems[0].HeaderId]))).rows as any[]).map((row: any) => {
                    const result = {
                        HeaderId: row.PMDM_HEADER_ID,
                        Sequence: row.CHECKLIST_SEQUENCE,
                        Answer: row.CHECKLIST_ANSWER,
                        CriticalAnswer: row.CHECKLIST_CRITICAL_ANSWERS,
                        FinishedAt: row.STEP_END_TIMESTAMP ? new Date(row.STEP_END_TIMESTAMP) : null,
                        FinishedBy: row.NAME,
                        CheckListType: row.CHECKLIST_TYPE,
                        Comment: row.STEP_COMMENT,
                        OperationName: row.OPERATION_NUMBER
                    };

                    if (machine.CheckListResultsOfChangeOver.has(result.Sequence)) {
                        const exist = machine.CheckListResultsOfChangeOver.get(result.Sequence);
                        if (exist.finishedAt < result.FinishedAt) {
                            machine.CheckListResultsOfChangeOver.set(result.Sequence, result);
                        }
                    } else {
                        machine.CheckListResultsOfChangeOver.set(result.Sequence, result);
                    }
                });
            if (machine.CheckListResultsOfChangeOver.size > 0 && Array.from(machine.CheckListResultsOfChangeOver.values()).every(result => {
                return !!result.FinishedAt && result.Answer === result.CriticalAnswer;
            })) {
                shouldChangeStatus = true;
            }
        }
        return shouldChangeStatus;
    }


    private static async ShiftChangeCheck() {
        let currentShift = await CheckListResultMonitor.getCurrentShift();

        if (CheckListResultMonitor.currentShift.shiftNbr !== currentShift.shiftNbr || CheckListResultMonitor.currentShift.shiftStart !== currentShift.shiftStart) {
            CheckListResultMonitor.currentShift = currentShift;
            // Select all Machine has 160 assigned
            let machines = ((await Database.fetch(CheckListResultMonitor.getMachinesSql)).rows as any[]).map((row: any) => {
                return <any>row.MACHINE;
            });

            machines = machines.map((machine) => (`'` + machine + `'`));
            // Select Machine which has Operation logged on
            machines = ((await Database.fetch(replaceAll(CheckListResultMonitor.getMachineWithOperationSql
                , [CheckListResultMonitor.MachinesTBR]
                , [machines.join(',')]))).rows as any[]).map((row: any) => {
                    return row.MACHINE;
                });
            machines.forEach(machine => {
                // Change it's status to 160 if it's status is not 160
                API.queueToExecute(new ChangeMachineStatus(machine, CheckListResultMonitor.SHIFT_CHANGE_STATUS, CheckListResultMonitor.USER_BADGE).dialogString())
            });
        }
    }

    private static async CheckListResultCheck() {
        let currentShift = await CheckListResultMonitor.getCurrentShift();

        if (CheckListResultMonitor.currentShift.shiftNbr !== currentShift.shiftNbr || CheckListResultMonitor.currentShift.shiftStart !== currentShift.shiftStart) {
            CheckListResultMonitor.currentShift = currentShift;
        }

        // Select all Machine which has status 160 or 161
        let machines = ((await Database.fetch(replaceAll(CheckListResultMonitor.getMachineWithSpecificStatus
            , [CheckListResultMonitor.StatusTBR]
            , [[CheckListResultMonitor.SHIFT_CHANGE_STATUS, CheckListResultMonitor.ARTICLE_CHANGE_STATUS].join(',')]))).rows as any[]).map((row: any) => {
                return {
                    Machine: row.MACHINE,
                    Status: row.STATUS,
                    CheckListResultsOfChangeOver: new Map<number, any>(),
                    CheckListResultsOfCurrentShift: new Map<number, any>()
                };
            });

        machines.forEach(async machine => {
            let shouldChangeStatus = false;
            if (machine.Status === 161) {
                // If machine is 161 (Article Change)
                shouldChangeStatus = await CheckListResultMonitor.ifChangeOverCheckListFinished(machine);
            } else {
                // If machine is 160 (Shift Change)
                shouldChangeStatus = (await CheckListResultMonitor.ifShiftChangeCheckListFinished(machine)) && (await CheckListResultMonitor.ifChangeOverCheckListFinished(machine));
            }
            if (shouldChangeStatus) {
                API.queueToExecute(new ChangeMachineStatus(machine.Machine, CheckListResultMonitor.PRODUCTION_STATUS, CheckListResultMonitor.USER_BADGE).dialogString())
            }
        });
    }

    //#endregion
}
