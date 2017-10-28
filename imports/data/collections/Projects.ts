import { ObjectStatus, BaseSchema, AlertLevel, Partners, Companies, Employees } from '../collections';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

export enum ProjectStatus {
    PLANNED,
    SCHEDULED,
    IN_PROGRESS,
    CLOSED,
    CANCELED
}

// PROJECTS
// projects are the core of the application
// they are used to monitor service and products delivery to customers
export interface Project {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    code: string,
    name: string,
    projectStatus: ProjectStatus,
    description?: string,
    partnerCode: string,
    companyCode: string,
    alertLevel?: AlertLevel,

    // assigned employees and groups
    assignedManagers?: string[],    // object ids
    assignedMembers?: string[],
    assignedGroups?: string[],
    assignedWithoutTask?: string[],     // employee ids that are not assigned to specific tasks

    // params
    beginDate?: Date,
    endDate?: Date,
    languageCode?: string,

    // settings
    setting_taskApprovalRequired?: boolean,
    setting_billingDisabled?: boolean,
    setting_canChangeBillingSetting?: boolean,

    // denormalized data
    // assignedExternalResources?: string[],
    partnerName?: string,
    companyName?: string,
}
export const ProjectSchema = new SimpleSchema(Object.assign({
    code: {
        type: String,
        denyUpdate: true,
    },
    name: {
        type: String,
    },
    projectStatus: {
        type: Number,
        allowedValues: [
            ProjectStatus.PLANNED,
            ProjectStatus.SCHEDULED,
            ProjectStatus.IN_PROGRESS,
            ProjectStatus.CLOSED,
            ProjectStatus.CANCELED
        ],
        defaultValue: 0,
    },
    description: {
        type: String,
        optional: true,
    },
    partnerCode: {
        type: String,
        denyUpdate: true,
    },
    companyCode: {
        type: String,
    },
    alertLevel: {
        type: Number,
        allowedValues: [
            AlertLevel.NONE,
            AlertLevel.LOW,
            AlertLevel.MEDIUM,
            AlertLevel.HIGH,
            AlertLevel.CRITICAL,
        ],
        defaultValue: 0,
    },
    assignedManagers: {
        type: [String],
        defaultValue: [],
    },
    assignedMembers: {
        type: [String],
        defaultValue: [],
    },
    assignedGroups: {
        type: [String],
        defaultValue: [],
    },
    assignedWithoutTask: {
        type: [String],
        defaultValue: [],
    },
    beginDate: {
        type: Date,
        optional: true,
    },
    endDate: {
        type: Date,
        optional: true,
    },
    languageCode: {
        type: String,
        regEx: /^[A-Z]{2,3}$/,
        optional: true,
    },
    setting_taskApprovalRequired: {
        type: Boolean,
        optional: true,
    },
    setting_billingDisabled: {
        type: Boolean,
        optional: true,
    },
    setting_canChangeBillingSetting: {
        type: Boolean,
        optional: true,
    },

    // denormalized
    // assignedExternalResources: {
    //     type: [String],
    //     defaultValue: [],
    // },
    partnerName: {
        type: String,
        optional: true,
    },
    companyName: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const Projects = new Mongo.Collection<Project>('Projects');
Projects.attachSchema(ProjectSchema);



// this function denormalizes data on the project
function denormalizeProjectData(userId, doc: Project) {
    // company name and partner name
    let partner = Partners.findOne({
            code: doc.partnerCode,
            companyCode: doc.companyCode
        });
    let company = Companies.findOne({ code: doc.companyCode });

    Projects.direct.update(doc._id, {
        $set: {
            partnerName: partner ? partner.name : '',
            companyName: company ? company.name : '',
        }
    })
}

// adds the creator of the project as a manager
function addDefaultManager(userId, doc: Project) {
    let currentEmployee = Employees.findOne({ userId });
    if (currentEmployee) {
        Projects.direct.update(doc._id, {
            $set: {
                assignedManagers: doc.assignedManagers.concat(currentEmployee._id)
            }
        })
    }
}

// checks the fields validity
function checkFieldsValidity(userId, doc: Project) {
    // dates de début/fin
    if (doc.beginDate > doc.endDate) {
        throw new Meteor.Error('project-dates',
            i18n.__('Begin Date must be before End Date'));
    }
}


// POST EVENT HOOKS
// data denormalization

Projects.after.insert((userId, doc: Project) => {
    denormalizeProjectData(userId, doc);
    addDefaultManager(userId, doc);
});
Projects.after.update((userId, doc: Project, fieldNames, modifier:any, options) => {
    denormalizeProjectData(userId, doc);
});


// PRE EVENT HOOKS
// data validity checks

Projects.before.insert((userId, doc: Project) => {
    checkFieldsValidity(userId, doc);
});
Projects.before.update((userId, doc: Project, fieldNames, modifier:any, options) => {

    // génération de l'objet modifié
    let modifiedDoc = {} as Project;
    Object.assign(modifiedDoc, doc, modifier.$set);

    checkFieldsValidity(userId, modifiedDoc);
});