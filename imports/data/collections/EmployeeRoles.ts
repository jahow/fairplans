import { ObjectStatus, BaseSchema } from '../collections';

// EMPLOYEE ROLES
// a role has a set of permission regarding data collections
// each employee is assigned one role
export interface EmployeeRole {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    name: string,
    isAdmin?: boolean,        // if true: can do everything
    canInsert?: string[],        // these are arrays of collection names
    canUpdate?: string[],
    canRemove?: string[],
    canInsertOutsideCompany?: string[],
    canUpdateOutsideCompany?: string[],
    canRemoveOutsideCompany?: string[],
    //canArchive: string[],    // not implemented
    canSeeAllEmployees?: boolean,    // true for HR managers
    canSeeAllCompanies?: boolean,    // if true, can access data from other companies
}
export const EmployeeRoleSchema = new SimpleSchema(Object.assign({
    name: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        defaultValue: false,
    },
    canInsert: {
        type: [String],
        defaultValue: [],
    },
    canUpdate: {
        type: [String],
        defaultValue: [],
    },
    canRemove: {
        type: [String],
        defaultValue: [],
    },
    canInsertOutsideCompany: {
        type: [String],
        defaultValue: [],
    },
    canUpdateOutsideCompany: {
        type: [String],
        defaultValue: [],
    },
    canRemoveOutsideCompany: {
        type: [String],
        defaultValue: [],
    },
    canSeeAllEmployees: {
        type: Boolean,
        defaultValue: false,
    },
    canSeeAllCompanies: {
        type: Boolean,
        defaultValue: false,
    },
}, BaseSchema));
export const EmployeeRoles = new Mongo.Collection<EmployeeRole>('EmployeeRoles');
EmployeeRoles.attachSchema(EmployeeRoleSchema);