import { ObjectStatus, BaseSchema, Employees } from '../collections';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import { PartnerTypeList } from '../choicelists';

// LOG ENTRIES
// created after an event on collections or a method call
// hold information for display and filtering by user
// a description is optional; if none provided, one will be generated

export enum LogActions {
    OBJECT_CREATED,
    OBJECT_UPDATED,
    OBJECT_REMOVED,
    ENTRY_SUBMITTED,
    ENTRY_APPROVED,
    ENTRY_REJECTED,
    OBJECT_ASSIGNED,
    OBJECT_UNASSIGNED,
}

export interface LogEntry {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    userId?: string,
    action: LogActions,
    ownerLabel?: string,
    relatedObjects?: { collectionName: string, id: string, label?: string, ownerLabel?: string, type?: number }[],
    description?: string,

    // used for filtering (can be null)
    companyCode?: string,
    projectId?: string,
}
export const LogEntrySchema = new SimpleSchema(Object.assign({
    userId: {
        type: String,
        optional: true,
    },
    action: {
        type: Number,
        allowedValues: [
            LogActions.OBJECT_CREATED,
            LogActions.OBJECT_UPDATED,
            LogActions.OBJECT_REMOVED,
            LogActions.ENTRY_SUBMITTED,
            LogActions.ENTRY_APPROVED,
            LogActions.ENTRY_REJECTED,
            LogActions.OBJECT_ASSIGNED,
            LogActions.OBJECT_UNASSIGNED,
        ],
    },
    ownerLabel: {
        type: String,
        optional: true,
    },
    relatedObjects: {
        type: [Object],
        defaultValue: [],
    },
    'relatedObjects.$.collectionName': {
        type: String,
    },
    'relatedObjects.$.id': {
        type: String,
    },
    'relatedObjects.$.label': {
        type: String,
        optional: true,
    },
    'relatedObjects.$.ownerLabel': {
        type: String,
        optional: true,
    },
    'relatedObjects.$.type': {
        type: Number,
        min: 0,
        optional: true,
    },
    description: {
        type: String,
        optional: true,
    },
    companyCode: {
        type: String,
        optional: true,
    },
    projectId: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const LogEntries = new Mongo.Collection<LogEntry>('LogEntries');
LogEntries.attachSchema(LogEntrySchema);


// LOG ENTRIES-SPECIFIC HOOKS

// labels generation
LogEntries.before.insert((userId: string, entry: LogEntry) => {
    // get owner info
    let entryOwner = Employees.findOne({ userId: entry.userId });
    let entryOwnerUser = Meteor.users.findOne(entry.userId);

    // save owner identification
    let ownerName = i18n.__('Someone');
    if (entryOwner) {
        ownerName = `${entryOwner.firstName} ${entryOwner.lastName}`;
    } else if (entryOwnerUser) {
        ownerName = entryOwnerUser.username;
    }
    entry.ownerLabel = ownerName;

    // save objects info
    for (let i = 0; i < entry.relatedObjects.length; i++) {
        let objInfo = entry.relatedObjects[i];
        let object = (Mongo.Collection as any).get(objInfo.collectionName).findOne(objInfo.id);
        let owner;

        let label = '(unknown object)';
        let ownerLabel = '(unknown owner)';
        let type = null;

        if (!object) { continue; }

        switch (objInfo.collectionName) {
            case 'Companies':
                label = object.name;
                break;
            case 'Partners':
                type = object.type;
                label = object.name;
                break;
            case 'Products':
                label = object.name;
                break;
            case 'Projects':
                label = object.name;
                break;
            case 'Tasks':
                label = object.name;
                ownerLabel = object.projectName;
                break;
            case 'SalesOrders':
                label = object.code;
                break;
            case 'SalesOrderLines':
                label = `${object.projectCode}-${object.code}`;
                break;
            case 'Employees':
                label = `${object.firstName} ${object.lastName}`;
                break;
            case 'EmployeeGroups':
                label = object.name;
                break;
            case 'EmployeeRoles':
                label = object.name;
                break;
            case 'EmployeeSkills':
                label = object.name;
                break;
            case 'Timecards':
            case 'Expenses':
                owner = Employees.findOne({ userId: object.userId });
                if (!owner) { break; }
                ownerLabel = `${owner.firstName} ${owner.lastName}`;
                break;
            case 'ExpenseTypes':
                label = object.name;
                break;
        }

        entry.relatedObjects[i].label = label;
        entry.relatedObjects[i].ownerLabel = ownerLabel;
        entry.relatedObjects[i].type = type;
    }

    return true;
});