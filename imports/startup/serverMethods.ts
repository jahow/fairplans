import * as Collections from '../data/collections';
import { Tools, UserEntryTools, DateTools } from '../utils/tools';
import ColorTools from '../utils/color';


const checkOperationAllowed = (collectionName: string, operation: Collections.CollectionOperation) => {
    if (!Meteor.call('can.do', collectionName, operation)) {
        // console.log('operation not allowed: ' + operation + ' for collection ' + collectionName + '.');
        throw new Meteor.Error('operation-not-allowed', 'Operation not allowed.');
    }
}


Meteor.methods({

    // PERMISSIONS

    // check permissions for this operation
    'can.do'(collectionName: string, operation: Collections.CollectionOperation) {
        
        // get user, employee and role
        let userId = Meteor.userId();
        if (!userId) { return false; }
        let user = Meteor.user() || {};
        if (user.profile && user.profile.isAdmin) { return true; }

        let employee = Collections.Employees.findOne({ userId });
        if (!employee) { return false; }

        let role = Collections.EmployeeRoles.findOne(employee.roleId);
        if (!role) { return false; }

        // check permission
        if (role.isAdmin) { return true; }

        let prop = '';
        switch (operation) {
            case Collections.CollectionOperation.INSERT: prop = 'canInsert'; break;
            case Collections.CollectionOperation.UPDATE: prop = 'canUpdate'; break;
            case Collections.CollectionOperation.REMOVE: prop = 'canRemove'; break;
            default: return false;
        }

        return role[prop] && role[prop].indexOf(collectionName) > -1;
    },


    // GENERAL OBJECT MANIPULATION

    'product.create'(values) {
        checkOperationAllowed('Products', Collections.CollectionOperation.INSERT);
        Collections.Products.insert(values);
    },
    'product.update'({ productId, newValues }) {
        checkOperationAllowed('Products', Collections.CollectionOperation.UPDATE);
        Collections.Products.update(productId, { $set: newValues });
    },
    'product.delete'(productId) {
        // TODO : consistency check

        checkOperationAllowed('Products', Collections.CollectionOperation.REMOVE);
        Collections.Products.remove(productId);
    },

    'partner.create'(values) {
        checkOperationAllowed('Partners', Collections.CollectionOperation.INSERT);
        Collections.Partners.insert(values);
    },
    'partner.update'({ partnerId, newValues }) {
        checkOperationAllowed('Partners', Collections.CollectionOperation.UPDATE);
        Collections.Partners.update(partnerId, { $set: newValues });
    },
    'partner.delete'(partnerId) {
        // TODO : consistency check

        checkOperationAllowed('Partners', Collections.CollectionOperation.REMOVE);
        Collections.Partners.remove(partnerId);
    },

    'employee.create'(values) {
        checkOperationAllowed('Employees', Collections.CollectionOperation.INSERT);
        Collections.Employees.insert(values);
    },
    'employee.update'({ employeeId, newValues }) {
        checkOperationAllowed('Employees', Collections.CollectionOperation.UPDATE);
        Collections.Employees.update(employeeId, { $set: newValues });
    },
    'employee.delete'(employeeId) {
        // TODO : consistency check

        checkOperationAllowed('Employees', Collections.CollectionOperation.REMOVE);
        Collections.Employees.remove(employeeId);
    },

    'group.create'(values) {
        checkOperationAllowed('EmployeeGroups', Collections.CollectionOperation.INSERT);
        Collections.EmployeeGroups.insert(values);
    },
    'group.update'({ groupId, newValues }) {
        checkOperationAllowed('EmployeeGroups', Collections.CollectionOperation.UPDATE);
        Collections.EmployeeGroups.update(groupId, { $set: newValues });
    },
    'group.delete'(groupId) {
        // TODO : consistency check

        checkOperationAllowed('EmployeeGroups', Collections.CollectionOperation.REMOVE);
        Collections.EmployeeGroups.remove(groupId);
    },

    'company.create'(values) {
        checkOperationAllowed('Companies', Collections.CollectionOperation.INSERT);
        Collections.Companies.insert(values);
    },
    'company.update'({ companyId, newValues }) {
        checkOperationAllowed('Companies', Collections.CollectionOperation.UPDATE);
        Collections.Companies.update(companyId, { $set: newValues });
    },
    'company.delete'(companyId) {
        // TODO : consistency check

        checkOperationAllowed('Companies', Collections.CollectionOperation.REMOVE);
        Collections.Companies.remove(companyId);
    },

    'project.create'(values) {
        checkOperationAllowed('Projects', Collections.CollectionOperation.INSERT);
        Collections.Projects.insert(values);
    },
    'project.update'({ projectId, newValues }) {
        checkOperationAllowed('Projects', Collections.CollectionOperation.UPDATE);
        Collections.Projects.update(projectId, { $set: newValues });
    },
    'project.delete'(projectId) {
        // TODO : consistency check

        checkOperationAllowed('Projects', Collections.CollectionOperation.REMOVE);
        Collections.Projects.remove(projectId);
    },

    'task.create'(values) {
        checkOperationAllowed('Tasks', Collections.CollectionOperation.INSERT);
        Collections.Tasks.insert(values);
    },
    'task.update'({ taskId, newValues }) {
        checkOperationAllowed('Tasks', Collections.CollectionOperation.UPDATE);
        Collections.Tasks.update(taskId, { $set: newValues });
    },
    'task.delete'(taskId) {
        // TODO : consistency check

        checkOperationAllowed('Tasks', Collections.CollectionOperation.INSERT);
        Collections.Tasks.remove(taskId);
    },

    'milestone.create'(values) {
        checkOperationAllowed('Milestones', Collections.CollectionOperation.INSERT);
        Collections.Milestones.insert(values);
    },
    'milestone.update'({ milestoneId, newValues }) {
        checkOperationAllowed('Milestones', Collections.CollectionOperation.UPDATE);
        Collections.Milestones.update(milestoneId, { $set: newValues });
    },
    'milestone.delete'(milestoneId) {
        // TODO : consistency check

        checkOperationAllowed('Milestones', Collections.CollectionOperation.REMOVE);
        Collections.Milestones.remove(milestoneId);
    },

    'employeeRole.create'(values) {
        checkOperationAllowed('EmployeeRoles', Collections.CollectionOperation.INSERT);
        Collections.EmployeeRoles.insert(values);
    },
    'employeeRole.update'({ employeeRoleId, newValues }) {
        checkOperationAllowed('EmployeeRoles', Collections.CollectionOperation.UPDATE);
        Collections.EmployeeRoles.update(employeeRoleId, { $set: newValues });
    },
    'employeeRole.delete'(employeeRoleId) {
        // TODO : consistency check

        checkOperationAllowed('EmployeeRoles', Collections.CollectionOperation.REMOVE);
        Collections.EmployeeRoles.remove(employeeRoleId);
    },

    // temp
    'salesorderline.create'(values: Collections.SalesOrderLine) {
        checkOperationAllowed('SalesOrderLines', Collections.CollectionOperation.INSERT);
        Collections.SalesOrderLines.insert(values);
    },
    'salesorderline.update'({ lineId, newValues }) {
        checkOperationAllowed('SalesOrderLines', Collections.CollectionOperation.UPDATE);
        Collections.SalesOrderLines.update(lineId, { $set: newValues });
    },
    'salesorderline.delete'(lineId) {
        // TODO : consistency check

        checkOperationAllowed('SalesOrderLines', Collections.CollectionOperation.REMOVE);
        Collections.SalesOrderLines.remove(lineId);
    },

    'intercompany.agreement.create'(values: Collections.IntercompanyAgreement) {
        checkOperationAllowed('IntercompanyAgreements', Collections.CollectionOperation.INSERT);
        Collections.IntercompanyAgreements.insert(values);
    },
    'intercompany.agreement.update'({ agreementId, newValues }) {
        checkOperationAllowed('IntercompanyAgreements', Collections.CollectionOperation.UPDATE);
        Collections.IntercompanyAgreements.update(agreementId, { $set: newValues });
    },
    'intercompany.agreement.delete'(agreementId) {
        // TODO : consistency check

        checkOperationAllowed('IntercompanyAgreements', Collections.CollectionOperation.REMOVE);
        Collections.IntercompanyAgreements.remove(agreementId);
    },


});