import { ObjectStatus, BaseSchema } from '../collections';

// COMPANY
// base object holding every other data
// stores company-specific settings
export interface Company {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    code: string,
    name: string,
    addressLines?: string,
    addressCity?: string,
    countryCode?: string,
    defaultCurrency?: string,
    baseWorktimePerDay?: number,        // in hours, eg: 7.5
    baseLeavePerWorkday?: number,           // 0.1 means I get 1 day of leave for 10 work days

    // settings
    setting_requirePastEntriesConfirmation?: boolean
}
export const CompanySchema = new SimpleSchema(Object.assign({
    code: {
        type: String,
        denyUpdate: true,
    },
    name: {
        type: String,
    },
    addressLines: {
        type: String,
        optional: true,
    },
    addressCity: {
        type: String,
        optional: true,
    },
    countryCode: {
        type: String,
        regEx: /^[A-Z]{2}$/,
        optional: true,
    },
    defaultCurrency: {
        type: String,
        regEx: /^[A-Z]{3}$/,
        optional: true,
    },
    baseWorktimePerDay: {
        type: Number,
        min: 0,
        max: 24,
        decimal: true,
        optional: true,
    },
    baseLeavePerWorkday: {
        type: Number,
        min: 0,
        max: 1,
        decimal: true,
        optional: true,
    },
}, BaseSchema));
export const Companies = new Mongo.Collection<Company>('Companies');
Companies.attachSchema(CompanySchema);