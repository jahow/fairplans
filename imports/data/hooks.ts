import * as Collections from './collections';


// TASK & EXPENSE HOOKS
// denormalize project name, partner name and company name
// allow easier UI rendering without having to query multiple collections

let denormalizeProjectInsert = (userId, doc) => {
	let project = Collections.Projects.findOne(doc.projectId) || {} as any;
	let partner = Collections.Partners.findOne({
		code: project.partnerCode,
		companyCode: project.companyCode
	}) || {} as any;
	let company = Collections.Companies.findOne({ code: project.companyCode }) || {} as any;

	doc.projectName = project.name;
	doc.partnerName = partner.name;
	doc.partnerCode = partner.code;
	doc.companyName = company.name;
	doc.companyCode = company.code;
	
	return true;
};
let denormalizeProjectUpdate = (userId, doc, fieldNames, modifier: any, options) => {
	modifier.$set = modifier.$set || {};
	let project = Collections.Projects.findOne(doc.projectId) || {} as any;
	let partner = Collections.Partners.findOne({
		code: project.partnerCode,
		companyCode: project.companyCode
	}) || {} as any;
	let company = Collections.Companies.findOne({ code: project.companyCode }) || {} as any;

	modifier.$set.projectName = project.name;
	modifier.$set.partnerName = partner.name;
	modifier.$set.partnerCode = partner.code;
	modifier.$set.companyName = company.name;
	modifier.$set.companyCode = company.code;
	
	return true;
};

Collections.Tasks.before.insert(denormalizeProjectInsert);
Collections.Expenses.before.insert(denormalizeProjectInsert);

Collections.Tasks.before.update(denormalizeProjectUpdate);
Collections.Expenses.before.update(denormalizeProjectUpdate);



// LOG ENTRIES SYSTEM

function createLogEntryOnInsert(collectionName: string) {
	return function (userId, doc) {
		let companyCode = doc.companyCode;
		if (!companyCode && collectionName == 'Companies') {
			companyCode = doc.code;
		}
		if (!companyCode && collectionName == 'Tasks') {
			let project = Collections.Projects.findOne(doc.projectId);
			companyCode = project && project.companyCode;
		}

		Collections.LogEntries.insert({
			userId,
			action: Collections.LogActions.OBJECT_CREATED,
			relatedObjects: [
				{ collectionName, id: this._id }
			],
			companyCode,
		});
	};
}
function createLogEntryOnUpdate(collectionName: string) {
	return function (userId, doc, fieldNames, modifier: any, options) {
		let companyCode = doc.companyCode;
		if (!companyCode && collectionName == 'Companies') {
			companyCode = doc.code;
		}
		if (!companyCode && collectionName == 'Tasks') {
			let project = Collections.Projects.findOne(doc.projectId);
			companyCode = project && project.companyCode;
		}

		Collections.LogEntries.insert({
			userId,
			action: Collections.LogActions.OBJECT_UPDATED,
			relatedObjects: [
				{ collectionName, id: doc._id }
			],
			companyCode,
		});
	};
}
function createLogEntryOnRemove(collectionName: string) {
	return function (userId, doc) {
		let companyCode = doc.companyCode;
		if (!companyCode && collectionName == 'Companies') {
			companyCode = doc.code;
		}
		if (!companyCode && collectionName == 'Tasks') {
			let project = Collections.Projects.findOne(doc.projectId);
			companyCode = project && project.companyCode;
		}

		Collections.LogEntries.insert({
			userId,
			action: Collections.LogActions.OBJECT_REMOVED,
			relatedObjects: [
				{ collectionName, id: doc._id }
			],
			companyCode,
		});
	};
}

// log on object actions
Collections.Companies.after.insert(createLogEntryOnInsert('Companies'));
Collections.Companies.after.update(createLogEntryOnUpdate('Companies'));
Collections.Companies.after.remove(createLogEntryOnRemove('Companies'));
Collections.Products.after.insert(createLogEntryOnInsert('Products'));
Collections.Products.after.update(createLogEntryOnUpdate('Products'));
Collections.Products.after.remove(createLogEntryOnRemove('Products'));
Collections.Partners.after.insert(createLogEntryOnInsert('Partners'));
Collections.Partners.after.update(createLogEntryOnUpdate('Partners'));
Collections.Partners.after.remove(createLogEntryOnRemove('Partners'));
Collections.Projects.after.insert(createLogEntryOnInsert('Projects'));
Collections.Projects.after.update(createLogEntryOnUpdate('Projects'));
Collections.Projects.after.remove(createLogEntryOnRemove('Projects'));
Collections.Tasks.after.insert(createLogEntryOnInsert('Tasks'));
Collections.Tasks.after.update(createLogEntryOnUpdate('Tasks'));
Collections.Tasks.after.remove(createLogEntryOnRemove('Tasks'));
Collections.SalesOrders.after.insert(createLogEntryOnInsert('SalesOrders'));
Collections.SalesOrders.after.update(createLogEntryOnUpdate('SalesOrders'));
Collections.SalesOrders.after.remove(createLogEntryOnRemove('SalesOrders'));
Collections.SalesOrderLines.after.insert(createLogEntryOnInsert('SalesOrderLines'));
Collections.SalesOrderLines.after.update(createLogEntryOnUpdate('SalesOrderLines'));
Collections.SalesOrderLines.after.remove(createLogEntryOnRemove('SalesOrderLines'));
Collections.Employees.after.insert(createLogEntryOnInsert('Employees'));
Collections.Employees.after.update(createLogEntryOnUpdate('Employees'));
Collections.Employees.after.remove(createLogEntryOnRemove('Employees'));
Collections.EmployeeGroups.after.insert(createLogEntryOnInsert('EmployeeGroups'));
Collections.EmployeeGroups.after.update(createLogEntryOnUpdate('EmployeeGroups'));
Collections.EmployeeGroups.after.remove(createLogEntryOnRemove('EmployeeGroups'));
Collections.EmployeeRoles.after.insert(createLogEntryOnInsert('EmployeeRoles'));
Collections.EmployeeRoles.after.update(createLogEntryOnUpdate('EmployeeRoles'));
Collections.EmployeeRoles.after.remove(createLogEntryOnRemove('EmployeeRoles'));
Collections.EmployeeSkills.after.insert(createLogEntryOnInsert('EmployeeSkills'));
Collections.EmployeeSkills.after.update(createLogEntryOnUpdate('EmployeeSkills'));
Collections.EmployeeSkills.after.remove(createLogEntryOnRemove('EmployeeSkills'));
Collections.ExpenseTypes.after.insert(createLogEntryOnInsert('ExpenseTypes'));
Collections.ExpenseTypes.after.update(createLogEntryOnUpdate('ExpenseTypes'));
Collections.ExpenseTypes.after.remove(createLogEntryOnRemove('ExpenseTypes'));