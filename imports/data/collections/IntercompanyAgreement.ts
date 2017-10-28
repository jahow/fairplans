import { ObjectStatus, SynchronizationStatus, BaseSchema } from '../collections';
import { Projects, Employees, Partners, PartnerType, Tasks, SalesOrderLines } from '../collections';
import { TAPi18n as i18n } from 'meteor/tap:i18n';


// INTERCOMPANY AGREEMENT
// Is created when an external resource (= employee from a different company) is assigned on a project
// the agreement can then be approved by the manager of the employee
// a time budget and a price are defined in the agreement and cannot be changed after approval
export interface IntercompanyAgreement {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,
    updateTime?: Date,
    syncStatus?: SynchronizationStatus,
    syncComments?: string,

    taskId: string,
    employeeId: string,
    hoursAmount: number,        // the agreement budget must be lower than task budget
    hourlyRate: number,        // taken from the employee object
    currency: string,
    isApproved?: boolean,        // the object is locked when true

    buyerOrderCode?: string,
    sellerOrderCode?: string,

    // denormalized
    projectId: string,
    productCode?: string,
    hoursRemaining?: number,
    projectName?: string,
    taskName?: string,
    employeeName?: string,
    buyerCompanyCode?: string,    // aka project's company
    sellerCompanyCode?: string,    // aka employee's company
    buyerPartnerCode?: string,
    sellerPartnerCode?: string,
    lineDescription?: string,
    lineSoCode?: string,
}

export const IntercompanyAgreementSchema = new SimpleSchema(Object.assign({}, BaseSchema, {
    taskId: {
        type: String,
        denyUpdate: true,
    },
    employeeId: {
        type: String,
        denyUpdate: true,
    },
    hoursAmount: {
        type: Number,
        min: 0,
        exclusiveMin: true,
        decimal: true,
    },
    hourlyRate: {
        type: Number,
        min: 0,
        exclusiveMin: true,
        decimal: true,
    },
    currency: {
        type: String,
        regEx: /^[A-Z]{3}$/,
    },
    isApproved: {
        type: Boolean,
        defaultValue: false,
    },
    syncStatus: {
        type: Number,
        allowedValues: [
            SynchronizationStatus.NOT_RELEVANT,
            SynchronizationStatus.AWAITING_SYNC,
            SynchronizationStatus.SYNC_IN_PROGRESS,
            SynchronizationStatus.SYNCED,
            SynchronizationStatus.SYNC_ERROR,
        ],
        autoValue() {
            let me = this as any;
            let isApproved = me.field('isApproved').isSet && me.field('isApproved').value == true;
            let autoSync = true;
            if (isApproved && autoSync) {
                return SynchronizationStatus.AWAITING_SYNC;
            }
            if (!me.isSet && me.isInsert) {
                return SynchronizationStatus.NOT_RELEVANT;
            }
        },
    },

    // denormalized
    salesOrderLineId: {
        type: String,
        optional: true,
    },
    projectId: {
        type: String,
        optional: true,
    },
    hoursRemaining: {
        type: Number,
        min: 0,
        decimal: true,
        autoValue() {
            let budget = this.field('hoursAmount');
            if (this.isInsert && budget.isSet) {
                return budget.value;
            }
        },
    },
    productCode: {
        type: String,
        optional: true,
    },
    projectName: {
        type: String,
        optional: true,
    },
    taskName: {
        type: String,
        optional: true,
    },
    employeeName: {
        type: String,
        optional: true,
    },
    buyerCompanyCode: {
        type: String,
        optional: true,
    },
    sellerCompanyCode: {
        type: String,
        optional: true,
    },
    buyerPartnerCode: {
        type: String,
        optional: true,
    },
    sellerPartnerCode: {
        type: String,
        optional: true,
    },
    buyerOrderCode: {
        type: String,
        optional: true,
    },
    sellerOrderCode: {
        type: String,
        optional: true,
    },
    lineDescription: {
        type: String,
        optional: true,
    },
    lineSoCode: {
        type: String,
        optional: true,
    },
    dueDate: {
        type: Date,
        optional: true,
    },
}));

export const IntercompanyAgreements = new Mongo.Collection<IntercompanyAgreement>('IntercompanyAgreements');
IntercompanyAgreements.attachSchema(IntercompanyAgreementSchema);


