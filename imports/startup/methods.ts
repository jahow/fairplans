import { TAPi18n as i18n } from 'meteor/tap:i18n';

import * as Collections from '../data/collections';
import { Tools, UserEntryTools, DateTools } from '../utils/tools';
import ColorTools from '../utils/color';


Meteor.methods({

	// USERS

	// a new user is created and linked to this employee
	// with its email, then an enrollment email is sent
	'user.create'(employee: Collections.Employee) {
		if(employee.userId) { return; }

		// create a user with the employee email
		let newUserId = Accounts.createUser({
			username: employee.email,
			email: employee.email,
			profile: {
				name: `${employee.lastName} ${employee.firstName}`,
			},
		});
		Accounts.sendEnrollmentEmail(newUserId);
		console.log('new account created: ' + employee.email);
	},


	// ASSIGNMENTS

	// to projects:
	// if asManager is undefined and the employee already exists, no change in position
	'assign.employee.project'(projectId: string, employeeId: string, asManager: boolean) {
		let project = Collections.Projects.findOne(projectId);
		if (!project) { return false; }

		// check if the employee is invalid or is part of another company
		let employee = Collections.Employees.findOne(employeeId);
		if (!employee || employee.companyCode != project.companyCode) {
			return false;
		}

		let members = project.assignedMembers || [];
		let managers = project.assignedManagers || [];

		if (asManager) {
			managers.push(employeeId);
			let index = members.indexOf(employeeId);
			if (index > -1) { members.splice(index, 1); }
		} else if (asManager === false) {
			members.push(employeeId);
			let index = managers.indexOf(employeeId);
			if (index > -1) { managers.splice(index, 1); }
		}

		// add as simple member unless already there
		else {
			if (managers.indexOf(employeeId) > -1 || members.indexOf(employeeId) > -1) {
				return true;
			}
			members.push(employeeId);
		}

		// remove dupes
		members = members.filter((item, pos) => { return members.indexOf(item) == pos });
		managers = managers.filter((item, pos) => { return managers.indexOf(item) == pos });
		
		// update without task state
		Meteor.call('update.employee.withoutTask.project', projectId, employeeId);

		Collections.Projects.update(project._id, {
			$set: {
				assignedMembers: members,
				assignedManagers: managers,
			}
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_ASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'Projects', id: projectId },
			],
			projectId,
		});

		return true;
	},
	'unassign.employee.project'(projectId: string, employeeId: string, asManager: boolean) {
		let project = Collections.Projects.findOne(projectId);
		if (!project) { return false; }

		let members = project.assignedMembers || [];
		let managers = project.assignedManagers || [];

		let index = members.indexOf(employeeId);
		if (index > -1) { members.splice(index, 1); }
		index = managers.indexOf(employeeId);
		if (index > -1) { managers.splice(index, 1); }

		Collections.Projects.update(project._id, {
			$set: {
				assignedMembers: members,
				assignedManagers: managers,
			}
		});

		// unassign from all tasks too
		let tasks = Collections.Tasks.find({ projectId }).fetch();
		for (let i = 0; i < tasks.length; i++) {
			Meteor.call('unassign.employee.task', tasks[i]._id, employeeId);
		}

		// update without task state
		Meteor.call('remove.employee.withoutTask.project', projectId, employeeId);

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_UNASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'Projects', id: projectId },
			],
			projectId,
		});

		return true;
	},
	'update.employee.withoutTask.project'(projectId: string, employeeId: string) {
		let project = Collections.Projects.findOne(projectId);
		if (!project) { return false; }

		let withoutTasks = project.assignedWithoutTask || [];

		// is without task ?
		let withoutTask = true;
		let tasks = Collections.Tasks.find({ projectId }).fetch();
		for (let i = 0; i < tasks.length; i++) {
			if (tasks[i].assignedEmployees.indexOf(employeeId) > -1) {
				withoutTask = false;
				break;
			}
		}

		let index = withoutTasks.indexOf(employeeId);

		// remove from without task list
		if (!withoutTask) {
			if (index > -1) { withoutTasks.splice(index, 1); }
		}

		// add to list
		else if (index == -1) {
			withoutTasks.push(employeeId);
		}

		Collections.Projects.direct.update(project._id, {
			$set: {
				assignedWithoutTask: withoutTasks,
			}
		});

		return true;
	},
	'remove.employee.withoutTask.project'(projectId: string, employeeId: string) {
		let project = Collections.Projects.findOne(projectId);
		if (!project) { return false; }

		let withoutTasks = project.assignedWithoutTask || [];
		let index = withoutTasks.indexOf(employeeId);
		if (index > -1) { withoutTasks.splice(index, 1); }
	
		Collections.Projects.direct.update(project._id, {
			$set: {
				assignedWithoutTask: withoutTasks,
			}
		});

		return true;
	},
	'assign.group.project'(projectId: string, employeeGroupId: string) {
		let project = Collections.Projects.findOne(projectId);
		if (!project) { return false; }

		let groups = project.assignedGroups || [];
		groups.push(employeeGroupId);

		// remove dupes
		groups = groups.filter((item, pos) => { return groups.indexOf(item) == pos });
		
		Collections.Projects.update(project._id, {
			$set: {
				assignedGroups: groups,
			}
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_ASSIGNED,
			relatedObjects: [
				{ collectionName: 'EmployeeGroups', id: employeeGroupId },
				{ collectionName: 'Projects', id: projectId },
			],
			projectId,
		});

		return true;
	},
	'unassign.group.project'(projectId: string, employeeGroupId: string) {
		let project = Collections.Projects.findOne(projectId);
		if (!project) { return false; }

		let groups = project.assignedGroups || [];
		let index = groups.indexOf(employeeGroupId);
		if (index > -1) { groups.splice(index, 1); }
		
		Collections.Projects.update(project._id, {
			$set: {
				assignedGroups: groups,
			}
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_UNASSIGNED,
			relatedObjects: [
				{ collectionName: 'EmployeeGroups', id: employeeGroupId },
				{ collectionName: 'Projects', id: projectId },
			],
			projectId,
		});

		return true;
	},

	// to groups:
	'assign.employee.group'(employeeGroupId: string, employeeId: string, asManager: boolean) {
		let group = Collections.EmployeeGroups.findOne(employeeGroupId);
		if (!group) { return false; }

		let members = group.assignedMembers;
		let managers = group.assignedManagers;

		if (asManager) {
			managers.push(employeeId);
			let index = members.indexOf(employeeId);
			if (index > -1) { members.splice(index, 1); }
		} else {
			members.push(employeeId);
			let index = managers.indexOf(employeeId);
			if (index > -1) { managers.splice(index, 1); }
		}

		// remove dupes
		members = members.filter((item, pos) => { return members.indexOf(item) == pos });
		managers = managers.filter((item, pos) => { return managers.indexOf(item) == pos });

		Collections.EmployeeGroups.update(group._id, {
			$set: {
				assignedMembers: members,
				assignedManagers: managers,
			}
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_ASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'EmployeeGroups', id: employeeGroupId },
			],
			companyCode: group.companyCode,
		});

		return true;
	},
	'unassign.employee.group'(employeeGroupId: string, employeeId: string) {
		let group = Collections.EmployeeGroups.findOne(employeeGroupId);
		if (!group) { return false; }
		
		let members = group.assignedMembers;
		let managers = group.assignedManagers;
		let index = members.indexOf(employeeId);
		if (index > -1) { members.splice(index, 1); }
		index = managers.indexOf(employeeId);
		if (index > -1) { managers.splice(index, 1); }

		Collections.EmployeeGroups.update(group._id, {
			$set: { assignedMembers: members, assignedManagers: managers }
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_UNASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'EmployeeGroups', id: employeeGroupId },
			],
			companyCode: group.companyCode,
		});

		return true;
	},

	// to tasks:
	'assign.employee.task'(taskId: string, employeeId: string) {
		let task = Collections.Tasks.findOne(taskId);
		if (!task) { return false; }

		// check if this is an external employee
		let employee = Collections.Employees.findOne(employeeId);
		let project = Collections.Projects.findOne(task.projectId);
		if (!employee || !project) { return false; }
		if (employee.companyCode != project.companyCode) {
			throw new Meteor.Error('external-employee', i18n.__('This employee must be assigned as an external resource.'));
		}

		let employees = task.assignedEmployees || [];
		employees.push(employeeId);

		// remove dupes
		employees = employees.filter((item, pos) => { return employees.indexOf(item) == pos });

		Collections.Tasks.update(task._id, {
			$set: {
				assignedEmployees: employees,
			}
		});

		// make sure the employee is on the project too
		Meteor.call('assign.employee.project', task.projectId, employeeId);

		// update without task state
		Meteor.call('remove.employee.withoutTask.project', task.projectId, employeeId);

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_ASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'Tasks', id: taskId },
			],
			projectId: task.projectId,
		});

		return true;
	},
	'unassign.employee.task'(taskId: string, employeeId: string) {
		let task = Collections.Tasks.findOne(taskId);
		if (!task) { return false; }

		let employees = task.assignedEmployees || [];
		let index = employees.indexOf(employeeId);
		if (index > -1) { employees.splice(index, 1); }

		Collections.Tasks.update(task._id, {
			$set: {
				assignedEmployees: employees,
			}
		});

		// update without task state
		Meteor.call('update.employee.withoutTask.project', task.projectId, employeeId);

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_UNASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'Tasks', id: taskId },
			],
			projectId: task.projectId,
		});

		return true;
	},

	// assignment of external resources to tasks
	/*
	'assign.externalResource.task'(taskId: string, employeeId: string) {
		let task = Collections.Tasks.findOne(taskId);
		if (!task) { return false; }

		// check if this is an external employee
		let employee = Collections.Employees.findOne(employeeId);
		let project = Collections.Projects.findOne(task.projectId);
		if (!employee || !project) { return false; }
		if (employee.companyCode == project.companyCode) {
			throw new Meteor.Error('not-external-resource', i18n.__('This employee is not an external resource.'));
		}

		// look for an intercompany agreement
		let existingAgreement = Collections.IntercompanyAgreements.find({
			taskId,
			employeeId,
			isApproved: true
		}).count() > 0;

		if (!existingAgreement) {
			throw new Meteor.Error('no-agreement-available', i18n.__('There is no approved Intercompany Agreement for this employee.'));
		}

		let employees = task.assignedExternalResources || [];
		employees.push(employeeId);

		// remove dupes
		employees = employees.filter((item, pos) => { return employees.indexOf(item) == pos });

		Collections.Tasks.update(task._id, {
			$set: {
				assignedExternalResources: employees,
			}
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_ASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'Tasks', id: taskId },
			],
			projectId: task.projectId,
		});

		return true;
	},
	'unassign.externalResource.task'(taskId: string, employeeId: string) {
		let task = Collections.Tasks.findOne(taskId);
		if (!task) { return false; }

		let employees = task.assignedExternalResources || [];
		let index = employees.indexOf(employeeId);
		if (index > -1) { employees.splice(index, 1); }

		Collections.Tasks.update(task._id, {
			$set: {
				assignedExternalResources: employees,
			}
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.OBJECT_UNASSIGNED,
			relatedObjects: [
				{ collectionName: 'Employees', id: employeeId },
				{ collectionName: 'Tasks', id: taskId },
			],
			projectId: task.projectId,
		});

		return true;
	},
	*/


	// TIMECARDS MANAGEMENT
	'timecard.new'(values: Object, userId?: string) {

		// TODO: check validty and rights

		let v: any = Object.assign({}, values);
		v.status = Collections.UserEntryStatus.DRAFT;
		// v.userId = userId || Meteor.userId();

		Collections.Timecards.insert(v);
		return true;
	},
	'timecard.update'(timecardId: string, newValues: Object) {
		delete newValues['_id'];	// temp!

		// TODO: check validty and rights

		Collections.Timecards.update(timecardId, {
			$set: newValues
		});

		return true;
	},
	'timecard.delete'(timecardId: string) {

		// TODO: check validty and rights

		Collections.Timecards.remove(timecardId);
		return true;
	},
	'timecard.submit'(timecardId: string) {
		let timecard = Collections.Timecards.findOne(timecardId);
		if (!timecard) { return false; }

		let task = Collections.Tasks.findOne(timecard.taskId);
		if (!task) { return false; }

		// TODO: check validty and rights

		Collections.Timecards.update(timecardId, {
			$set: { status: Collections.UserEntryStatus.SUBMITTED }
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.ENTRY_SUBMITTED,
			relatedObjects: [
				{ collectionName: 'Timecards', id: timecardId },
			],
			projectId: task.projectId,
		});

		return true;
	},
	'timecard.approve'(timecardId: string) {
		let timecard = Collections.Timecards.findOne(timecardId);
		if (!timecard) { return false; }

		let task = Collections.Tasks.findOne(timecard.taskId);
		if (!task) { return false; }

		// TODO: check validty and rights

		Collections.Timecards.update(timecardId, {
			$set: { status: Collections.UserEntryStatus.APPROVED }
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.ENTRY_APPROVED,
			relatedObjects: [
				{ collectionName: 'Timecards', id: timecardId },
			],
			projectId: task.projectId,
		});

		return true;
	},
	'timecard.syncStatus'(timecardId: string, status: Collections.SynchronizationStatus, comments: string) {
		let timecard = Collections.Timecards.findOne(timecardId);
		if (!timecard) { return false; }

		Collections.Timecards.update(timecardId, {
			$set: { syncStatus: status, syncComments: comments }
		});

		return true;
	},

	// this is used to validate timecard begin and end times
	// this is done against existing timecards from the current user (or another one specified)
	// do not call this too frequently; use for data entry only
	// will return true if insertion possible
	'timecard.validateTimes'(year: number, month: number, day: number, start: number, end: number, excludeCardId?: string, userId?: string) {
		let cards = Collections.Timecards.find({
			userId: userId || Meteor.userId(),
			year,
			month,
			day,
			repeating: false,
		}).fetch().filter(c => c._id != excludeCardId);

		let validTimes = UserEntryTools.attemptTimecardPosition(cards, start, end, false, false);

		if (validTimes) { return true; }

		console.log('times invalid');
		return false;
	},


	// EXPENSES

	//'expense.new'(year: number, month: number, day: number, projectId?: string, userId?: string) {
	'expense.new'(values: Object, userId?: string) {

		// TODO: check validty and rights

		let v: any = Object.assign({}, values);
		v.status = Collections.UserEntryStatus.DRAFT;
		// v.userId = userId || Meteor.userId();

		Collections.Expenses.insert(v);
		return true;
	},
	'expense.update'(expenseId: string, newValues: Object) {
		delete newValues['_id'];	// temp!

		// TODO: check validty and rights

		Collections.Expenses.update(expenseId, {
			$set: newValues
		});

		return true;
	},
	'expense.delete'(expenseId: string) {

		// TODO: check validty and rights

		Collections.Expenses.remove(expenseId);
		return true;
	},
	'expense.submit'(expenseId: string) {
		let expense = Collections.Expenses.findOne(expenseId);
		if (!expense) { return false; }

		// TODO: check validty and rights

		Collections.Expenses.update(expenseId, {
			$set: { status: Collections.UserEntryStatus.SUBMITTED }
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.ENTRY_SUBMITTED,
			relatedObjects: [
				{ collectionName: 'Expenses', id: expenseId },
			],
			projectId: expense.projectId,
		});

		return true;
	},
	'expense.approve'(expenseId: string) {
		let expense = Collections.Expenses.findOne(expenseId);
		if (!expense) { return false; }

		// TODO: check validty and rights

		Collections.Expenses.update(expenseId, {
			$set: { status: Collections.UserEntryStatus.APPROVED }
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.ENTRY_APPROVED,
			relatedObjects: [
				{ collectionName: 'Expenses', id: expenseId },
			],
			projectId: expense.projectId,
		});

		return true;
	},
	'expense.syncStatus'(expenseId: string, status: Collections.SynchronizationStatus, comments: string) {
		let expense = Collections.Expenses.findOne(expenseId);
		if (!expense) { return false; }

		Collections.Expenses.update(expenseId, {
			$set: { syncStatus: status, syncComments: comments }
		});

		return true;
	},


	// PROJECT AND TASK MANAGEMENT

	// this will update the delivered time stat on the task
	// this is denormalized data and a such, bypasses existing hooks
	'task.updateTime'(taskId) {
		let task = Collections.Tasks.findOne(taskId);
		if (!task) {
			return false;
		}

		// fetch all timecards for this task and compute time totals
        let hoursApproved = 0;
        let hoursSubmitted = 0;
        let hoursAsDraft = 0;
        let hoursPlanned = 0;
		let cards = Collections.Timecards.find({ taskId, repeating: false });

		// recompute delivered time and update object
		cards.forEach(card => {
            switch (card.status) {
                case Collections.UserEntryStatus.APPROVED:
                    hoursApproved += (card.end - card.start); break;
                case Collections.UserEntryStatus.SUBMITTED:
                    hoursSubmitted += (card.end - card.start); break;
                case Collections.UserEntryStatus.DRAFT:
                    if (UserEntryTools.isFutureEntry('timecard', card.year, card.month, card.day, card.end)) {
                        hoursPlanned += (card.end - card.start); break;
                    }
                    hoursAsDraft += (card.end - card.start); break;
                case Collections.UserEntryStatus.CONFLICTING:
                    hoursAsDraft += (card.end - card.start); break;
            }
        });

		// denormalize budget constrain flag
		let hoursBudgetConstrained = false;
		let line;
		if (task.salesOrderLineId && (line = Collections.SalesOrderLines.findOne(task.salesOrderLineId))) {
			hoursBudgetConstrained = line.hoursBudgetConstrained;
		}

        // update task
		Collections.Tasks.direct.update(task._id, {
			$set: {
                hoursApproved,
                hoursSubmitted,
                hoursAsDraft,
                hoursPlanned,
                hoursBudgetConstrained,
                hoursRemaining: Math.max(task.totalTime-(hoursApproved+hoursSubmitted+hoursAsDraft+hoursPlanned),0),
			}
		});

		return true;
	},

    // this will refresh tasks order indices, ie make sure they will be
    // correctly ordered from 0 to count-1
    'project.refreshTaskOrder'(projectId) {
        let tasks = Collections.Tasks.find({ projectId }).fetch()
            .sort(Tools.getSortFunctionByProp('orderIndex'))
            .forEach((task, index) => {
                Collections.Tasks.direct.update(task._id, { $set: { orderIndex: index } } );
            })
    },

    // this will refresh the list of employees assigned as external resources on a task
    // this method must be called on IntercompanyAgreements post event hooks!
    'task.refreshExternalResources'(taskId) {
        let task = Collections.Tasks.findOne(taskId);

        // get approved agreements (remove dupes)
        let assignedExternalResources = Collections.IntercompanyAgreements.find({
        	taskId,
        }).fetch().map(agreement => agreement.employeeId)
        .filter((id, index, array) => array.indexOf(id) == index);

        // update the project
        Collections.Tasks.direct.update(taskId, {
        	$set: {
        		assignedExternalResources
        	}
        });
    },

    // intercompany agreements approval
	'intercompany.agreements.approve'(agreementId: string) {
		let agreement = Collections.IntercompanyAgreements.findOne(agreementId);
		if (!agreement) { return false; }

		// TODO: check validty and rights

		Collections.IntercompanyAgreements.update(agreementId, {
			$set: { isApproved: true }
		});

		// create log entry
		Collections.LogEntries.insert({
			userId: Meteor.userId(),
			action: Collections.LogActions.ENTRY_APPROVED,
			relatedObjects: [
				{ collectionName: 'IntercompanyAgreements', id: agreementId },
			],
			projectId: agreement.projectId,
		});

		return true;
	},

	'intercompany.agreements.refresh'({ taskId, employeeId }) {
		let agreement = Collections.IntercompanyAgreements.findOne({
			taskId,
			employeeId,
			isApproved: true,
			// hoursRemaining: { $gt: 0 }
		});
		if (!agreement) { return false; }

		let employee = Collections.Employees.findOne(employeeId);
		if (!employee) { return false; }

		let timecards = Collections.Timecards.find({
			userId: employee.userId,
			taskId: taskId,
			$or: [
				{ agreementId: null, },
				{ agreementId: '', },
				{ agreementId: agreement._id, }
			],
			repeating: false,
		}).fetch();

		// sum
		let hoursRemaining = agreement.hoursAmount;
		timecards.forEach(t => hoursRemaining = Math.max(0, hoursRemaining - (t.end - t.start)));

		// update agreement
		Collections.IntercompanyAgreements.direct.update(agreement._id, { $set: { hoursRemaining } });

		// update timecards
		Collections.Timecards.direct.update({
			_id: {
				$in: timecards.map(t => t._id)
			}
		}, { $set: { agreementId: agreement._id } }, {multi: true});

		return true;
	},

	// UTILS

	// return a color based on a unique id, returns { r, g, b }, values [0,255]
	// todo: implement user-specific settings
	'color.generate'(uniqueId: string) {
		let hashCode = 0;
		for (let i = 0; i < uniqueId.length; i++) {
			hashCode += uniqueId.charCodeAt(i) + ((hashCode << 5) - hashCode);
		}

		// normalize
		hashCode *= 0.001;
		hashCode -= Math.floor(hashCode);

		return ColorTools.getRandomColor(hashCode, 0.87, 0.89);
	},

	// same in batch
	// returns an array of {id, color {r, g, b}}
	'color.generate.batch'(uniqueIds: string[]) {
		let results = [];
		for (let i = 0; i < uniqueIds.length; i++) {
			results.push({
				id: uniqueIds[i],
				color: Meteor.call('color.generate', uniqueIds[i]),
			});
		}

		return results;
	},

});