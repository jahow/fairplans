import { ObjectStatus, BaseSchema } from '../collections';

// EMPLOYEE GROUPS
// a group can hold several employees and an employee can belong to several groups
export interface EmployeeGroup {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    companyCode: string,
    name: string,
    assignedMembers: string[],    // array of employee ids
    assignedManagers: string[],   // array of employee ids

    // settings
    setting_defaultBillingType?: number,
    setting_requirePastEntriesConfirmation?: boolean,
    setting_requireDoubleValidation?: boolean
}
export const EmployeeGroupSchema = new SimpleSchema(Object.assign({
    companyCode: {
        type: String,
    },
    name: {
        type: String,
    },
    assignedMembers: {
        type: [String],
        defaultValue: [],
    },
    assignedManagers: {
        type: [String],
        defaultValue: [],
    },
    setting_defaultBillingType: {
        type: Boolean,
        optional: true,
    },
    setting_requirePastEntriesConfirmation: {
        type: Boolean,
        optional: true,
    },
    setting_requireDoubleValidation: {
        type: Boolean,
        optional: true,
    },
}, BaseSchema));
export const EmployeeGroups = new Mongo.Collection<EmployeeGroup>('EmployeeGroups');
EmployeeGroups.attachSchema(EmployeeGroupSchema);