// denormalize company codes
function denormalizeData(userId, doc: IntercompanyAgreement) {
    let buyerCompanyCode = '';
    let sellerCompanyCode = '';
    let projectName = '';
    let projectId = '';
    let salesOrderLineId = '';
    let taskName = '';
    let employeeName = '';
    let productCode = '';
    let sellerPartnerCode = '';
    let buyerPartnerCode = '';
    let lineDescription = '';
    let lineSoCode = '';
    let dueDate = new Date();

    // task info
    let task = Tasks.findOne(doc.taskId);
    if (task) {
        taskName = task.name;
        projectId = task.projectId;
        salesOrderLineId = task.salesOrderLineId;

        // project info
        let project = Projects.findOne(task.projectId);
        if (project) {
            buyerCompanyCode = project.companyCode;
            projectName = project.name;
            dueDate = project.endDate || dueDate;
        }

        // sales order line info
        let line = SalesOrderLines.findOne(task.salesOrderLineId);
        if (line) {
            lineDescription = line.description;
            lineSoCode = line.salesOrderCode;
        }
    }

    // employee info
    let employee = Employees.findOne(doc.employeeId);
    if (employee) {
        employeeName = `${employee.firstName} ${employee.lastName}`;
        sellerCompanyCode = employee.companyCode;
    }

    // partners for buyer and seller company
    if (sellerCompanyCode && buyerCompanyCode) {
        let buyerPartner = Partners.findOne({
            type: PartnerType.SUPPLIER,
            externalCompanyCode: sellerCompanyCode,
            companyCode: buyerCompanyCode,
        });
        buyerPartnerCode = buyerPartner ? buyerPartner.code : '';

        let sellerPartner = Partners.findOne({
            type: PartnerType.CUSTOMER,
            externalCompanyCode: buyerCompanyCode,
            companyCode: sellerCompanyCode,
        });
        sellerPartnerCode = sellerPartner ? sellerPartner.code : '';
    }

    // update object
    IntercompanyAgreements.direct.update(doc._id, {
        $set: {
            buyerCompanyCode,
            sellerCompanyCode,
            taskName,
            salesOrderLineId,
            projectId,
            projectName,
            employeeName,
            productCode,
            buyerPartnerCode,
            sellerPartnerCode,
            lineDescription,
            lineSoCode,
            dueDate,
        }
    });

    // refresh remaining time on agreement
    Meteor.call('intercompany.agreements.refresh', { taskId: doc.taskId, employeeId: doc.employeeId });
}


// if agreement is approved, prevent any modification
function disallowModificationIfApproved(userId, doc: IntercompanyAgreement, previousDoc?: IntercompanyAgreement) {
    if (previousDoc ? previousDoc.isApproved : doc.isApproved) {
        throw new Meteor.Error('agreement-locked', i18n.__('Agreement is already approved and cannot be updated.'));
    }
}

// if an agreement is already active for this user, prevent insertion
function checkInsertPossible(userId, doc: IntercompanyAgreement) {
    let task = Tasks.findOne(doc.taskId);
    if (!task) {
        throw new Meteor.Error('task-not-found', i18n.__('The task for this agreement could not be found.'));
    }
    if (task.hoursRemaining < doc.hoursAmount) {
        throw new Meteor.Error('task-budget-too-low', i18n.__('The agreement\'s budget must be equal or lower than the remaining task budget.'));
    }

    let existing = IntercompanyAgreements.find({
        taskId: doc.taskId,
        employeeId: doc.employeeId,
        isApproved: true,
        hoursRemaining: { $gt: 0 }
    }).count() > 0;

    if (existing) {
        throw new Meteor.Error('agreement-existing', i18n.__('An agreement is already active for this task and employee.'));
    }
}


// POST EVENT HOOKS
// data denormalization

IntercompanyAgreements.after.insert((userId, doc: IntercompanyAgreement) => {
    denormalizeData(userId, doc);
    Meteor.call('task.refreshExternalResources', doc.taskId);
});
IntercompanyAgreements.after.update((userId, doc: IntercompanyAgreement, fieldNames, modifier:any, options) => {
    denormalizeData(userId, doc);
    Meteor.call('task.refreshExternalResources', doc.taskId);

    if (this.previous && this.previous.docId != doc.taskId) {
        Meteor.call('task.refreshExternalResources', this.previous.taskId);
    }
});
IntercompanyAgreements.after.remove((userId, doc: IntercompanyAgreement) => {
    Meteor.call('task.refreshExternalResources', doc.taskId);
});


// PRE EVENT HOOKS
// data validity checks

IntercompanyAgreements.before.insert((userId, doc: IntercompanyAgreement) => {
    checkInsertPossible(userId, doc);
});
IntercompanyAgreements.before.update((userId, doc: IntercompanyAgreement, fieldNames, modifier:any, options) => {

    // génération de l'objet modifié
    let modifiedDoc = {} as IntercompanyAgreement;
    Object.assign(modifiedDoc, doc, modifier.$set);

    disallowModificationIfApproved(userId, modifiedDoc, doc);
});
IntercompanyAgreements.before.remove((userId, doc: IntercompanyAgreement) => {
    disallowModificationIfApproved(userId, doc);
});
