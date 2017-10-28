import { ObjectStatus, BaseSchema } from '../collections';
import { EmployeePositionList } from '../choicelists';

// EMPLOYEES
// an employee is a physical person able to use the app according to its permissions
export interface Employee {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    code: string,
    userId: string,        // link to the corresponding Meteor.users entry (for login)
    companyCode: string,
    lastName: string,
    firstName: string,
    email: string,
    position: string,        // EmployeePositionType
    active: boolean,
    managerId?: string,    // an employee id
    worktimePerDay: number,    // in hours
    leavePerWorkday: number,
    jobBeginDate: Date,
    jobEndDate: Date,
    defaultProfitCenter: string,
    spokenLanguages: string[],    // array of iso2 codes
    partnerCode: string,            // corresponding supplier code for use when synchronizing with B1
    roleId: string,                // EmployeeRole id
    skills: {skillId: string, skillLevel: number}[],        // array of { EmployeeSkill, EmployeeSkillLevel}

    skillsString: string,

    hourlyCost?: number,
    hourlyCostFullyLoaded?: number,
    hourlySessionPrice?: number,
    weekWorktimeHours?: number,

    // denormalized data
    userName?: string,

    // settings
    setting_alertIntercompanyUse: boolean,
    setting_requirePastEntriesConfirmation?: boolean
}
export const EmployeeSchema = new SimpleSchema(Object.assign({
    code: {
        type: String,
        denyUpdate: true,
    },
    userId: {
        type: String,
        optional: true,
    },
    companyCode: {
        type: String,
    },
    lastName: {
        type: String,
    },
    firstName: {
        type: String,
        optional: true,
    },
    email: {
        type: String,
        optional: true,
    },
    position: {
        type: String,
        allowedValues: EmployeePositionList.map(p => p.value),
        defaultValue: 'na',
    },
    active: {
        type: Boolean,
        defaultValue: true,
    },
    managerId: {
        type: String,
        optional: true,
        autoValue() {
            let me = this as any;
            if (me.isSet) { return; }
            else if(me.field('managerCode').isSet) {
                let companyCode = me.field('companyCode').isSet && me.field('companyCode').value;
                if (me.isUpdate) {
                    companyCode = Employees.findOne(me.docId).companyCode;
                }
                let manager = Employees.findOne({
                    code: me.field('managerCode').value,
                    companyCode,
                });
                return manager ? manager._id : '';
            }
        },
    },
    worktimePerDay: {
        type: Number,
        decimal: true,
        min: 0,
        max: 24,
        optional: true,
    },
    leavePerWorkday: {
        type: Number,
        decimal: true,
        min: 0,
        max: 1,
        optional: true,
    },
    jobBeginDate: {
        type: Date,
        optional: true,
    },
    jobEndDate: {
        type: Date,
        optional: true,
    },
    defaultProfitCenter: {
        type: String,
        optional: true,
    },
    spokenLanguages: {
        type: [String],
        regEx: /^[A-Z]{2,3}$/,
        optional: true,
    },
    partnerCode: {
        type: String,
        optional: true,
    },
    roleId: {
        type: String,
        optional: true,
    },
    skills: {
        type: [Object],
        defaultValue: [],
    },
    'skills.$.skillId': {
        type: String,
    },
    'skills.$.skillLevel': {
        type: Number,
    },
    skillsString: {
        type: String,
        optional: true,
    },
    hourlyCost: {
        type: Number,
        optional: true,
    },
    hourlyCostFullyLoaded: {
        type: Number,
        optional: true,
    },
    hourlySessionPrice: {
        type: Number,
        optional: true,
    },
    weekWorktimeHours: {
        type: Number,
        optional: true,
    },
    counterHolidays: {
        type: Number,
        optional: true,
    },
    counterRTT: {
        type: Number,
        optional: true,
    },
    counterMisc: {
        type: Number,
        optional: true,
    },
    setting_alertIntercompanyUse: {
        type: Boolean,
        defaultValue: true,
    },
    setting_requirePastEntriesConfirmation: {
        type: Boolean,
        defaultValue: true,
    },

    // denormalized
    userName: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const Employees = new Mongo.Collection<Employee>('Employees');
Employees.attachSchema(EmployeeSchema);


// EMPLOYEE-SPECIFIC HOOKS


// checks the validity of the insert/update
// an employee cannot be its own manager
function isEmployeeValid(userId, doc: Employee, previousDoc?: Employee) {
    if (doc.managerId == doc._id) {
        throw new Meteor.Error('manager-invalid', 'An employee cannot be its own manager.');
    }
}


// if an employee is modified but has no userId setup, a new user
// is created and linked to this employee with its email
// then an enrollment email is sent
function checkUserExists(userId, doc: Employee) {
    if(doc.userId || !doc.email) { return; }

    // check if a user already exist
    let existingUser: any;
    existingUser = Accounts.findUserByUsername(doc.email) || Accounts.findUserByEmail(doc.email);
    if (existingUser) {
        Employees.update(doc._id, {
            $set: { userId: existingUser._id }
        });
        return;
    }

    // create a user with the employee email
    let newUserId = Accounts.createUser({
        username: doc.email,
        email: doc.email,
        password: '1234',	// TEMP!!!
        profile: {
            name: `${doc.lastName} ${doc.firstName}`,
        }
    });

    // link to employee
    Employees.update(doc._id, {
        $set: { userId: newUserId }
    });

    // send email
    // TEMP: deactivated
    //Accounts.sendEnrollmentEmail(newUserId);
    console.log('new account created: ' + doc.email);
}


// user name denormalization
function denormalizeEmployeeData(userId, doc: Employee, previousDoc?: Employee) {
    let user = Meteor.users.findOne(userId);
    if (user) {
        Employees.direct.update(doc._id, {
            $set: { userName: user.username }
        });
    }
}


// POST EVENT HOOKS
// data denormalization

Employees.after.insert((userId, doc: Employee) => {
    checkUserExists(userId, doc);
    denormalizeEmployeeData(userId, doc);
});
Employees.after.update((userId, doc: Employee, fieldNames, modifier:any, options) => {
    checkUserExists(userId, doc);
    denormalizeEmployeeData(userId, doc, this.previous);
});
Employees.after.remove((userId, doc: Employee) => {
    checkUserExists(userId, doc);
    denormalizeEmployeeData(userId, doc);
});


// PRE EVENT HOOKS
// data validity checks

Employees.before.insert((userId, doc: Employee) => {
    isEmployeeValid(userId, doc);
});
Employees.before.update((userId, doc: Employee, fieldNames, modifier:any, options) => {

    // génération de l'objet modifié
    let modifiedDoc = {} as Employee;
    Object.assign(modifiedDoc, doc, modifier.$set);

    isEmployeeValid(userId, modifiedDoc, doc);
});