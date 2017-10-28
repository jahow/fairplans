import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import ReactModal2 from 'react-modal2';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { Companies, Company, Employees, Employee, EmployeeGroups, EmployeeGroup,
	EmployeeRoles, EmployeeRole, EmployeeSkill, EmployeeSkills } from '../../data/collections';
import { Projects, Project } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';
import { EmployeePositionList, LanguageList } from '../../data/choicelists';

import ItemTableList from '../controls/ItemTableList';
import ItemBlockList from '../controls/ItemBlockList';
import ProgressBar from '../controls/ProgressBar';
import FormInput from '../controls/FormInput';
import CloseButton from '../controls/CloseButton';

import ObjectInfoCard from '../widgets/ObjectInfoCard';
import { TimeGraphComponent, DataCurve, TimeMarker, BarChart, StackedBarChart, StackedDataCurves } from '../widgets/GraphComponents';

import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';
import ProjectList from '../subviews/ProjectList';
import { EmployeeCard, EmployeeGroupCard,
	EmployeeGroupList, EmployeeList, Utils } from '../subviews/EmployeeManagementLists';

import EmployeeRolesSettings from '../subviews/EmployeeRolesSettings';


interface props {
	companies: Company[],
	employees: Employee[],
	employeeGroups: EmployeeGroup[],
	employeeRoles: EmployeeRole[],
	projects: Project[]
}
interface state {
	selectedEmployeeId?: string,
	selectedGroupId?: string,
	canEditEmployees?: boolean,
	canCreateEmployees?: boolean,
	canEditEmployeeGroups?: boolean,
	canCreateEmployeeGroups?: boolean,
	showProjects?: boolean,
	showPermissionsModal?: boolean,

	// analytics params
	currentAnalyticsCoord?: number,
	currentAnalyticsDaysRange?: number,
	currentAnalyticsMode?: 'hours' | 'occupation' | 'billable',
	employeesHoursData?: { [employeeId: string]: any[] },
	employeesOccupationData?: { [employeeId: string]: any[] },
	employeesBillableData?: { [employeeId: string]: any[] },
}

