import { ObjectStatus, BaseSchema, Projects } from '../collections';
import { SalesOrderLine, SalesOrderLines} from '../collections';
import { TAPi18n as i18n } from 'meteor/tap:i18n';


export enum TaskLocationType {
    ON_SITE = 0,
    REMOTE = 1,
}

const DEFAULT_BASE_DURATION = 0.5;


// PROJECT TASKS
// a task can be used to enter timesheet entries
// these entries are then added to the 'delivered' quantity of the sales order lines
export interface Task {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    name: string,
    projectId: string,        // link is done with id

    // assigned employees
    assignedEmployees?: string[],     // these were assigned by hand

    managerStatus?: number,
    salesOrderLineId?: string,
    totalTime: number,        // in hours
    beginDate?: Date,           // if not set, use project dates
    endDate?: Date,
    baseDuration?: number,    // if not set, will default to 1
    minEntryDuration?: number,        // minimum duration of entered timecards
    locationType?: TaskLocationType,

    // computed automatically
    orderIndex?: number;    // starts at 0
    hoursApproved?: number,
    hoursSubmitted?: number,
    hoursAsDraft?: number,
    hoursPlanned?: number,      // drafts but in the future
    hoursRemaining?:number,

    // denormalized data
    projectName?: string,
    partnerName?: string,
    partnerCode?: string,
    companyName?: string,
    companyCode?: string,
    hoursBudgetConstrained?:boolean, // Provient de l'objet SalesOrderLine
    assignedExternalResources?: string[],    // denormalized from approved agreements
}
export const TaskSchema = new SimpleSchema(Object.assign({
    assignedEmployees: {
        type: [String],
        defaultValue: [],
    },
    assignedExternalResources: {
        type: [String],
        defaultValue: [],
    },
    name: {
        type: String,
    },
    projectId: {
        type: String,
        denyUpdate: true,
    },
    managerStatus: {
        type: Number,
        optional: true,
    },
    salesOrderLineId: {
        type: String,
        optional: true,
    },
    totalTime: {
        type: Number,
        defaultValue: 0,
        decimal: true,
    },
    beginDate: {
        type: Date,
        optional: true,
    },
    endDate: {
        type: Date,
        optional: true,
    },
    baseDuration: {
        type: Number,
        decimal: true,
        defaultValue: DEFAULT_BASE_DURATION,
    },
    minEntryDuration: {
        type: Number,
        decimal: true,
        min: 0,
        max: 24,
        defaultValue: 0,
    },
    locationType: {
        type: Number,
        allowedValues: [
            TaskLocationType.ON_SITE,
            TaskLocationType.REMOTE,
        ],
        defaultValue: TaskLocationType.ON_SITE
    },

    // automatically computed
    orderIndex: {
        type: Number,
        decimal: true,
        optional: true,
    },
    hoursApproved: {
        type: Number,
        decimal: true,
        defaultValue: 0,
    },
    hoursSubmitted: {
        type: Number,
        decimal: true,
        defaultValue: 0,
    },
    hoursAsDraft: {
        type: Number,
        decimal: true,
        defaultValue: 0,
    },
    hoursPlanned: {
        type: Number,
        decimal: true,
        defaultValue: 0,
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
    hoursBudgetConstrained: {
        type: Boolean,
        optional: true,
    },
    hoursRemaining:{
        type: Number,
        decimal: true,
        defaultValue: 0,
        min: 0,
    }
}, BaseSchema));
export const Tasks = new Mongo.Collection<Task>('Tasks');
Tasks.attachSchema(TaskSchema);


// POST EVENT HOOKS

// refresh task order
Tasks.after.insert((userId, doc) => Meteor.call('project.refreshTaskOrder', doc.projectId));
Tasks.after.update((userId, doc) => Meteor.call('project.refreshTaskOrder', doc.projectId));
Tasks.after.remove((userId, doc) => Meteor.call('project.refreshTaskOrder', doc.projectId));

// Recalcul des temps de la tâche
Tasks.after.insert((userId, doc) => Meteor.call('task.updateTime', doc._id));
Tasks.after.update((userId, doc) => Meteor.call('task.updateTime', doc._id));


// PRE EVENT HOOKS

// Fonction permettant de vérifier la répartition des tâches avec le total d'heure su r la billing section
// avec le flag hoursBudgetConstrained
function checkHoursBudget(userId, doc:Task) {
    if (!doc.salesOrderLineId)
    {
        return;
    }

    let line = SalesOrderLines.findOne(doc.salesOrderLineId);
    if (!line.hoursBudgetConstrained) { return; }
    let hoursBudget = line.amountHours;
    let tasks =  Tasks.find({ salesOrderLineId: line._id }).fetch()
        .filter(f => f._id != doc._id);
    let sumHoursTasks = doc.totalTime;
    tasks.forEach(lineTask => sumHoursTasks += lineTask.totalTime);
    if (hoursBudget <sumHoursTasks)
    {
        throw new Meteor.Error('Budget-Error', i18n.__('Hours Budget is over run'));
    }
    return;
}

// Vérification de la validité des champs de la tâche
function checkFieldsValidity(userId, doc: Task) {

    // durées minimum/par défaut
    if (doc.minEntryDuration > doc.baseDuration) {
        throw new Meteor.Error('task-duration',
            i18n.__('Default Timesheet Duration must be higher than Minimum Timesheet Duration'));
    }

    // dates de début/fin
    if (doc.beginDate > doc.endDate) {
        throw new Meteor.Error('task-dates',
            i18n.__('Begin Date must be before End Date'));
    }
}

// application des hooks
Tasks.before.insert((userId, doc) => {
    // exécution des fonctions de vérification
    checkHoursBudget(userId, doc);
    checkFieldsValidity(userId, doc);
});
Tasks.before.update((userId, doc:Task, fieldNames, modifier:any, options) => {
    // génération de l'objet modifié
    let modifiedDoc = {} as Task;
    Object.assign(modifiedDoc, doc, modifier.$set);

    // exécution des fonctions de vérification
    checkHoursBudget(userId, modifiedDoc);
    checkFieldsValidity(userId, modifiedDoc);
});