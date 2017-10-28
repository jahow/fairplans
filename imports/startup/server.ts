import * as React from 'react';
import { Meteor } from 'meteor/meteor';
import * as Collections from '../data/collections';
import { Random } from 'meteor/random';

import { Tools, QueryTools } from '../utils/tools'

import './analytics';
import './methods';
import './serverMethods';
import '../data/hooks';


Meteor.startup(() => {

	// default expense types
	if (Collections.ExpenseTypes.find().count() == 0) {
		Collections.ExpenseTypes.insert({ name: 'mileage', productCode: 'EXP_MILEAGE' });
		Collections.ExpenseTypes.insert({ name: 'meal', productCode: 'EXP_MEAL' });
		Collections.ExpenseTypes.insert({ name: 'hotel', productCode: 'EXP_HOTEL' });
		Collections.ExpenseTypes.insert({ name: 'transport', productCode: 'EXP_TRANSPORT' });
		Collections.ExpenseTypes.insert({ name: 'misc', productCode: 'EXP_MISC' });
	}

	// publish

	// timecards are fetched by date or id
	Meteor.publish("timecards.list", function() {
		if (!this.userId) { return this.ready(); }

		return Collections.Timecards.find();
	});
	Meteor.publish("timecards.day", function({ year, month, day, userId }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			year: {type: Number},
			month: {type: Number},
			day: {type: Number, optional: true},
			userId: {type: String, optional: true},
		}).validate({ year, month, day, userId });

		let baseQuery = { year, month, repeating: false } as any;
		if (day !== undefined) { baseQuery.day = day; }
		if (userId !== undefined) { baseQuery.userId = userId; }
		// else { baseQuery.userId = this.userId; }

		let query = baseQuery;

		if (day !== undefined) {
			query = {
				$or: [
					baseQuery,
					QueryTools.getRepeatingCardInstances(year, month, day, userId)
				]
			};
		}

		return [
			Collections.Timecards.find(query),
			Collections.Tasks.find(),
		];
	});
	Meteor.publish("timecards.id", function({ card_id }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			card_id: {type: String}
		}).validate({ card_id });

		return Collections.Timecards.find({ _id: card_id });
	});
	Meteor.publish("timecards.user.overview", function({ userId }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			userId: {type: String}
		}).validate({ userId });

		let timecardsCursor = Collections.Timecards.find({ userId });
		let timecards = timecardsCursor.fetch();
		let taskIds = [];
		let projectIds = [];
		timecards.forEach(card => {
			if (card.projectId && projectIds.indexOf(card.projectId) == -1) {
				projectIds.push(card.projectId);
			}
			if (card.taskId && taskIds.indexOf(card.taskId) == -1) {
				taskIds.push(card.taskId);
			}
		});

		return [
			timecardsCursor,
			Collections.Tasks.find({
				_id: {
					$in: taskIds
				}
			}),
			Collections.Projects.find({
				_id: {
					$in: projectIds
				}
			}),
		];
	});


	// EXPENSES
	Meteor.publish("expenses.list", function() {
		if (!this.userId) { return this.ready(); }

		return [
			Collections.Expenses.find(),
			Collections.ExpenseTypes.find(),
		];
	});
	Meteor.publish("expenses.day", function({ year, month, day, userId }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			year: {type: Number},
			month: {type: Number},
			day: {type: Number, optional: true},
			userId: {type: String, optional: true},
		}).validate({ year, month, day, userId });

		let baseQuery = { year, month } as any;
		if (day !== undefined) { baseQuery.day = day; }
		if (userId !== undefined) { baseQuery.userId = userId; }
		// else { baseQuery.userId = this.userId; }

		let query = baseQuery;

		return [
			Collections.Expenses.find(query),
			Collections.ExpenseTypes.find(),
		];
	});
	Meteor.publish("expenses.id", function({ card_id }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			card_id: {type: String}
		}).validate({ card_id });

		return Collections.Expenses.find({ _id: card_id });
	});


	// PROJECTS

	Meteor.publish("projects.list", function(userId?: string) {
		if (!this.userId) { return this.ready(); }

		// check that we can see the tasks of this user
		if (userId && userId != this.userId) {
			let currentEmployee = Collections.Employees.findOne({ userId: this.userId });
			let otherEmployee = Collections.Employees.findOne({ userId });
			if (!currentEmployee || !otherEmployee || otherEmployee.managerId != currentEmployee._id) { return this.ready(); }
		}

		let projectQuery = QueryTools.getProjectRestrictionQuery(userId || this.userId);
		if (!projectQuery) { return this.ready(); }

		return Collections.Projects.find(projectQuery);
	});
	Meteor.publish("projects.id", function({ projectId }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			projectId: {type: String}
		}).validate({ projectId });

		let projectQuery = QueryTools.getProjectRestrictionQuery(this.userId);
		if (!projectQuery) { return this.ready(); }

		// add parameters
		projectQuery._id = projectId;

		return Collections.Projects.find(projectQuery);
	});
	Meteor.publish("projects.code", function({ projectCode, companyCode }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			projectCode: {type: String},
			companyCode: {type: String}
		}).validate({ projectCode, companyCode });

		let projectQuery = QueryTools.getProjectRestrictionQuery(this.userId);
		if (!projectQuery) { return this.ready(); }

		// add parameters
		projectQuery.projectCode = projectCode;
		projectQuery.companyCode = companyCode;

		return Collections.Projects.find(projectQuery);
	});
	Meteor.publish("projects.management", function({ projectId }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			projectId: {type: String},
			//companyCode: {type: String}
		}).validate({ projectId });

		let projectQuery = QueryTools.getProjectRestrictionQuery(this.userId);
		if (!projectQuery) { return this.ready(); }

		// add parameters
		projectQuery._id = projectId;

		// find project
		let project = Collections.Projects.findOne(projectQuery);
		if (!project) { return this.ready(); }

		return [
			Collections.Projects.find(projectQuery),
			Collections.Partners.find({ code: project.partnerCode, companyCode: project.companyCode }),
			Collections.Companies.find({ code: project.companyCode }),
			Collections.SalesOrders.find({ projectCode: project.code, companyCode: project.companyCode }),
			Collections.SalesOrderLines.find({ projectCode: project.code, companyCode: project.companyCode }),
			Collections.Tasks.find({ projectId }),
			Collections.Milestones.find({ projectId }),
			Collections.IntercompanyAgreements.find({ projectId }),
		];
	});
	Meteor.publish("project.creation", function() {
		if (!this.userId) { return this.ready(); }

		return [
			Collections.Partners.find(),
			Collections.Companies.find(),
		];
	});


	// TASKS
	Meteor.publish("tasks.list", function(userId?: string) {
		if (!this.userId) { return this.ready(); }

		// check that we can see the tasks of this user
		if (userId && userId != this.userId) {
			let currentEmployee = Collections.Employees.findOne({ userId: this.userId });
			let otherEmployee = Collections.Employees.findOne({ userId });
			if (!currentEmployee || !otherEmployee || otherEmployee.managerId != currentEmployee._id) {
				return this.ready();
			}
		}

		let taskQuery = QueryTools.getTaskRestrictionQuery(userId || this.userId);
		if (!taskQuery) { return this.ready(); }

		return [
			Collections.Tasks.find(taskQuery),
		];
	});


	// EMPLOYEES
	Meteor.publish("employees.me", function() {
		if (!this.userId) { return this.ready(); }

		return [
			Collections.Employees.find({ userId: this.userId }, { limit: 1 }),
		];
	});
	Meteor.publish("employees.management", function() {
		if (!this.userId) { return this.ready(); }

		let employeeQuery = QueryTools.getEmployeeRestrictionQuery(this.userId);
		if (employeeQuery === null) { return this.ready(); }

		return [
			Collections.Projects.find(),
			Collections.Employees.find(employeeQuery),
			Collections.Companies.find(),
			Collections.EmployeeGroups.find(),
			Collections.EmployeeRoles.find(),
		];
	});
	Meteor.publish("employees.list", function() {
		if (!this.userId) { return this.ready(); }

		let employeeQuery = QueryTools.getEmployeeRestrictionQuery(this.userId);
		if (employeeQuery === null) { return this.ready(); }

		return [
			Collections.Employees.find(employeeQuery),
			Collections.EmployeeGroups.find(),
			Collections.EmployeeRoles.find(),
			Collections.EmployeeSkills.find(),
		];
	});
	Meteor.publish("employeegroups.list", function() {
		if (!this.userId) { return this.ready(); }

		let employeeQuery = QueryTools.getEmployeeRestrictionQuery(this.userId);
		if (employeeQuery === null) { return this.ready(); }

		return [
			Collections.Employees.find(employeeQuery),
			Collections.EmployeeGroups.find(),
		];
	});


	// PARTNERS
	Meteor.publish("partners", function() {
		if (!this.userId) { return this.ready(); }

		return [
			Collections.Partners.find(),
			Collections.Companies.find(),
		];
	});
	Meteor.publish("partners.id", function({ partner_id }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			partner_id: {type: String}
		}).validate({ partner_id });

		return Collections.Partners.find({ _id: partner_id });
	});
	Meteor.publish("partners.code", function({ project_code, company_code }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			project_code: {type: String},
			company_code: {type: String}
		}).validate({ project_code, company_code });

		return Collections.Partners.find({ project_code, company_code });
	});

	// PRODUCTS
	Meteor.publish("products", function() {
		if (!this.userId) { return this.ready(); }

		return [
			Collections.Products.find(),
			Collections.Companies.find(),
		];
	});

	// COMPANIES
	Meteor.publish("companies", function() {
		if (!this.userId) { return this.ready(); }

		return Collections.Companies.find();
	});
	Meteor.publish("companies.code", function({ code }) {
		if (!this.userId) { return this.ready(); }

		new SimpleSchema({
			code: {type: String}
		}).validate({ code });

		return Collections.Companies.find({ code });
	});

	// LOGS
	Meteor.publish('logs', function() {
		if (!this.userId) { return this.ready(); }

		// TODO: filter on project and company

		return Collections.LogEntries.find();
	});

	// CURRENT EMPLOYEE
	Meteor.publish('current.employee', function() {
		if (!this.userId) { return this.ready(); }

		return [
			Collections.Employees.find({ userId: this.userId }),
			Collections.EmployeeRoles.find(),
		];
	});

	// INTERCOMPANY AGREEMENTS
	// subscription is based on employeeId OR managerId
	Meteor.publish("intercompany.agreements", function({ employeeId, managerId, projectId }) {
		if (!this.userId) { return this.ready(); }

		// user is admin: return all agreements
		let user = Meteor.users.findOne(this.userId);
		if (user.profile && user.profile.isAdmin) {
			return Collections.IntercompanyAgreements.find();
		}

		// a project is specified: return a simple query
		if (projectId) {
			return Collections.IntercompanyAgreements.find({ projectId });
		}

		// if an employee id is supplied, filter on it
		// otherwise, filter on employees managed by the specified manager
		let employeeIds = [];
		if (!employeeId && managerId) {
			let managedEmployees = Collections.Employees.find({ managerId }).fetch();
			employeeIds = employeeIds.concat(managedEmployees.map(e => e._id));
		} else {
			employeeIds.push(employeeId);
		}

		return Collections.IntercompanyAgreements.find({
			employeeId: {
				$in: employeeIds
			}
		});
	});


	// default users
	if(!Accounts.findUserByUsername('admin')) {
	    Accounts.createUser({
	        username: 'admin',
	        email: 'admin@rapidos.com',
	        password: 'password',
	        profile: {
	        	name: 'Administrateur',
	        	isAdmin: true,
	        }
	    });
	}

	// accounts settings 
	Accounts.urls.enrollAccount = function (token) {
		return Meteor.absoluteUrl('enroll/' + token);
	};

	// default roles
	if (!Collections.EmployeeRoles.find({ isAdmin: true }).count()) {
		Collections.EmployeeRoles.insert({
			isAdmin: true,
			name: 'admin',
			canSeeAllCompanies: true,
			canSeeAllEmployees: true,
		});
	}
});