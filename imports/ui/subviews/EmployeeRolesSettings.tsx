import * as React from 'react';
import { render } from 'react-dom';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Tools, DateTools } from '../../utils/tools';
import { EmployeeRoles, EmployeeRole } from '../../data/collections';
import { createContainer } from 'meteor/react-meteor-data';
import ReactModal2 from 'react-modal2';

import ToggleIcon from '../controls/ToggleIcon';
import FormInput from '../controls/FormInput';
import ExtendedTable from '../controls/ExtendedTable';

import { TAPi18n as i18n } from 'meteor/tap:i18n';


interface props {
	employeeRoles: EmployeeRole[],
	onClose: () => any,
}
interface state {
	currentValues?: EmployeeRole[],	// roles currently under edition
	deletedRoles?: string[],
}

class EmployeeRolesSettings extends Component<props, state> {

	constructor(props) {
		super(props);

		// transfer roles to state
		this.state = {
			currentValues: this.props.employeeRoles,
			deletedRoles: [],
		};

		this.handleClickSave = this.handleClickSave.bind(this);
		this.handleNewRole = this.handleNewRole.bind(this);
		this.handleRoleNameChange = this.handleRoleNameChange.bind(this);
		this.handleRoleAttributeChange = this.handleRoleAttributeChange.bind(this);
		this.handleRoleCollectionPermissionChange = this.handleRoleCollectionPermissionChange.bind(this);
		this.handleDeleteRole = this.handleDeleteRole.bind(this);
	}

	handleClickSave() {
		// create or update roles according to edited values
		for (let i = 0; i < this.state.currentValues.length; i++) {
			let id = this.state.currentValues[i]._id;
			let newValues;

			if (id) {
				newValues = Object.assign({}, this.state.currentValues[i]);
				delete newValues._id;
				Meteor.call('employeeRole.update', { employeeRoleId: id, newValues });
			} else {
				Meteor.call('employeeRole.create', this.state.currentValues[i]);
			}
		}

		// remove deleted roles
		for (let i = 0; i < this.state.deletedRoles.length; i++) {
			Meteor.call('employeeRole.delete', this.state.deletedRoles[i]);
		}

		// close the window
		this.props.onClose();
	}

	handleNewRole() {
		let currentValues = this.state.currentValues;
		currentValues.push({
			name: 'new role'
		});
		this.setState({ currentValues });
	}

	handleRoleNameChange(roleIndex, newVal) {
		let currentValues = this.state.currentValues;
		currentValues[roleIndex].name = newVal;
		this.setState({ currentValues });
	}

	handleRoleAttributeChange(roleIndex: number, attrName: string) {
		let currentValues = this.state.currentValues;
		currentValues[roleIndex][attrName] = !currentValues[roleIndex][attrName];
		this.setState({ currentValues });
	}

	handleRoleCollectionPermissionChange(roleIndex: number, collectionName: string, isAdd: boolean, isUpdate: boolean, isDelete: boolean, otherCompanies: boolean) {
		let currentValues = this.state.currentValues;

		let arrayName;
		if (isAdd) { arrayName = 'canInsert'; }
		if (isUpdate) { arrayName = 'canUpdate'; }
		if (isDelete) { arrayName = 'canRemove'; }
		if (isAdd && otherCompanies) { arrayName = 'canInsertOutsideCompany'; }
		if (isUpdate && otherCompanies) { arrayName = 'canUpdateOutsideCompany'; }
		if (isDelete && otherCompanies) { arrayName = 'canRemoveOutsideCompany'; }

		if (!currentValues[roleIndex][arrayName]) {
			currentValues[roleIndex][arrayName] = [];
		}
		let array = currentValues[roleIndex][arrayName];

		let index = array.indexOf(collectionName);
		let enabled = index > -1;
		if (enabled) {
			array.splice(index, 1);
		} else {
			array.push(collectionName);
		}

		this.setState({ currentValues });
	}