class EmployeesManagementContainer extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			currentAnalyticsCoord: 0,
			currentAnalyticsDaysRange: 12,
			currentAnalyticsMode: 'occupation',

			// analytics data init
			employeesHoursData: {},
			employeesOccupationData: {},
			employeesBillableData: {},
		};

		this.handleCloseTab = this.handleCloseTab.bind(this);

		this.handleEmployeeSelection = this.handleEmployeeSelection.bind(this);
		this.handleEmployeeUpdate = this.handleEmployeeUpdate.bind(this);
		this.handleEmployeeCreate = this.handleEmployeeCreate.bind(this);
		this.handleEmployeeArchive = this.handleEmployeeArchive.bind(this);
		this.handleEmployeeDelete = this.handleEmployeeDelete.bind(this);
		this.handleEmployeeClickNew = this.handleEmployeeClickNew.bind(this);

		this.handleGroupSelection = this.handleGroupSelection.bind(this);
		this.handleGroupUpdate = this.handleGroupUpdate.bind(this);
		this.handleGroupCreate = this.handleGroupCreate.bind(this);
		this.handleGroupArchive = this.handleGroupArchive.bind(this);
		this.handleGroupDelete = this.handleGroupDelete.bind(this);
		this.handleGroupClickNew = this.handleGroupClickNew.bind(this);

		this.handleOnGroupDrop = this.handleOnGroupDrop.bind(this);
		this.handleOnEmployeeDrop = this.handleOnEmployeeDrop.bind(this);
		this.handleOnProjectDrop = this.handleOnProjectDrop.bind(this);

		this.handleProjectsViewToggle = this.handleProjectsViewToggle.bind(this);
		this.handleClickEditPermissions = this.handleClickEditPermissions.bind(this);
		this.handleEditPermissionsClose = this.handleEditPermissionsClose.bind(this);

		this.handleAnalyticsViewChange = this.handleAnalyticsViewChange.bind(this);
		this.scrollAnalyticsPane = this.scrollAnalyticsPane.bind(this);
		this.renderEmployeeAnalytics = this.renderEmployeeAnalytics.bind(this);
	}

	_refsInit = false;
	_scrollContainer: any;
	_analyticsPane: any;
	_employeesLineRefs: any[] = [];


	// LIFECYCLE

	componentDidMount() {
		this.checkOperationsPermitted(this.props);
	}

	componentDidUpdate() {
		if (this._scrollContainer && !this._refsInit) {
			this._scrollContainer.addEventListener('scroll', this.scrollAnalyticsPane);
			this._refsInit = true;

			// artificially redraw to update ref-based components
			this.setState({ currentAnalyticsCoord: 0 });
		}
	}

	componentWillUnmount() {
		if (this._scrollContainer) {
			this._scrollContainer.removeEventListener('scroll', this.scrollAnalyticsPane);
		}
	}

	componentWillReceiveProps(newProps: props) {
		// fetch data for employees
		if (newProps.employees && newProps.employees.length) {
			// ask data for new tasks
			for (let i = 0; i < newProps.employees.length; i++) {
				let employee = newProps.employees[i];

				// TEMP: disabled for performance reasons
				continue;

				if (!this.state.employeesHoursData[employee._id]) {
					Meteor.call('analytics.employee.hours.bystatus', {employeeId: employee._id}, (err, res) => {
						if (err) {
							console.error(err);
							return;
						}

						let data = Object.assign({}, this.state.employeesHoursData);
						data[employee._id] = res;

						this.setState({
							employeesHoursData: data
						});
					});
				}
				if (!this.state.employeesOccupationData[employee._id]) {
					Meteor.call('analytics.employee.occupation', {employeeId: employee._id}, (err, res) => {
						if (err) {
							console.error(err);
							return;
						}

						let data = Object.assign({}, this.state.employeesOccupationData);
						data[employee._id] = res;

						this.setState({
							employeesOccupationData: data
						});
					});
				}
				if (!this.state.employeesBillableData[employee._id]) {
					Meteor.call('analytics.employee.billable', {employeeId: employee._id}, (err, res) => {
						if (err) {
							console.error(err);
							return;
						}

						let data = Object.assign({}, this.state.employeesOccupationData);
						data[employee._id] = res;

						this.setState({
							employeesBillableData: data
						});
					});
				}
			}
		}
	}

	checkOperationsPermitted(props: props) {
		Meteor.call('can.do', {
			collectionName: 'Employees',
			operation: CollectionOperation.UPDATE,
		}, (err, res) => {
			this.setState({ canEditEmployees: !err && res ? true : false })
		});
		Meteor.call('can.do', {
			collectionName: 'Employees',
			operation: CollectionOperation.INSERT,
		}, (err, res) => {
			this.setState({ canCreateEmployees: !err && res ? true : false })
		});
		Meteor.call('can.do', {
			collectionName: 'EmployeeGroups',
			operation: CollectionOperation.UPDATE,
		}, (err, res) => {
			this.setState({ canEditEmployeeGroups: !err && res ? true : false })
		});
		Meteor.call('can.do', {
			collectionName: 'EmployeeGroups',
			operation: CollectionOperation.INSERT,
		}, (err, res) => {
			this.setState({ canCreateEmployeeGroups: !err && res ? true : false })
		});
	}

	handleEmployeeSelection(employee: Employee) {
		if(this.state.selectedEmployeeId != employee._id) {
			this.setState({
				selectedEmployeeId: employee._id,
				selectedGroupId: null,
			});
		} else {
			this.setState({
				selectedEmployeeId: null,
			});
		}
	}
	handleCloseTab() {
		this.setState({
			selectedEmployeeId: null,
			selectedGroupId: null,
		})
	}

	handleEmployeeUpdate(id: string, values: Object) {
		Meteor.call('employee.update', { employeeId: id, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Employee update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Employee has been successfully updated.'));
			this.handleCloseTab();
		});
	}
	handleEmployeeCreate(id: string, values: Object) {
		Meteor.call('employee.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Employee creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Employee has been successfully created.'));
			this.handleCloseTab();
		});
	}
	handleEmployeeArchive(id: string) {
		// todo
	}
	handleEmployeeDelete(id: string) {
		if (confirm(i18n.__('Are you sure you want to delete this employee?'))) {
			Meteor.call('employee.delete', id, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Employee delete failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Employee has been successfully deleted.'));
				this.handleCloseTab();
			});
		}
	}
	handleEmployeeClickNew() {
		this.setState({ selectedEmployeeId: 'new', selectedGroupId: null });
	}

	handleGroupSelection(group: EmployeeGroup) {
		if(this.state.selectedGroupId != group._id) {
			this.setState({
				selectedGroupId: group._id,
				selectedEmployeeId: null,
			});
		} else {
			this.setState({
				selectedGroupId: null,
			});
		}
	}
	handleGroupUpdate(id: string, values: Object) {
		Meteor.call('group.update', { groupId: id, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Employee Group update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Employee Group has been successfully updated.'));
			this.handleCloseTab();
		});
	}
	handleGroupCreate(id: string, values: Object) {
		Meteor.call('group.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Employee Group creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Employee Group has been successfully created.'));
			this.handleCloseTab();
		});
	}
	handleGroupArchive(id: string) {
		// todo
	}
	handleGroupDelete(id: string) {
		if (confirm(i18n.__('Are you sure you want to delete this group?'))) {
			Meteor.call('group.delete', id, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Employee Group delete failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Employee Group has been successfully deleted.'));
				this.handleCloseTab();
			});
		}
	}
	handleGroupClickNew() {
		this.setState({ selectedGroupId: 'new', selectedEmployeeId: null });
	}

	// drag and drop handlers
	handleOnGroupDrop(group: EmployeeGroup, type: string, object: any) {
		if (type == 'employee-card' && object.employeeId) {
			Meteor.call('assign.employee.group', group._id, object.employeeId);
		} else if (type == 'project-card' && object.projectId) {
			Meteor.call('assign.group.project', object.projectId, group._id);
		}
	}
	handleOnEmployeeDrop(employee: Employee, type: string, object: any) {
		if (type == 'group-card' && object.groupId) {
			Meteor.call('assign.employee.group', object.groupId, employee._id);
		} else if (type == 'project-card' && object.projectId) {
			Meteor.call('assign.employee.project', object.projectId, employee._id);
		}
	}
	handleOnProjectDrop(project: Project, type: string, object: any) {
		if (type == 'employee-card' && object.employeeId) {
			Meteor.call('assign.employee.project', project._id, object.employeeId);
		} else if (type == 'group-card' && object.groupId) {
			Meteor.call('assign.group.project', project._id, object.groupId);
		}
	}

	// projects display
	handleProjectsViewToggle() {
		this.setState({ showProjects: !this.state.showProjects });
	}

	// permissions edit
	handleClickEditPermissions() {
		this.setState({ showPermissionsModal: true });
	}
	handleEditPermissionsClose() {
		this.setState({ showPermissionsModal: false });
	}

	// ANALYTICS HANDLERS

	// note: coords are in days, relative to the current time
	handleAnalyticsViewChange(newCoord: number, newRange: number) {
		this.setState({
			currentAnalyticsCoord: newCoord,
			currentAnalyticsDaysRange: newRange,
		});
	}

	scrollAnalyticsPane(event) {
		if (this._analyticsPane) {
			this._analyticsPane.scrollTop = this._scrollContainer.scrollTop;
		}
	}

	renderEmployeeAnalytics(employee: Employee, index: number) {
		if (!this._employeesLineRefs[employee._id]) { return ''; }

		let lineEl = ReactDOM.findDOMNode(this._employeesLineRefs[employee._id]);
		let rect = lineEl.getBoundingClientRect();
		let containerRect = this._analyticsPane.getBoundingClientRect();
		let style = {
			position: 'absolute',
			top: rect.top - containerRect.top + this._scrollContainer.scrollTop,
			width: '100%',
		};

		if (this.state.currentAnalyticsMode == 'hours') {
			let data = this.state.employeesHoursData[employee._id] || [];

			let bars = [];
			data.forEach(projEntry => {
				projEntry.totalHoursByDay.forEach(hoursEntry => {
					let day = bars.find(bar => bar.x == hoursEntry.x);
					let project = this.props.projects.find(p => p._id == projEntry.projectId);
					if (!day) {
						day = {
							x: hoursEntry.x,
							sum: 0,
							width: 1,
							blocks: [],
						};
						bars.push(day);
					}
					day.blocks.push({
						height: hoursEntry.y,
						color: projEntry.projectColor,
						opacity: 0.9,
						label: project.name,
					});
					day.sum += hoursEntry.y;
				});
			});

			return (
				<TimeGraphComponent
					maxValue={8}
					viewCoord={this.state.currentAnalyticsCoord}
					viewDaysRange={this.state.currentAnalyticsDaysRange}
					onViewChange={this.handleAnalyticsViewChange}
					heightPixels={(lineEl as any).offsetHeight}
					style={style}
					key={'employee-hours' + employee._id}
				>
					<StackedBarChart
						key="projects-hours"
						dataKey="projects-hours"
						points={bars}
						tooltip={`{label}<br />On: {x}<br/>Hours: {y}`}
					/>
					<TimeMarker
						key="now"
						dataKey="now"
						date={new Date()}
						color="#00ff35"
					/>
				</TimeGraphComponent>
			);
		} else if (this.state.currentAnalyticsMode == 'occupation') {
			let now = moment();
			let data = this.state.employeesOccupationData[employee._id] || [];
			let pastData = data.filter(d => moment(d.x).isSameOrBefore(now, 'day'));
			let futureData = data.filter(d => moment(d.x).isSameOrAfter(now, 'day'));

			return (
				<TimeGraphComponent
					maxValue={1}
					viewCoord={this.state.currentAnalyticsCoord}
					viewDaysRange={this.state.currentAnalyticsDaysRange}
					onViewChange={this.handleAnalyticsViewChange}
					heightPixels={(lineEl as any).offsetHeight}
					style={style}
					key={'employee-occupation' + employee._id}
				>
					<DataCurve
						key="past"
						dataKey="task-past"
						curveColor="grey"
						curveOpacity={1}
						points={pastData}
						fillCurve={true}
						tooltip="On {x}<br/>Chargeability Ratio: {y}"
					/>
					<DataCurve
						key="future"
						dataKey="task-occupation"
						curveColor="#13e03b"
						curveOpacity={1}
						points={futureData}
						fillCurve={true}
						tooltip="On {x}<br/>Chargeability Ratio: {y}"
					/>
					<TimeMarker
						key="now"
						dataKey="now"
						date={new Date()}
						color="#00ff35"
					/>
				</TimeGraphComponent>
			);
		} else if (this.state.currentAnalyticsMode == 'billable') {
			let now = moment();
			let data = this.state.employeesBillableData[employee._id] || [];
			let curves = [
				{
					points: data.map(d => {
						return { x: d.x, y: d.billableHours }
					}),
					color: '#13e03b',
					opacity: 1,
					label: 'Billable',
				},
				{
					points: data.map(d => {
						return { x: d.x, y: d.nonBillableHours }
					}),
					color: '#ff5d1a',
					opacity: 1,
					label: 'Non-Billable',
				}
			];
			let max = 8;
			data.forEach(d => max = d.totalHours > max ? d.totalHours : max);

			return (
				<TimeGraphComponent
					maxValue={max}
					viewCoord={this.state.currentAnalyticsCoord}
					viewDaysRange={this.state.currentAnalyticsDaysRange}
					onViewChange={this.handleAnalyticsViewChange}
					heightPixels={(lineEl as any).offsetHeight}
					style={style}
					key={'employee-billable' + employee._id}
				>
					<StackedDataCurves
						key="past"
						dataKey="task-past"
						curves={curves}
						tooltip="On {x}<br/>{label} hours: {y}"
					/>
					<TimeMarker
						key="now"
						dataKey="now"
						date={new Date()}
						color="#00ff35"
					/>
				</TimeGraphComponent>
			);
		}
	}

	render() {
		let isCreateGroupMode = this.state.selectedGroupId == 'new';
		let isCreateEmployeeMode = this.state.selectedEmployeeId == 'new';

		// companies list
		let companiesList = this.props.companies.map(c => {
			return {
				value: c.code,
				label: c.name
			};
		});

		// employees list
		let employeesList = this.props.employees.map(e => {
			return {
				value: e._id,
				label: e.lastName + ' ' + e.firstName,
			};
		});

		// employee roles list
		let roleList = [
			{ value: '', label: i18n.__('none') }
		].concat(
			this.props.employeeRoles.map(r => {
				return {
					value: r._id,
					label: r.name,
				}
			})
		);

		// input form params
		let employeeFormPropInfo: PropertyInfo[] = [
			{
				propName: 'code',
				label: i18n.__('Code'),
				editable: isCreateEmployeeMode,
				inputSize: 'small',
				excludeFromCallbacks: !isCreateEmployeeMode,
				required: true,
			},
			{
				propName: 'companyCode',
				label: i18n.__('Company'),
				editable: isCreateEmployeeMode,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: companiesList,
				placeholder: ' ',
				required: true,
			},
			{
				propName: 'active',
				label: i18n.__('Status'),
				editable: this.state.canEditEmployees,
				inputSize: 'small',
				inputType: 'combo',
				valueList: [
					{ label: i18n.__('Inactive'), value: false },
					{ label: i18n.__('Active'), value: true }
				],
			},
			{
				propName: 'firstName',
				label: i18n.__('First Name'),
				editable: this.state.canEditEmployees,
			},
			{
				propName: 'lastName',
				label: i18n.__('Last Name'),
				editable: this.state.canEditEmployees,
				required: true,
			},
			{
				propName: 'email',
				label: i18n.__('Email'),
				editable: this.state.canEditEmployees,
			},
			{
				propName: 'position',
				label: i18n.__('Position'),
				inputType: 'combo',
				valueList: EmployeePositionList,
				placeholder: ' ',
				editable: this.state.canEditEmployees,
				inputSize: 'medium',
				required: true,
			},
			{
				propName: 'roleId',
				label: i18n.__('Role'),
				inputType: 'combo',
				valueList: roleList,
				editable: this.state.canEditEmployees,
				inputSize: 'medium',
			},
			{
				propName: 'managerId',
				label: i18n.__('Manager'),
				inputType: 'combo',
				valueList: employeesList,
				placeholder: 'N/A',
				editable: this.state.canEditEmployees,
				inputSize: 'medium',
				// required: true,
			},
			{
				propName: 'skillsString',
				label: i18n.__('Skills Set'),
				editable: this.state.canEditEmployees,
			},
			{
				propName: 'hourlyCost',
				label: i18n.__('Hourly Cost'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
			},
			{
				propName: 'hourlyCostFullyLoaded',
				label: i18n.__('Hourly Cost (fully loaded)'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
			},
			{
				propName: 'hourlySessionPrice',
				label: i18n.__('Hourly Session Price'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
			},
			{
				propName: 'companyCode',
				label: i18n.__('Company Currency'),
				editable: false,
				inputSize: 'x-small',
				transform: (value) => {
					let comp = this.props.companies.find(c => c.code == value);
					return comp && comp.defaultCurrency;
				}
			},
			{
				propName: 'weekWorktimeHours',
				label: i18n.__('Hours Worked Per Week'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
			},
			{
				propName: 'counterHolidays',
				label: i18n.__('Holidays Counter'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
				numberMin: 0,
			},
			{
				propName: 'counterRTT',
				label: i18n.__('RTT Counter'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
				numberMin: 0,
			},
			{
				propName: 'counterMisc',
				label: i18n.__('Misc. Counter'),
				inputType: 'number',
				editable: this.state.canEditEmployees,
				inputSize: 'x-small',
				numberMin: 0,
			},
			{
				propName: 'partnerCode',
				label: i18n.__('Supplier Code (for B1)'),
				editable: this.state.canEditEmployees,
			},
		];

		let groupFromPropInfo: PropertyInfo[] = [
			{
				propName: 'code',
				label: i18n.__('Code'),
				editable: isCreateGroupMode,
				inputSize: 'small',
				excludeFromCallbacks: !isCreateGroupMode,
			},
			{
				propName: 'companyCode',
				label: i18n.__('Company'),
				editable: isCreateGroupMode,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: companiesList,
				placeholder: ' ',
			},
			{
				propName: 'name',
				label: i18n.__('Name'),
				editable: this.state.canEditEmployees,
			},
		];

		if (!isCreateEmployeeMode && !isCreateGroupMode) {
			let formatDate = (timestamp) => moment(timestamp).format('LLL');
			employeeFormPropInfo.push(
				{
					propName: 'creationTime',
					label: i18n.__('Created On'),
					seeThrough: true,
					transform: formatDate,
				},
				{
					propName: 'updateTime',
					label: i18n.__('Updated On'),
					seeThrough: true,
					transform: formatDate,
				},
			);
			groupFromPropInfo.push(
				{
					propName: 'creationTime',
					label: i18n.__('Created On'),
					seeThrough: true,
					transform: formatDate,
				},
				{
					propName: 'updateTime',
					label: i18n.__('Updated On'),
					seeThrough: true,
					transform: formatDate,
				},
			);
		}

		// selected object (for input form)
		let selectedEmployee = null;
		let selectedGroup = null;
		if (isCreateGroupMode) {
			selectedGroup = { _id: 'new' };
		}
		else if (isCreateEmployeeMode) {
			selectedEmployee = { _id: 'new', active: true };
		}
		else if (this.state.selectedEmployeeId) {
			selectedEmployee = this.props.employees.find(e => e._id == this.state.selectedEmployeeId);
		}
		else if (this.state.selectedGroupId) {
			selectedGroup = this.props.employeeGroups.find(e => e._id == this.state.selectedGroupId);
		}

		let currentMemberList = [];
		let currentManagerList = [];

		// for employee view: group list with unassign button
		if (this.state.selectedEmployeeId && !isCreateEmployeeMode) {
			let currentEmployee = this.props.employees.find(e =>
				e._id == this.state.selectedEmployeeId
			);
			let groupMap = g =>
				<div className="flex-row flex-center">
					<EmployeeGroupCard
						group={g}
						employeeGroups={this.props.employeeGroups}
						employees={this.props.employees}
					/>
					<div className="spacer-col flex-no-shrink" />
					{
						this.state.canEditEmployeeGroups ?
						<div
							className="button action-danger flex-no-shrink"
							onClick={() => Meteor.call('unassign.employee.group', g._id, this.state.selectedEmployeeId)}
						>
							{i18n.__('UNASSIGN')}
						</div>
						: ''
					}
				</div>;
			currentMemberList = Utils.getGroups(currentEmployee, this.props.employeeGroups, false, true).map(groupMap);
			currentManagerList = Utils.getGroups(currentEmployee, this.props.employeeGroups, true).map(groupMap);
		}

		// for group view: employee list with unassign button
		if (this.state.selectedGroupId && !isCreateGroupMode) {
			let currentGroup = this.props.employeeGroups.find(g =>
				g._id == this.state.selectedGroupId
			);
			let employeeMap = (e: Employee, managers?: boolean) =>
				<div className="flex-row flex-center">
					<EmployeeCard
						employee={e}
						employeeGroups={this.props.employeeGroups}
						employees={this.props.employees}
					/>
					<div className="spacer-col flex-no-shrink" />
					{
						this.state.canEditEmployeeGroups &&
						<div className="flex-col flex-no-shrink">

							{
								managers ?
								<div
									className="button action-warning small"
									onClick={() => Meteor.call('assign.employee.group', currentGroup._id, e._id, false)}
								>
									{i18n.__('SET AS MEMBER')}
								</div>
								:
								<div
									className="button action-dostuff small"
									onClick={() => Meteor.call('assign.employee.group', currentGroup._id, e._id, true)}
								>
									{i18n.__('SET AS MANAGER')}
								</div>
							}

							<div className="spacer-row flex-no-shrink" />
							<div
								className="button action-danger small"
								onClick={() => Meteor.call('unassign.employee.group', currentGroup._id, e._id)}
							>
								{i18n.__('UNASSIGN')}
							</div>
						</div>
					}
				</div>;
			currentMemberList = Utils.getGroupMembers(currentGroup, this.props.employees, false).map(
				e => { return employeeMap(e, false) });
			currentManagerList = Utils.getGroupMembers(currentGroup, this.props.employees, true).map(
				e => { return employeeMap(e, true) });
		}

		return (
			<div className="flex-col management-page-container">

				<div className="flex-row flex-center flex-start flex-no-shrink">

					<div className="flex-grow font25">
						{ i18n.__('Employees Management') }
					</div>

					<div className="nav-link" onClick={this.handleProjectsViewToggle}>
						{ i18n.__((this.state.showProjects ? 'hide' : 'show') + ' projects list') }
					</div>
					<div className="spacer-col" />
					<div className="nav-link"
						onClick={this.handleClickEditPermissions}>
						{ i18n.__('edit permissions') }
					</div>
					<div className="spacer-col" />

				</div>

				<div className="spacer-row" />

				<div className="flex-grow flex-row height-100 pos-relative">
					<section className="width-25 flex-col flex-grow flex-no-shrink">
						<div className="flex-row flex-center flex-no-shrink">
							<div className="section-title flex-grow">{ i18n.__('Groups') }</div>
							<div className="spacer-col small" />
							<button
								className={`small action-add ${this.state.canCreateEmployeeGroups ? '' : 'disabled'}`}
								onClick={this.handleGroupClickNew}>
								{ i18n.__('NEW GROUP') }
							</button>
						</div>
						<EmployeeGroupList
							onClick={this.handleGroupSelection}
							enableDrag={true}
							enableDrop={true}
							onDrop={this.handleOnGroupDrop}
							isSelected={(g: EmployeeGroup) => g._id == this.state.selectedGroupId}
						/>
					</section>

					<div className="spacer-h"></div>

					<section className="flex-grow flex-col width-33">
						<div className="flex-row flex-center flex-no-shrink">
							<div className="section-title flex-grow">{ i18n.__('Employees') }</div>
							<div className="spacer-col small" />
							<button
								className={`small action-add ${this.state.canCreateEmployees ? '' : 'disabled'}`}
								onClick={this.handleEmployeeClickNew}>
								{ i18n.__('NEW EMPLOYEE') }
							</button>
						</div>
						<EmployeeList
							onClick={this.handleEmployeeSelection}
							enableDrag={this.state.canEditEmployees}
							enableDrop={this.state.canEditEmployees}
							onDrop={this.handleOnEmployeeDrop}
							isSelected={(e: Employee) => e._id == this.state.selectedEmployeeId}
							lineRef={(el, index, employeeId) => { this._employeesLineRefs[employeeId] = el; }}
							listRef={(el) => { this._scrollContainer = el; }}
						/>
					</section>

					<div className="flex-col flex-grow flex-no-shrink pos-relative scroll-hidden width-side-pane">
						<div className="padding-inner-gutter">
							<div className="button-bar flex-row">
								<span>{ i18n.__('Analytics Mode') }:</span>
								<div className={`button ${this.state.currentAnalyticsMode == 'occupation' ? 'selected' : ''}`}
									 onClick={() => this.setState({ currentAnalyticsMode: 'occupation' })}>
									{ i18n.__('CHARGEABILITY') }
								</div>
								<div className={`button ${this.state.currentAnalyticsMode == 'hours' ? 'selected' : ''}`}
									 onClick={() => this.setState({ currentAnalyticsMode: 'hours' })}>
									{ i18n.__('APPROVED TIMESHEETS') }
								</div>
								<div className={`button ${this.state.currentAnalyticsMode == 'billable' ? 'selected' : ''}`}
									 onClick={() => this.setState({ currentAnalyticsMode: 'billable' })}>
									{ i18n.__('BILLABLE HOURS') }
								</div>
							</div>
						</div>
						<div
							className="pos-relative scroll-hidden"
							ref={(el) => { this._analyticsPane = el; } }
						>
							{ this.props.employees.map(this.renderEmployeeAnalytics) }
							<div style={{height: 1000}}/>
						</div>
					</div>

					<section className={'padding-inner-gutter padding-no-bottom lowkey-pane side-pane flex-col '+(this.state.showProjects ? 'open' : 'closed')}>
						<CloseButton onClick={this.handleProjectsViewToggle} bright={true} />
						<div className="section-title">{ i18n.__('Projects list') }</div>
						<ProjectList
							columnCount={2}
							displayGroupButtons={false}
							onDrop={this.handleOnProjectDrop}
							enableDrag={this.state.canEditEmployeeGroups}
							enableDrop={this.state.canEditEmployeeGroups}
						/>
					</section>
				</div>

				{
					this.state.showPermissionsModal &&
					<ReactModal2
						onClose={this.handleEditPermissionsClose}
						closeOnEsc={true}
						closeOnBackdropClick={true}
						backdropClassName='overlay-pane-background'
						modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col'
					>
						<CloseButton onClick={this.handleEditPermissionsClose} bright={true} />
						<EmployeeRolesSettings onClose={this.handleEditPermissionsClose} />
					</ReactModal2>
				}

				<div
					className={ "forward-pane side-pane " + ((selectedEmployee || selectedGroup) ? "opened" : "") }
				>
					<CloseButton onClick={this.handleCloseTab} bright={true} />
					
					{
						selectedEmployee &&
						<div className="section-container scroll-y padding-outer-gutter">

							<div className="section-title">{ i18n.__('Employee Info') }</div>
							<InputFormManager
								originalValues={selectedEmployee}
								propertiesInfo={employeeFormPropInfo}
								idPropName="_id"
								showSaveButton={ isCreateEmployeeMode ? i18n.__('CREATE') : i18n.__('UPDATE') }
								showCancelButton={ isCreateEmployeeMode }
								showRevertButton={ !isCreateEmployeeMode }
								showDeleteButton={ !isCreateEmployeeMode }
								allowSave={this.state.canEditEmployees}
								allowDelete={this.state.canEditEmployees}
								onSave={ isCreateEmployeeMode ? this.handleEmployeeCreate : this.handleEmployeeUpdate }
								onDelete={ this.handleEmployeeDelete }
								onCancel={ this.handleCloseTab }
							/>

							{
								!isCreateEmployeeMode &&
								<div>
									<div className="spacer-row"></div>

									<div className="section-title">{ i18n.__('Manager of') }</div>
									<ItemBlockList
										items={currentManagerList}
									/>

									<div className="spacer-row"></div>

									<div className="section-title">{ i18n.__('Member of') }</div>
									<ItemBlockList
										items={currentMemberList}
									/>
								</div>
							}

						</div>
					}

					{
						selectedGroup &&
						<div className="section-container scroll-y padding-outer-gutter">

							<div className="section-title">{ i18n.__('Employee Group Info') }</div>
							<InputFormManager
								originalValues={selectedGroup}
								propertiesInfo={groupFromPropInfo}
								idPropName="_id"
								showSaveButton={ isCreateGroupMode ? i18n.__('CREATE') : i18n.__('UPDATE') }
								showCancelButton={ isCreateGroupMode }
								showRevertButton={ !isCreateGroupMode }
								showDeleteButton={ !isCreateGroupMode }
								allowSave={this.state.canEditEmployeeGroups}
								allowDelete={this.state.canEditEmployeeGroups}
								onSave={ isCreateGroupMode ? this.handleGroupCreate : this.handleGroupUpdate }
								onDelete={ this.handleGroupDelete }
								onCancel={ this.handleCloseTab }
							/>

							{
								!isCreateGroupMode &&
								<div>
									<div className="spacer-row"></div>

									<div className="section-title">{ i18n.__('Managers') }</div>
									<ItemBlockList
										items={currentManagerList}
									/>

									<div className="spacer-row"></div>

									<div className="section-title">{ i18n.__('Members') }</div>
									<ItemBlockList
										items={currentMemberList}
									/>
								</div>
							}

						</div>
					}
				</div>

			</div>
		);
	}
}

export default createContainer((props: props) => {

	// subscribe to base objects
	Meteor.subscribe('employees.management');

	return {
		companies: Companies.find().fetch(),
		employees: Employees.find().fetch(),
		employeeGroups: EmployeeGroups.find().fetch(),
		employeeRoles: EmployeeRoles.find().fetch(),
		projects: Projects.find().fetch(),
	};

}, EmployeesManagementContainer);



