// THIS IS THE ENTRY POINT FOR COLLECTIONS EXPORT
// Data validation and default values are handled with the SimpleSchema/Collection2 packages
// Special logic and data denormalization is handled through collection hooks


// COMMON ENUMS

export enum ObjectStatus {
    ACTIVE = 0,
    DISABLED = 1,
    ARCHIVED = 2,
}
export enum SynchronizationStatus {
    NOT_RELEVANT = -1,
    AWAITING_SYNC = 0,
    SYNC_IN_PROGRESS = 1,
    SYNCED = 2,
    SYNC_ERROR = 3,
}
export enum AlertLevel {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4,
}
export enum UserEntryStatus {
    DRAFT = 100,
    SUBMITTED = 101,
    APPROVED = 102,
    CONFLICTING = 103,
    TEMPORARY = 104,
}
export enum CollectionOperation {
    INSERT,
    UPDATE,
    REMOVE,
}

// base schema used for all collections
export const BaseSchema = {
    _id: {
        type: String,
        denyUpdate: true,
    },
    status: {
        type: Number,
        allowedValues: [
            ObjectStatus.ACTIVE,
            ObjectStatus.DISABLED,
            ObjectStatus.ARCHIVED,
            UserEntryStatus.APPROVED,
            UserEntryStatus.CONFLICTING,
            UserEntryStatus.DRAFT,
            UserEntryStatus.SUBMITTED,
            UserEntryStatus.TEMPORARY,
        ],
        defaultValue: ObjectStatus.ACTIVE,
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
            let isApproved = me.field('status').isSet && me.field('status').value == UserEntryStatus.APPROVED;
            let autoSync = true;
            if (isApproved && autoSync) {
                return SynchronizationStatus.AWAITING_SYNC;
            }
            if (!me.isSet && me.isInsert) {
                return SynchronizationStatus.NOT_RELEVANT;
            }
        },
    },
    syncComments: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    creationTime: {
        type: Date,
        autoValue() {
            if (this.isInsert) { return new Date(); }
            if (this.isUpsert) { return { $setOnInsert: new Date() }; }
            this.unset();
            return undefined;
        },
    },
    updateTime: {
        type: Date,
        autoValue() { return new Date(); },
    },
};

// collections export
export * from './collections/Companies';
export * from './collections/Partners';
export * from './collections/Products';
export * from './collections/Projects';
export * from './collections/SalesOrders';
export * from './collections/SalesOrderLines';
export * from './collections/Tasks';
export * from './collections/Milestones';
export * from './collections/Employees';
export * from './collections/EmployeeGroups';
export * from './collections/EmployeeRoles';
export * from './collections/EmployeeSkills';
export * from './collections/Timecards';
export * from './collections/Expenses';
export * from './collections/ExpenseTypes';
export * from './collections/LogEntries';
export * from './collections/IntercompanyAgreement';