	handleDeleteRole(roleIndex: number) {
		let roleId = this.state.currentValues[roleIndex]._id;
		let deletedRoles = this.state.deletedRoles;
		let currentValues = this.state.currentValues;

		// remove from current values
		currentValues.splice(roleIndex, 1);

		// save removed id to apply when finished
		if (roleId) {
			deletedRoles.push(roleId);
		}

		this.setState({ deletedRoles, currentValues });
	}

	checkPermission(role: EmployeeRole, collection: string, canAdd: boolean, canUpdate: boolean, canDelete: boolean, otherCompanies?: boolean) {
		let array;
		if (canAdd) { array = role.canInsert || []; }
		if (canUpdate) { array = role.canUpdate || []; }
		if (canDelete) { array = role.canRemove || []; }
		if (canAdd && otherCompanies) { array = role.canInsertOutsideCompany || []; }
		if (canUpdate && otherCompanies) { array = role.canUpdateOutsideCompany || []; }
		if (canDelete && otherCompanies) { array = role.canRemoveOutsideCompany || []; }

		return array.indexOf(collection) > -1;
	}

	render() {
		let attributesList = [
			{ label: 'Is Admin?', prop: 'isAdmin' },
			{ label: 'Can See All Companies?', prop: 'canSeeAllCompanies' },
			{ label: 'Can See All Employees?', prop: 'canSeeAllEmployees' },
		];
		let companyPermissionsList = [
			{ label: 'Partners', collection: 'Partners' },
			{ label: 'Projects', collection: 'Projects' },
			{ label: 'Tasks', collection: 'Tasks' },
			{ label: 'Employees', collection: 'Employees' },
			{ label: 'Products', collection: 'Products' },
			{ label: 'Intercompany Agreements', collection: 'IntercompanyAgreements' },
		];
		let commonPermissionsList = [
			{ label: 'Employee Groups', collection: 'EmployeeGroups' },
			{ label: 'Employee Roles', collection: 'EmployeeRoles' },
		];

		let tableCols = [
			{ widthPixels: 80 },
			{ widthPixels: 180 },
			{ widthPixels: 120 },
			{ widthPixels: 120 },
			{ widthPixels: 120 },
		];

		let tableRows = [
		];

		// GENERATE HEADER ROWS
		tableRows.push({
			className: 'font09',
			isHeader: true,
			heightPixels: 20,
			cells:
				[ { style: { paddingRight: '16px'} }, {} ]
				.concat(attributesList.map((attr, index) => { return {}; }),
				{
					colSpan: companyPermissionsList.length,
					content:
						<div className="flex-row">
							<div className="left-bracket-down flex-grow"></div>
							<div className="spacer-col"></div>
							<div className="text-center">My Company</div>
							<div className="spacer-col"></div>
							<div className="right-bracket-down flex-grow"></div>
						</div>
				},
				{
					colSpan: companyPermissionsList.length,
					content:
						<div className="flex-row">
							<div className="left-bracket-down flex-grow"></div>
							<div className="spacer-col"></div>
							<div className="text-center">Other Companies</div>
							<div className="spacer-col"></div>
							<div className="right-bracket-down flex-grow"></div>
						</div>
				})
		});
		tableRows.push({
			className: 'font09',
			isHeader: true,
			heightPixels: 75,
			cells:
				[ {}, {} ]
				.concat(
					attributesList.map((attr, index) => {
						return {
							className: 'padding-inner-gutter',
							content: <div className="text-center">{ i18n.__(attr.label) }</div>,
						};
					}),
					companyPermissionsList.map((attr, index) => {
						return {
							className: 'padding-inner-gutter',
							content: <div className="text-center">{ i18n.__(attr.label) }</div>,
						};
					}),
					companyPermissionsList.map((attr, index) => {
						return {
							className: 'padding-inner-gutter',
							content: <div className="text-center">{ i18n.__(attr.label) }</div>,
						};
					}),
					commonPermissionsList.map((attr, index) => {
						return {
							className: 'padding-inner-gutter',
							content: <div className="text-center">{ i18n.__(attr.label) }</div>,
						};
					})
				)
		});

		// GENERATE ROWS FOR EACH ROLE
		this.state.currentValues.forEach((role: EmployeeRole, roleIndex: number) => {
			let cells = [];

			cells.push({
				style: { paddingRight: '16px'},
				content:
					<div
						className="button action-danger"
						onClick={() => this.handleDeleteRole(roleIndex)}>
						{ i18n.__('delete') }
					</div>
			});
			cells.push({
				content:
					<FormInput
						value={role.name}
						seeThrough={true}
						editable={true}
						receiveNewValue={(val) => this.handleRoleNameChange(roleIndex, val)} />
			});
			attributesList.forEach((attr, index) => 
				cells.push({
					className: 'padding-inner-gutter',
					content: 
						<ToggleIcon
							onChange={() => this.handleRoleAttributeChange(roleIndex, attr.prop)}
							value={role[attr.prop]} className="padding-s"/>
				})
			);
			// for my company
			companyPermissionsList.forEach((attr, index) => 
				cells.push({
					className: 'padding-inner-gutter',
					content:
						<div className="flex-row flex-center">
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, true, false, false, false)}
								value={this.checkPermission(role, attr.collection, true, false, false, false)}
								label={'add'} className="padding-m"/>
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, false, true, false, false)}
								value={this.checkPermission(role, attr.collection, false, true, false, false)}
								label={'upd'} className="padding-m"/>
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, false, false, true, false)}
								value={this.checkPermission(role, attr.collection, false, false, true, false)}
								label={'del'} className="padding-m"/>
						</div>
				})
			);
			// for other companies
			companyPermissionsList.forEach((attr, index) => 
				cells.push({
					className: 'padding-inner-gutter',
					content:
						<div className="flex-row flex-center">
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, true, false, false, true)}
								value={this.checkPermission(role, attr.collection, true, false, false, true)}
								label={'add'} className="padding-m"/>
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, false, true, false, true)}
								value={this.checkPermission(role, attr.collection, false, true, false, true)}
								label={'upd'} className="padding-m"/>
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, false, false, true, true)}
								value={this.checkPermission(role, attr.collection, false, false, true, true)}
								label={'del'} className="padding-m"/>
						</div>
				})
			);
			// common collections
			commonPermissionsList.forEach((attr, index) => 
				cells.push({
					className: 'padding-inner-gutter',
					content:
						<div className="flex-row flex-center">
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, true, false, false, false)}
								value={this.checkPermission(role, attr.collection, true, false, false, false)}
								label={'add'} className="padding-m"/>
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, false, true, false, false)}
								value={this.checkPermission(role, attr.collection, false, true, false, false)}
								label={'upd'} className="padding-m"/>
							<ToggleIcon
								onChange={() => this.handleRoleCollectionPermissionChange(roleIndex, attr.collection, false, false, true, false)}
								value={this.checkPermission(role, attr.collection, false, false, true, false)}
								label={'del'} className="padding-m"/>
						</div>
				})
			);

			tableRows.push({ cells });
		});

		// ADD LAST ROW WITH BUTTON
		tableRows.push({
			cells: [
				{},
				{
					content: 
						<div className="button action-add" onClick={this.handleNewRole}>
							{ i18n.__('NEW ROLE') }
						</div>
				}
			]
		});

		return <div className="flex-col">
			<div className="section-title">{ i18n.__('Edit Permissions By Role') }</div>

			<div className="spacer-row"/>

			<ExtendedTable
				tableColumns={tableCols}
				tableRows={tableRows}
				fixedColumns={2}
				fixedRows={2}
				baseColWidth={140}
				baseRowHeight={58}
				style={{maxWidth: '100%'}}
				enableScrollX={true}
			/>

			<div className="spacer-row"/>

			<div className="button-bar flex-no-shrink">
				<div className={'button action-dostuff'}
					onClick={this.handleClickSave}>
					{ i18n.__('SAVE') }
				</div>
				<div className="separator" />
				<div className={'button action-cancel'}
					onClick={this.props.onClose}>
					{ i18n.__('CANCEL') }
				</div>
			</div>
		</div>;
	}

}

export default createContainer((props: props) => {

	// subscribe to base objects
	Meteor.subscribe('employees.roles');

	return {
		employeeRoles: EmployeeRoles.find().fetch(),
	};

}, EmployeeRolesSettings);