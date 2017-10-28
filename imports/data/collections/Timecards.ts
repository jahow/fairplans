import { ObjectStatus, BaseSchema, UserEntryStatus, Tasks, Task, Projects, ProjectStatus } from '../collections';
import { SynchronizationStatus } from '../collections';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';
import { SalesOrderLine, SalesOrderLines, Employees, Employee } from '../collections';
import { IntercompanyAgreements, IntercompanyAgreement } from '../collections';


const TIMECARD_TIMESTEP = 0.25;    // 15 minutes


// TIMECARDS
// these represent an employee occupation, created on the calendar view
export interface Timecard {
    _id?: string,
    status?: UserEntryStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,
    syncStatus?: SynchronizationStatus,
    syncComments?: string,

    userId?: string,
    taskId?: string,
    year: number,
    month: number,
    day: number,
    start: number,
    end: number,
    note?: string,              // "public"
    internalNote?: string,      // "private"
    taskEstimatedProgress?: number,     // 0 to 1
    date?: Date,

    repeating?: boolean,
    repeatOn?: number[],
    repeatStart?: Date,
    repeatEnd?: Date,
    repeatIntervalMode?: boolean,
    repeatWeekInterval?: number,
    repeatOnWeeks?: number[],

    // denormalized data
    projectId?: string,
    agreementId?: string,    // is set if the timecard has been covered by an intercompany agreement
}
export const TimecardSchema = new SimpleSchema(Object.assign({
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
    taskId: {
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
    start: {
        type: Number,
        decimal: true,
        min: 0,
        max: 24,
    },
    end: {
        type: Number,
        decimal: true,
        min: 0,
        max: 24,
    },
    note: {
        type: String,
        optional: true,
        defaultValue: ''
    },
    internalNote: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    taskEstimatedProgress: {
        type: Number,
        decimal: true,
        min: 0,
        max: 1,
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

    // recurring timecards
    repeating: {
        type: Boolean,
        defaultValue: false,
    },
    repeatOn: {
        type: Array,
        autoValue() {
            if (this.isSet) { return undefined; }
            let date = this.field("date");
            if (this.isInsert && date.isSet) {
                return [moment(date.value).day()];
            }
        },
    },
    'repeatOn.$': {
        type: Number,
        allowedValues: [0, 1, 2, 3, 4, 5, 6],
    },
    repeatStart: {
        type: Date,
        autoValue() {
            if (this.isSet) { return undefined; }
            let date = this.field("date");
            if (this.isInsert && date.isSet) {
                return moment(date.value).startOf('month').toDate();
            }
        },
    },
    repeatEnd: {
        type: Date,
        autoValue() {
            if (this.isSet) { return undefined; }
            let date = this.field("date");
            if (this.isInsert && date.isSet) {
                return moment(date.value).endOf('month').toDate();
            }
        },
    },
    repeatIntervalMode: {
        type: Boolean,
        defaultValue: true,
    },
    repeatWeekInterval: {
        type: Number,
        min: 1,
        defaultValue: 1,
    },
    repeatOnWeeks: {
        type: Array,
        defaultValue: [0, 1, 2, 3, -1],
    },
    'repeatOnWeeks.$': {
        type: Number,
        allowedValues: [0, 1, 2, 3, -1],
    },

    // denormalized
    projectId: {
        type: String,
        optional: true,
    },
    agreementId: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const Timecards = new Mongo.Collection<Timecard>('Timecards');
Timecards.attachSchema(TimecardSchema);



// data denormalization
function denormalizeData(userId, doc: Timecard, previousDoc?: Timecard) {
    // denormalize project id
    let task = Tasks.findOne(doc.taskId);
    if (task) {
        Timecards.direct.update(doc._id, { $set: { projectId: task.projectId } });
        doc.projectId = task.projectId;
    }

    // update delivered time on the task
    if (doc.taskId) {
        Meteor.call('task.updateTime', doc.taskId);
    }

    // if there was a different task assigned: update it too
    if (this.previous && this.previous.taskId != doc.taskId) {
        Meteor.call('task.updateTime', this.previous.taskId);
    }

    let employee = Employees.findOne({ userId: doc.userId });
    if (employee) {
        if (previousDoc && previousDoc.projectId != doc.projectId) {
            Meteor.call('intercompany.agreements.refresh', { taskId: previousDoc.taskId, employeeId: employee._id });
        }
        Meteor.call('intercompany.agreements.refresh', { taskId: doc.taskId, employeeId: employee._id });
    }
}

// start/end time rounding before anything else is done
// returns the modified times to apply
function transformTimes(userId, doc: Timecard) : { start: number, end: number } {
    let result = {
        start: doc.start,
        end: doc.end,
    };

    let step = TIMECARD_TIMESTEP;    // Todo: get this from the task??
    let minDuration = step;

    // first round times
    result.start = Math.round(result.start / step) * step;
    result.end = Math.round(result.end / step) * step;

    // then apply min duration
    if (result.end - result.start < minDuration) {
        result.end = result.start + minDuration;
    }

    return result;
}


// checks the fields validity
function checkFieldsValidity(userId, doc: Timecard, previousDoc?: Timecard) {
    // make sure a note was written
    if (!doc.note && (doc.status == UserEntryStatus.SUBMITTED || doc.status == UserEntryStatus.APPROVED)) {
        throw new Meteor.Error('empty-note',
            i18n.__('A note must be written before submitting the timesheet.'));
    }

    // repeat check
    if (doc.repeating) {
        if (!doc.repeatOn || doc.repeatOn.length == 0) { 
            throw new Meteor.Error('invalid-repeat-entry',
                i18n.__('A repeating task must have at least one day in the week set'));
        }
        if (!doc.repeatIntervalMode && (!doc.repeatOnWeeks || doc.repeatOnWeeks.length == 0)) { 
            throw new Meteor.Error('invalid-repeat-entry',
                i18n.__('A repeating task must have at least one week in the month set'));
        }
    }

    // validate times
    if (!Meteor.call('timecard.validateTimes', doc.year, doc.month, doc.day, doc.start, doc.end,
        previousDoc ? previousDoc._id : '', doc.userId)) {
        throw new Meteor.Error('times-invalid', i18n.__('Start or end time is invalid'));
    }

    // Vérification des heures saisies par rapport au budget disponible
    let task = Tasks.findOne(doc.taskId);
    if (task && task.hoursBudgetConstrained) {

        // calcul du delta (durée timesheet si insertion, delta entre avant/après si update)
        let durationDelta = doc.end - doc.start;
        if (previousDoc) {
            durationDelta -= previousDoc.end - previousDoc.start;
        }

        if (durationDelta > task.hoursRemaining && durationDelta > 0)
        {
            throw new Meteor.Error('budget-overrun',
                i18n.__('Budget de la tâche insuffisant pour cette saisie'));
        }
    }

    // vérification que le projet n'est pas clos
    if (task) {
        let project = Projects.findOne(task.projectId);
        if (project && (project.projectStatus == ProjectStatus.CANCELED || project.projectStatus == ProjectStatus.CLOSED)) {
            throw new Meteor.Error('project-closed', i18n.__('The project is closed or canceled and cannot accept new entries.'));
        } else if (!project) {
            throw new Meteor.Error('project-not-found', i18n.__('The project is invalid.'));
        }
    }

    // vérification validité des heures
    if (doc.end < doc.start) {
        throw new Meteor.Error('times-invalid', i18n.__('Timesheets cannot have a negative duration'));
    }
    if (doc.end - doc.start < task.minEntryDuration && task.minEntryDuration < task.hoursRemaining) {
        throw new Meteor.Error('times-invalid', i18n.__('Timesheet duration is lower than task minimum'));
    }

    // si l'employé est une ressource interco: vérifier que le budget est suffisant
    let employee = Employees.findOne({ userId: doc.userId });
    if (task && employee && task.companyCode != employee.companyCode) {

        let query = {
            projectId: task.projectId,
            employeeId: employee._id,
            isApproved: true,
            // hoursRemaining: { $gt: 0 }
        } as any;
        if (doc.agreementId) {
            query._id = doc.agreementId;
        }

        let agreement = IntercompanyAgreements.findOne(query);
        if (!agreement) {
            throw new Meteor.Error('no-valid-agreement', i18n.__('No valid intercompany agreement was found for this task.'));
        }
        let durationDelta = doc.end - doc.start;
        if (previousDoc) {
            durationDelta -= previousDoc.end - previousDoc.start;
        }
        if (agreement.hoursRemaining < durationDelta && durationDelta > 0) {
            throw new Meteor.Error('not-enough-budget', i18n.__('The intercompany agreement does not have enough budget for this.'));
        }
    }
}



// POST EVENT HOOKS
// data denormalization

Timecards.after.insert((userId, doc: Timecard) => {
    denormalizeData(userId, doc, this.previous);
});
Timecards.after.update((userId, doc: Timecard, fieldNames, modifier:any, options) => {
    denormalizeData(userId, doc, this.previous);
});
Timecards.after.remove((userId, doc: Timecard) => {
    denormalizeData(userId, doc, this.previous);
});


// PRE EVENT HOOKS
// data validity checks

Timecards.before.insert((userId, doc: Timecard) => {
    doc = Object.assign(doc, transformTimes(userId, doc));
    checkFieldsValidity(userId, doc);
});
Timecards.before.update((userId, doc: Timecard, fieldNames, modifier:any, options) => {

    // génération de l'objet modifié
    let modifiedDoc = {} as Timecard;
    Object.assign(modifiedDoc, doc, modifier.$set);

    // modification des temps et application à l'objet
    modifier.$set = Object.assign(modifier.$set || {}, transformTimes(userId, modifiedDoc));
    Object.assign(modifiedDoc, doc, modifier.$set);

    checkFieldsValidity(userId, modifiedDoc, doc);
});
