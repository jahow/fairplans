import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { Employees, Employee } from '../../data/collections';
import { EmployeeGroups, EmployeeGroup } from '../../data/collections';
import { Companies, Company } from '../../data/collections';
import { Tools, DateTools } from '../../utils/tools';
import { EmployeePositionList, LanguageList } from '../../data/choicelists';

import FormInput from '../controls/FormInput';
import ObjectInfoCard from '../widgets/ObjectInfoCard';
import ItemBlockList from '../controls/ItemBlockList';
import Spinner from '../widgets/Spinner';

import { TAPi18n as i18n } from 'meteor/tap:i18n';


// LISTS

interface employeeListProps {
	onClick?: (employee: Employee) => any,

	showSearchBar?: boolean,
	displayHorizontal?: boolean,
	showEmployeeGroups?: boolean,
	showEmployeeContactInfo?: boolean,
	showEmployeePosition?: boolean,

	enableDrag?: boolean,
	enableDrop?: boolean,
	onDrop?: (employee: Employee, type: string, object: any) => any,
	overrideDragType?: string,

	// filters
	memberGroupIdFilter: string,
	managerGroupIdFilter: string,
	notManagerGroupIdFilter: string,

	// reactive data
	employees: Employee[],
	employeeGroups: EmployeeGroup[],
	subReady: boolean,

	// selectedEmployeeIds: string[],
	isSelected?: (employee: Employee, index: number) => boolean,
	lineRef?: (element: any, lineIndex: number, employeeId: string) => any,
	listRef?: (element: any) => any,

	id?: string,
	className?: string,
	style?: Object,
}

class EmployeeListContained extends Component<employeeListProps, any> {
	constructor(props) {
		super(props);

		this.state = {
		};
	}

	render() {
		if(!this.props.subReady) {
			return <ItemBlockList
				items={[<Spinner key='loading' />]}
				showSearchBar={this.props.showSearchBar}
				displayHorizontal={this.props.displayHorizontal}
				className={this.props.className}
				id={this.props.id}
				style={this.props.style}
			/>
		}

		// employee cards
		let employeeListTransform = (e, index) =>
			<div className="flex-no-shrink" key={e._id}>
				<EmployeeCard
					employee={e}
					employeeGroups={this.props.employeeGroups}
					employees={this.props.employees}
					onDrop={this.props.onDrop}
					onClick={this.props.onClick}
					showGroups={this.props.showEmployeeGroups}
					showPosition={this.props.showEmployeePosition}
					showContactInfo={this.props.showEmployeeContactInfo}
					allowDrag={this.props.enableDrag}
					allowDrop={this.props.enableDrop}
					overrideDragType={this.props.overrideDragType}
					showSelected={this.props.isSelected && this.props.isSelected(e, index)}
					ref={this.props.lineRef ? (el) => this.props.lineRef(el, index, e._id) : null}
				/>
			</div>;

		return (
			<ItemBlockList
				items={this.props.employees}
				itemTransform={employeeListTransform}
				sortBy={Tools.getSortFunctionByProp('code', false, true)}
				showSearchBar={this.props.showSearchBar}
				displayHorizontal={this.props.displayHorizontal}
				searchProps={['firstName', 'lastName', 'code']}
				listRef={this.props.listRef}
				className={this.props.className}
				id={this.props.id}
				style={this.props.style}
			/>
		);
	}
}

(EmployeeListContained as any).defaultProps = {
	showSearchBar: true,
	showEmployeeGroups: true,
	showEmployeeContactInfo: false,
	showEmployeePosition: true,
};

export var EmployeeList = createContainer<employeeListProps>((props: employeeListProps) => {
	let sub = Meteor.subscribe('employees.management');
	let employees = Employees.find().fetch();
	let employeeGroups = EmployeeGroups.find().fetch();

	if (props.managerGroupIdFilter) {
		let group = employeeGroups.filter(group =>
			group._id == props.managerGroupIdFilter)[0];
		employees = employees.filter(e =>
			group && group.assignedManagers.indexOf(e._id) > -1);
	}
	else if (props.notManagerGroupIdFilter) {
		let group = employeeGroups.filter(group =>
			group._id == props.notManagerGroupIdFilter)[0];
		employees = employees.filter(e =>
			group && group.assignedMembers.indexOf(e._id) > -1);
	}
	else if (props.memberGroupIdFilter) {
		let group = employeeGroups.filter(group =>
			group._id == props.memberGroupIdFilter)[0];
		employees = employees.filter(e =>
			group && (group.assignedMembers.indexOf(e._id) > -1 ||
			group.assignedManagers.indexOf(e._id) > -1));
	}

	return {
		employees,
		employeeGroups,
		subReady: sub.ready(),
	};

}, EmployeeListContained);


