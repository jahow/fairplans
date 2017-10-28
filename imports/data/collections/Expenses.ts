import { ObjectStatus, BaseSchema, UserEntryStatus, Projects, ProjectStatus } from '../collections';
import { SynchronizationStatus } from '../collections';
import { ExpenseRefundTypeList } from '../choicelists';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

// EXPENSES
// are attached to a project, can be of type mileage, meal, hotel etc.

export interface Expense {
    _id?: string,
    status?: UserEntryStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,
    syncStatus?: SynchronizationStatus,
    syncComments?: string,

    userId?: string,
    projectId?: string,
    year: number,
    month: number,
    day: number,
    note?: string,
    internalNote?: string,
    date?: Date,

    typeId?: string,            // id of ExpenseType
    refundType?: number,       // ExpenseRefundTypeList
    refundAmount?: number,
    refundAmountCurrency?: string,
    billingType?: number,      // ExpenseRefundTypeList
    billingAmount?: number,
    billingAmountCurrency?: string,

    // specific params
    mileageKm?: number,        // in km
    invoiceNumber?: string,

    // denormalized data
    projectName?: string,
    partnerName?: string,
    partnerCode?: string,
    companyName?: string,
    companyCode?: string,
}
export const ExpenseSchema = new SimpleSchema(Object.assign({
    status: {
        type: Number,
        allowedValues: [
            UserEntryStatus.DRAFT,
            UserEntryStatus.SUBMITTED,
            UserEntryStatus.APPROVED,
            UserEntryStatus.CONFLICTING,
        ],
        defaultValue: UserEntryStatus.DRAFT,
    },
    userId: {
        type: String,
        denyUpdate: true,
    },
    projectId: {
        type: String,
    },
    year: {
        type: Number,
        min: 1900,
        max: 2100,
    },
    month: {
        type: Number,
        min: 0,
        max: 11,
    },
    day: {
        type: Number,
        min: 1,
        max: 31,
    },
    note: {
        type: String,
        optional: true,
    },
    internalNote: {
        type: String,
        optional: true,
    },
    typeId: {
        type: String,
        optional: true,
    },
    refundType: {
        type: Number,
        optional: true,
        allowedValues: ExpenseRefundTypeList.map(t => t.value),
    },
    refundAmount: {
        type: Number,
        decimal: true,
        optional: true,
    },
    refundAmountCurrency: {
        type: String,
        regEx: /^[A-Z]{3}$/,
        optional: true,
    },
    billingType: {
        type: Number,
        optional: true,
        allowedValues: ExpenseRefundTypeList.map(t => t.value),
    },
    billingAmount: {
        type: Number,
        decimal: true,
        optional: true,
    },
    billingAmountCurrency: {
        type: String,
        regEx: /^[A-Z]{3}$/,
        optional: true,
    },
    mileageKm: {
        type: Number,
        min: 0,
        optional: true,
    },
    invoiceNumber: {
        type: String,
        optional: true,
    },
    date: {
        type: Date,
        autoValue() {
            (this as any).unset();
            let year = (this as any).field('year');
            let month = (this as any).field('month');
            let day = (this as any).field('day');
            if (!year.isSet || !month.isSet || !day.isSet) {
                return undefined;
            }
            return new Date(Date.UTC(year.value, month.value, day.value));
        },
    },

    // VAT list
    vatAmounts: {
        type: [Object],
        optional: true,
        defaultValue: [],
    },
    'vatAmounts.$.amount': {
        type: Number,
        optional: true,
        decimal: true,
    },
    'vatAmounts.$.description': {
        type: String,
        optional: true,
    },

    // denormalized
    projectName: {
        type: String,
        optional: true,
    },
    partnerName: {
        type: String,
        optional: true,
    },
    partnerCode: {
        type: String,
        optional: true,
    },
    companyName: {
        type: String,
        optional: true,
    },
    companyCode: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const Expenses = new Mongo.Collection<Expense>('Expenses');
Expenses.attachSchema(ExpenseSchema);



// checks the fields validity
function checkFieldsValidity(userId, doc: Expense, previousDoc?: Expense) {
    // make sure a note was written
    if (!doc.note && (doc.status == UserEntryStatus.SUBMITTED || doc.status == UserEntryStatus.APPROVED)) {
        throw new Meteor.Error('empty-note',
            i18n.__('A note must be written before submitting the timesheet.'));
    }

    // vérification que le projet n'est pas clos
    let project = Projects.findOne(doc.projectId);
    if (project && (project.projectStatus == ProjectStatus.CANCELED || project.projectStatus == ProjectStatus.CLOSED)) {
        throw new Meteor.Error('project-closed', i18n.__('The project is closed or canceled and cannot accept new entries.'));
    } else if (!project) {
        throw new Meteor.Error('project-not-found', i18n.__('The project is invalid.'));
    }
}



// POST EVENT HOOKS
// data denormalization

// Timecards.after.insert((userId, doc: Timecard) => {
//     denormalizeData(userId, doc, this.previous);
// });
// Timecards.after.update((userId, doc: Timecard, fieldNames, modifier:any, options) => {
//     denormalizeData(userId, doc, this.previous);
// });
// Timecards.after.remove((userId, doc: Timecard) => {
//     denormalizeData(userId, doc, this.previous);
// });


// PRE EVENT HOOKS
// data validity checks

Expenses.before.insert((userId, doc: Expense) => {
    checkFieldsValidity(userId, doc);
});
Expenses.before.update((userId, doc: Expense, fieldNames, modifier:any, options) => {

    // génération de l'objet modifié
    let modifiedDoc = {} as Expense;
    Object.assign(modifiedDoc, doc, modifier.$set);

    checkFieldsValidity(userId, modifiedDoc, doc);
});