interface employeeGroupListProps {
	onClick?: (employeeGroup: EmployeeGroup) => any,

	showSearchBar?: boolean,
	displayHorizontal?: boolean,

	enableDrag?: boolean,
	enableDrop?: boolean,
	onDrop?: (employeeGroup: EmployeeGroup, type: string, object: any) => any,

	// filters
	memberIdFilter: string,

	// reactive data
	employees: Employee[],
	employeeGroups: EmployeeGroup[],
	subReady: boolean,

	// selectedEmployeeGroupIds: string[],
	isSelected?: (employeeGroup: EmployeeGroup, index: number) => boolean,
	lineRef?: (element: any, lineIndex: number) => any,
	listRef?: (element: any) => any,

	actions?: any,

	id?: string,
	className?: string,
	style?: Object,
}

class EmployeeGroupListContained extends Component<employeeGroupListProps, any> {
	constructor(props) {
		super(props);

		this.state = {
		};
	}

	render() {
		if(!this.props.subReady) {
			return <ItemBlockList
				items={[<Spinner key='loading' />]}
				showSearchBar={this.props.showSearchBar}
				displayHorizontal={this.props.displayHorizontal}
				className={this.props.className}
				id={this.props.id}
				style={this.props.style}
			/>
		}

		// group cards
		let groupListTransform = (g, index) => 
			<div className="flex-no-shrink" key={g._id}>
				<EmployeeGroupCard
					group={g}
					employeeGroups={this.props.employeeGroups}
					employees={this.props.employees}
					onDrop={this.props.onDrop}
					onClick={this.props.onClick}
					allowDrag={this.props.enableDrag}
					allowDrop={this.props.enableDrop}
					showSelected={this.props.isSelected && this.props.isSelected(g, index)}
					ref={this.props.lineRef ? (el) => this.props.lineRef(el, index) : null}
				/>
			</div>;

		return (
			<ItemBlockList
				items={this.props.employeeGroups}
				itemTransform={groupListTransform}
				sortBy="name"
				showSearchBar={this.props.showSearchBar}
				displayHorizontal={this.props.displayHorizontal}
				searchProps={['name']}
				className="flex-grow"
				actions={this.props.actions}
				listRef={this.props.listRef}
			/>
		);
	}
}

(EmployeeGroupListContained as any).defaultProps = {
	showSearchBar: true
};

export var EmployeeGroupList = createContainer<employeeGroupListProps>((props: employeeGroupListProps) => {

	let sub = Meteor.subscribe('employees.management');
	let groupQuery = {};
	if (props.memberIdFilter) {
		groupQuery = {
			$or: [
				{
					assignedMembers: props.memberIdFilter
				},
				{
					assignedManagers: props.memberIdFilter
				}
			]
		};
	}

	return {
		employees: Employees.find().fetch(),
		employeeGroups: EmployeeGroups.find(groupQuery).fetch(),
		subReady: sub.ready(),
	};

}, EmployeeGroupListContained);


// CARDS

interface employeeCardProps {
	employee: Employee,
	employees: Employee[],
	employeeGroups: EmployeeGroup[],
	allowDrag?: boolean,
	allowDrop?: boolean,
	overrideDragType?: string,

	showGroups?: boolean,
	showSelected?: boolean,
	showPosition?: boolean,
	showContactInfo?: boolean,

	onClick?: (employee: Employee) => any,
	onDrop?: (employee: Employee, type: string, object: any) => any,
}

export class EmployeeCard extends Component<employeeCardProps, any> {

	constructor(props) {
		super(props);

		this.handleClick = this.handleClick.bind(this);	
	}

	handleClick() {
		if (this.props.onClick) {
			this.props.onClick(this.props.employee);
		}
	}

	render() {
		let manager = Utils.getManager(this.props.employee, this.props.employees);
		let groups = Utils.getGroups(this.props.employee, this.props.employeeGroups);
		let name = `${this.props.employee.lastName} ${this.props.employee.firstName}`;
		let isInactive = this.props.employee.active ? '' : `(${i18n.__('inactive')})`;

		let managerName = manager ?
			`${manager.lastName} ${manager.firstName}`
			: i18n.__('none');

		let position = '';
		if(this.props.employee.position && this.props.employee.position != 'na') {
			position = `, ${EmployeePositionList.find(p => p.value == this.props.employee.position).label}`;
		}

		return (
			<ObjectInfoCard
				onClick={(this.props.onClick != null ? this.handleClick : null)}
				className="flex-grow"
				selected={this.props.showSelected}
				draggable={this.props.allowDrag}
				draggableType={this.props.overrideDragType || 'employee-card'}
				draggableObject={{ employeeId: this.props.employee._id }}
				droppable={this.props.allowDrop}
				droppableTypes={['group-card', 'project-card']}
				onDrop={(type, object) => this.props.onDrop(this.props.employee, type, object)}
				typeIcon="person"
			>
				<div className="title">{name}{position} <span className="light-text">{isInactive}</span></div>
				<div className="light-text">{i18n.__('Manager')}: {managerName}</div>
				<div className="code">{this.props.employee.code}</div>
				{
					this.props.showContactInfo &&
					<div className="">
						<span className="light-text">{i18n.__('E-mail')}:</span>&nbsp;
						<a href={'mailto:'+this.props.employee.email} className="inline no-wrap">
							{this.props.employee.email}
						</a>
					</div>
				}
				{
					this.props.showGroups &&
					<div className="flex-row min-width-0">
						{/*<span className="light-text">{i18n.__('Groups')}:</span>&nbsp;*/}
						{
							groups.map(g =>
								<span className="flex-shrink small-tag front" key={g._id}>
									{g.name}
								</span>
							)
						}
						{
							groups.length == 0 &&
							<span className="light-text">{ i18n.__('No groups assigned.') }</span>
						}
					</div>
				}
			</ObjectInfoCard>
		);
	}

}


interface employeeGroupCardProps {
	group: EmployeeGroup,
	employees: Employee[],
	employeeGroups: EmployeeGroup[],
	allowDrag?: boolean,
	allowDrop?: boolean,
	showSelected?: boolean,

	onClick?: (group: EmployeeGroup) => any,
	onDrop?: (group: EmployeeGroup, type: string, object: any) => any,
}

export class EmployeeGroupCard extends Component<employeeGroupCardProps, any> {

	constructor(props) {
		super(props);

		this.handleClick = this.handleClick.bind(this);	
	}

	handleClick() {
		if (this.props.onClick) {
			this.props.onClick(this.props.group);
		}
	}

	render() {
		let managerNames = '';
		let managers = Utils.getGroupMembers(this.props.group, this.props.employees, true);

		managers.forEach(m => {
			if (managerNames != '') {
				managerNames += ', ';
			}
			managerNames += `${m.lastName} ${m.firstName}`;
		});

		return (
			<ObjectInfoCard
				onClick={(this.props.onClick != null ? this.handleClick : null)}
				className="flex-grow"
				selected={this.props.showSelected}
				draggable={this.props.allowDrag}
				draggableType="group-card"
				draggableObject={{ groupId: this.props.group._id }}
				droppable={this.props.allowDrop}
				droppableTypes={['employee-card', 'project-card']}
				onDrop={(type, object) => this.props.onDrop(this.props.group, type, object)}
				typeIcon="group"
			>
				<div className="title">{this.props.group.name}</div>
				<div className="light-text">{this.props.group.assignedMembers.length + this.props.group.assignedManagers.length} {i18n.__('members')}</div>
				<div><span className="light-text">{i18n.__('Managers')}:</span> {managerNames}</div>
			</ObjectInfoCard>
		);
	}

}


// COMMON UTILS

export class Utils {
	static getManager(employee: Employee, employees: Employee[]) {
		// return employees.find(e =>
		// 	e.code == employee.managerCode && e.companyCode == employee.companyCode);
		return employees.find(e => e._id == employee.managerId);
	}

	static getGroups(employee: Employee, employeeGroups: EmployeeGroup[], managerOnly?: boolean, memberOnly?: boolean) {
		if (managerOnly) {
			return employeeGroups.filter(g =>
				g.assignedManagers.findIndex(id => id == employee._id) > -1);
		}
		if (memberOnly) {
			return employeeGroups.filter(g =>
				g.assignedMembers.findIndex(id => id == employee._id) > -1);
		}
		return employeeGroups.filter(g =>
			g.assignedMembers.findIndex(id => id == employee._id) > -1 ||
			g.assignedManagers.findIndex(id => id == employee._id) > -1);
	}

	static getGroupMembers(group: EmployeeGroup, employees: Employee[], managers?: boolean): Employee[] {
		if (managers) {
			return employees.filter(e =>
				group.assignedManagers.indexOf(e._id) > -1);
		}
		return employees.filter(e =>
			group.assignedMembers.indexOf(e._id) > -1);
	}
}
