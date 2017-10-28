import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Link } from 'react-router';
import { DropTarget } from 'react-dnd';
import { createContainer } from 'meteor/react-meteor-data';
import * as d3 from 'd3';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Tools, DateTools } from '../../utils/tools';
import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { Projects, Project, Companies, Company, Partners, Partner } from '../../data/collections';
import { SalesOrder, SalesOrders, SalesOrderLine, SalesOrderLines } from '../../data/collections';
import { Products, Product } from '../../data/collections';
import { ProductTypeList, ProjectStatusList, AlertLevelList, LanguageList, MilestoneStatusList } from '../../data/choicelists';
import { Tasks, Task, Employees, Employee, EmployeeGroups, EmployeeGroup } from '../../data/collections';
import { Milestones, Milestone } from '../../data/collections';
import { IntercompanyAgreements, IntercompanyAgreement } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';

import ExpandableSection from '../controls/ExpandableSection';
import ItemTableList from '../controls/ItemTableList';
import ItemBlockList from '../controls/ItemBlockList';
import ProgressBar from '../controls/ProgressBar';
import FormInput from '../controls/FormInput';
import CloseButton from '../controls/CloseButton';

import Spinner from '../widgets/Spinner';
import EmployeeBadge from '../widgets/EmployeeBadge';
import BillableStatus from '../widgets/BillableStatus';
import TimeBudgetWidget from '../widgets/TimeBudgetWidget';
import ObjectInfoCard from '../widgets/ObjectInfoCard';
import { TimeGraphComponent, DataCurve, TimeMarker } from '../widgets/GraphComponents';

import { EmployeeCard, EmployeeGroupCard } from '../subviews/EmployeeManagementLists';
import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';
import IntercompanyAgreementModal from '../subviews/IntercompanyAgreementModal';


interface props {
	projectId: string,
	project: Project,
	partner: Partner,
	company: Company,
	salesOrders: SalesOrder[],
	salesOrderLines: SalesOrderLine[],
	products: Product[],
	tasks: Task[],
	milestones: Milestone[],
	employees: Employee[],
	employeeGroups: EmployeeGroup[],
	intercompanyAgreements: IntercompanyAgreement[],
	subReady: boolean,
}
interface state {
	selectedTaskId?: string,
	selectedMilestoneId?: string,
	selectedSalesOrderLineId?: string,
	canEditProjects?: boolean,
	showGroups?: boolean,
	showEmployees?: boolean,
	showExternalEmployees?: boolean,

	// agreement
	employeeIdForAgreement?: string,
	taskIdForAgreement?: string,

	// analytics params
	currentAnalyticsCoord?: number,
	currentAnalyticsDaysRange?: number,
	tasksDataApprovedHours?: { [index: string]: { x: string, y: number }[] },
}



class ProjectManagementContainer extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			selectedTaskId: '',
			selectedMilestoneId: '',
			selectedSalesOrderLineId: '',
			currentAnalyticsCoord: 0,
			currentAnalyticsDaysRange: 12,
			employeeIdForAgreement: '',
			taskIdForAgreement: '',

			// analytics data init
			tasksDataApprovedHours: {},
		};

		this.checkOperationsPermitted(props);

		this.handleProjectNameChange = this.handleProjectNameChange.bind(this);
		this.handleProjectDescriptionChange = this.handleProjectDescriptionChange.bind(this);
		this.handleProjectLanguageChange = this.handleProjectLanguageChange.bind(this);
		this.handleProjectStatusChange = this.handleProjectStatusChange.bind(this);
		this.handleProjectAlertLevelChange = this.handleProjectAlertLevelChange.bind(this);
		this.handleProjectBeginDateChange = this.handleProjectBeginDateChange.bind(this);
		this.handleProjectEndDateChange = this.handleProjectEndDateChange.bind(this);

		this.handleNewTask = this.handleNewTask.bind(this);
		this.handleTaskClick = this.handleTaskClick.bind(this);
		this.handleTaskCreate = this.handleTaskCreate.bind(this);
		this.handleTaskDelete = this.handleTaskDelete.bind(this);
		this.handleTaskUpdate = this.handleTaskUpdate.bind(this);
		this.handleTaskReorder = this.handleTaskReorder.bind(this);

		this.handleNewMilestone = this.handleNewMilestone.bind(this);
		this.handleMilestoneClick = this.handleMilestoneClick.bind(this);
		this.handleMilestoneCreate = this.handleMilestoneCreate.bind(this);
		this.handleMilestoneDelete = this.handleMilestoneDelete.bind(this);
		this.handleMilestoneUpdate = this.handleMilestoneUpdate.bind(this);

		this.handleNewSalesOrderLine = this.handleNewSalesOrderLine.bind(this);
		this.handleSalesOrderLineClick = this.handleSalesOrderLineClick.bind(this);
		this.handleSalesOrderLineCreate = this.handleSalesOrderLineCreate.bind(this);
		this.handleSalesOrderLineUpdate = this.handleSalesOrderLineUpdate.bind(this);
		this.handleSalesOrderLineDelete = this.handleSalesOrderLineDelete.bind(this);

		this.handleCloseTab = this.handleCloseTab.bind(this);

		this.handleToggleGroupsView = this.handleToggleGroupsView.bind(this);
		this.handleToggleEmployeesView = this.handleToggleEmployeesView.bind(this);
		this.handleCloseGroupsAndEmployees = this.handleCloseGroupsAndEmployees.bind(this);
		this.handleShowInternalEmployees = this.handleShowInternalEmployees.bind(this);
		this.handleShowExternalEmployees = this.handleShowExternalEmployees.bind(this);

		this.handleDropOnManagers = this.handleDropOnManagers.bind(this);
		this.handleDropOnMembers = this.handleDropOnMembers.bind(this);
		this.handleDropOnGroups = this.handleDropOnGroups.bind(this);
		this.handleDropOnTask = this.handleDropOnTask.bind(this);
		this.handleDropOnTrash = this.handleDropOnTrash.bind(this);

		this.handleAgreementCancel = this.handleAgreementCancel.bind(this);

		this.handleAnalyticsViewChange = this.handleAnalyticsViewChange.bind(this);
		this.scrollAnalyticsPane = this.scrollAnalyticsPane.bind(this);
	}

	_refsInit = false;
	_scrollContainer: any;
	_analyticsPane: any;
	_tasksLineRefs: any[] = [];


	// LIFECYCLE

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
		// fetch data for tasks
		if (newProps.tasks && newProps.tasks.length) {
			// ask data for new tasks
			for (let i = 0; i < newProps.tasks.length; i++) {
				let task = newProps.tasks[i];
				if (this.state.tasksDataApprovedHours[task._id]) { continue; }
				Meteor.call('analytics.task.hours.approved', task._id, (err, res) => {
					if (err) {
						console.error(err);
						return;
					}

					let data = this.state.tasksDataApprovedHours;
					data[task._id] = res;

					// add value for current time
					if (res && res.length) {
						res.push({
							x: new Date().toISOString(),
							y: res[res.length-1].y,
						});
					}

					this.setState({
						tasksDataApprovedHours: data
					});
				});
			}
		}
	}


	// DATA HANDLERS

	checkOperationsPermitted(props: props) {
		Meteor.call('can.do', {
			collectionName: 'Projects',
			operation: CollectionOperation.UPDATE,
		}, (err, res) => {
			this.setState({ canEditProjects: !err && res ? true : false })
		});
	}

	handleProjectNameChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			name: new_val
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}
	handleProjectDescriptionChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			description: new_val
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}
	handleProjectLanguageChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			languageCode: new_val
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}
	handleProjectStatusChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			projectStatus: parseInt(new_val)
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}
	handleProjectAlertLevelChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			alertLevel: parseInt(new_val)
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}
	handleProjectBeginDateChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			beginDate: new_val
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}
	handleProjectEndDateChange(new_val) {
		Meteor.call('project.update', { projectId: this.props.project._id, newValues: {
			endDate: new_val
		}}, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project has been successfully updated.'));
		});
	}

	handleNewTask(event) {
		this.setState({
			selectedTaskId: 'new',
			selectedMilestoneId: '',
			selectedSalesOrderLineId: '',
		});
		event.stopPropagation();
	}
	handleTaskClick(item: any) {
		if(this.state.selectedTaskId != item._id) {
			this.setState({
				selectedTaskId: item._id,
				selectedMilestoneId: '',
				selectedSalesOrderLineId: '',
			});
		} else {
			this.setState({
				selectedTaskId: '',
				selectedMilestoneId: '',
				selectedSalesOrderLineId: '',
			});
		}
	}
	handleTaskUpdate(taskId: string, values: Object) {
		Meteor.call('task.update', { taskId, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Task update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Task has been successfully updated.'));
		});
	}
	handleTaskCreate(taskId: string, values: Object) {
		Meteor.call('task.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Task creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Task has been successfully created.'));
			this.handleCloseTab();
		});
	}
	handleTaskDelete(taskId: string) {
		if(confirm(i18n.__("Are you sure you want to delete this task?"))) {
			Meteor.call('task.delete', taskId, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Task deletion failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Task has been successfully deleted.'));
				this.handleCloseTab();
			});
		}
	}
	handleTaskReorder(taskId: string, orderIndex: number) {
		Meteor.call('task.update', { taskId, newValues: { orderIndex }});
	}

	handleNewMilestone(event) {
		this.setState({
			selectedMilestoneId: 'new',
			selectedTaskId: '',
			selectedSalesOrderLineId: '',
		});
		event.stopPropagation();
	}
	handleMilestoneClick(item: any) {
		if(this.state.selectedMilestoneId != item._id) {
			this.setState({
				selectedMilestoneId: item._id,
				selectedTaskId: '',
				selectedSalesOrderLineId: '',
			});
		} else {
			this.setState({
				selectedMilestoneId: '',
				selectedTaskId: '',
				selectedSalesOrderLineId: '',
			});
		}
	}
	handleMilestoneUpdate(milestoneId: string, values: Object) {
		Meteor.call('milestone.update', { milestoneId, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Milestone update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Milestone has been successfully updated.'));
		});
		
	}
	handleMilestoneCreate(milestoneId: string, values: Object) {
		Meteor.call('milestone.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Milestone creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Milestone has been successfully created.'));
			this.handleCloseTab();
		});
		
	}
	handleMilestoneDelete(milestoneId: string) {
		if(confirm(i18n.__("Are you sure you want to delete this milestone?"))) {
			Meteor.call('milestone.delete', milestoneId, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Milestone deletion failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Milestone has been successfully deleted.'));
				this.handleCloseTab();
			});
		}
		
	}

	handleNewSalesOrderLine(event) {
		this.setState({
			selectedSalesOrderLineId: 'new',
			selectedTaskId: '',
			selectedMilestoneId: '',
		});
		event.stopPropagation();
	}
	handleSalesOrderLineClick(item: any) {
		if(this.state.selectedSalesOrderLineId != item._id) {
			this.setState({
				selectedSalesOrderLineId: item._id,
				selectedTaskId: '',
				selectedMilestoneId: '',
			});
		} else {
			this.setState({
				selectedSalesOrderLineId: '',
				selectedTaskId: '',
				selectedMilestoneId: '',
			});
		}
	}
	handleSalesOrderLineUpdate(lineId: string, values: Object) {
		Meteor.call('salesorderline.update', { lineId, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Billing Section update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Billing Section has been successfully updated.'));
		});
		
	}
	handleSalesOrderLineCreate(lineId: string, values: Object) {
		Meteor.call('salesorderline.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Billing Section creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Billing Section has been successfully created.'));
			this.handleCloseTab();
		});		
	}
	handleSalesOrderLineDelete(lineId: string) {
		if(confirm(i18n.__("Are you sure you want to delete this milestone?"))) {
			Meteor.call('salesorderline.delete', lineId, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Billing Section deletion failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Billing Section has been successfully deleted.'));
				this.handleCloseTab();
			});
		}		
	}

	handleCloseTab() {
		this.setState({
			selectedTaskId: '',
			selectedMilestoneId: '',
			selectedSalesOrderLineId: '',
		});
	}

	handleToggleGroupsView() {
		this.setState({ showGroups: !this.state.showGroups, showEmployees: false });
	}
	handleToggleEmployeesView() {
		this.setState({ showEmployees: !this.state.showEmployees, showGroups: false });
	}
	handleCloseGroupsAndEmployees() {
		this.setState({ showGroups: false, showEmployees: false });
	}
	handleShowInternalEmployees() {
		this.setState({ showExternalEmployees: false });
	}
	handleShowExternalEmployees() {
		this.setState({ showExternalEmployees: true });
	}

	// drag n drop handlers
	handleDropOnManagers(type: string, object: any) {
		if (type == 'employee-card' && object.employeeId) {
			//this.assignEmployeeToProject(object.employeeId, this.objectCardProps.project, true);
			Meteor.call('assign.employee.project', this.props.projectId, object.employeeId, true, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Employee could not be assigned to the project as manager (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Employee has been successfully assigned to the project as manager.'));
			});
		}
	}
	handleDropOnMembers(type: string, object: any) {
		if (type == 'employee-card' && object.employeeId) {
			//this.assignEmployeeToProject(object.employeeId, this.objectCardProps.project);
			Meteor.call('assign.employee.project', this.props.projectId, object.employeeId, false, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Employee could not be assigned to the project (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Employee has been successfully assigned to the project.'));
			});
		}
	}
	handleDropOnGroups(type: string, object: any) {
		if (type == 'group-card' && object.groupId) {
			//this.assignGroupToProject(object.groupId, this.objectCardProps.project);
			Meteor.call('assign.group.project', this.props.projectId, object.groupId, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Group could not be assigned to the project (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Group has been successfully assigned to the project.'));
			});
		}
	}
	handleDropOnTrash(type: string, object: any) {
		if (type == 'employee-card' && object.employeeId) {
			Meteor.call('unassign.employee.project', this.props.projectId, object.employeeId, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Employee could not be unassigned from the project (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Employee has been successfully unassigned from the project.'));
			})
		}
	}
	handleDropOnTask(task: Task, type: string, object: any) {
		// employee
		if (type == 'employee-card' && object.employeeId) {
			Meteor.call('assign.employee.task', task._id, object.employeeId, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Employee could not be assigned to task (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Employee has been successfully assigned to the task.'));
			});
		}

		// external resource
		else  if (type == 'external-employee-card' && object.employeeId) {
			this.setState({ employeeIdForAgreement: object.employeeId, taskIdForAgreement:task._id });
		}
	}

	handleAgreementCancel() {
		this.setState({ employeeIdForAgreement: '', taskIdForAgreement: '' });
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


	render() {
		if(!this.props.subReady) {
			return <Spinner className="height-100" />;
		}

		if(!this.props.project) {
			return <div>
				Error: project not found
			</div>;
		}

		// creation mode
		let isTaskCreationMode = this.state.selectedTaskId == 'new';
		let isMilestoneCreationMode = this.state.selectedMilestoneId == 'new';
		let isLineCreationMode = this.state.selectedSalesOrderLineId == 'new';

		let billing_items = [];
		for(let i = 0; i < this.props.salesOrderLines.length; i++) {
			let line = this.props.salesOrderLines[i];
			let product = this.props.products.find(p => p.code == line.productCode && p.companyCode == line.companyCode) || {} as any;

			let progressbar = <ProgressBar progress={line.amountPaid / line.amountSold} label={(Math.min(1, line.amountPaid / line.amountSold) * 100).toFixed(0) + "%"}/>;

			billing_items.push({
				_id: line._id,
				description: line.description,
				// productCode: <Link className="inline" to={"/products/"+product._id}>{product.code}</Link>,
				productCode: product.code,
				productType: product.type,
				amountSold: line.amountSold,
				amountPaid: line.amountPaid,
				deliveryRatio: progressbar
			});
		}

		// billing section cols
		let billing_columns: { [index: string]: any } = {};
		billing_columns['description'] = { label: i18n.__('Description'), widthRatio: 0.3};
		billing_columns['productCode'] = { label: i18n.__('Product Code'), widthRatio: 0.15};
		billing_columns['productType'] = { label: i18n.__('Type'), mapping: ProductTypeList};
		billing_columns['amountSold'] = { label: i18n.__('Amount Sold') };
		billing_columns['amountPaid'] = { label: i18n.__('Amount Paid') };
		billing_columns['deliveryRatio'] = { label: i18n.__('Delivery Status'),
			widthRatio: 0.25
		};

		// milestone cols
		let milestoneCols: { [index: string]: any } = {};
		milestoneCols['date'] = { label: i18n.__('Date'),
			widthRatio: 0.15, transform: val => moment(val).format('LL') };
		milestoneCols['milestoneStatus'] = { label: i18n.__('Status'), mapping: MilestoneStatusList };

		// external resources cols
		let intercompanyAgreementsCols = {
			taskName: {
				label: i18n.__('Task'),
			},
			employeeName: {
				label: i18n.__('Employee'),
			},
			hoursAmount: {
				label: i18n.__('Hours Budget'),
				transform: val => DateTools.convertTimeNumberToString(val)
			},
			hourlyRate: {
				label: i18n.__('Hourly Rate')
			},
			isApproved: {
				label: i18n.__('Agreement Status'),
				mapping: [
					{ value: true, label: i18n.__('approved') },
					{ value: false, label: i18n.__('not approved') }
				]
			},
			hoursRemaining: {
				label: i18n.__('Hours Remaining'),
				transform: val => DateTools.convertTimeNumberToString(val)
			},
		};
		let intercompanyAgreements = this.props.intercompanyAgreements.map(agreement => {
			let employee = this.props.employees.find(e => e._id == agreement.employeeId);
			return {
				isApproved: agreement.isApproved,
				hoursAmount: agreement.hoursAmount,
				hoursRemaining: agreement.hoursRemaining,
				hourlyRate: `${agreement.hourlyRate.toFixed(2)} ${agreement.currency}`,
				employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'unknown',
				taskName: agreement.taskName,
			};
		});

		// compute a list of task external resources with additional info
		let tasksExternalResources = {};	// key is taskId

		for (let i = 0; i < this.props.tasks.length; i++) {
			let task = this.props.tasks[i];
			tasksExternalResources[task._id] = task.assignedExternalResources.map(id => {
				let employee = this.props.employees.find(e => e._id == id) || {} as Employee;
				let agreements = this.props.intercompanyAgreements.filter(a => a.employeeId == id && a.taskId == task._id);

				// let's generate a summary of the agreements
				let agreementInfo = agreements.length + ' ' + i18n.__('agreements for this employee') + ':';
				agreements.forEach(a => agreementInfo += `\nBudget: ${a.hoursAmount} hours, status: ${a.isApproved ? 'approved' : 'not approved'}`);

				return Object.assign({}, employee, {
					agreementApproved: agreements.findIndex(a => a.isApproved) > -1,
					agreementInfo,
				});
			});			
		}

		// generate task list with inserters
		let tasksList = [<TaskCardInserter key={0} orderIndex={-0.5} onDrop={this.handleTaskReorder} isFirst={true} />];
		this.props.tasks
			.sort(Tools.getSortFunctionByProp('orderIndex'))
			.forEach((task, index) => {
				tasksList.push(
					<TaskCard
						task={task}
						salesOrderLine={this.props.salesOrderLines.find(l => l._id == task.salesOrderLineId)}
						selected={task._id == this.state.selectedTaskId}
						allowDrop={this.state.canEditProjects}
						onDrop={this.handleDropOnTask}
						onClick={() => this.handleTaskClick(task)}
						allowReorder={this.state.canEditProjects}
						ref={element => { this._tasksLineRefs[task._id] = element; }}
						orderIndex={index}
						key={task._id}
						assignedEmployees={this.props.employees.filter(e => task.assignedEmployees.indexOf(e._id) > -1)}
						assignedExternalResources={tasksExternalResources[task._id]}
					/>,
					<TaskCardInserter
						orderIndex={task.orderIndex+0.5}
						onDrop={this.handleTaskReorder}
						isLast={index == this.props.tasks.length-1}
						key={'ins'+index}
					/>
				);
			});

		// linked sales orders
		let so_codes = [];
		for(let i = 0; i < this.props.salesOrders.length; i++) {
			so_codes.push(this.props.salesOrders[i].code);
		}

		// dates
		// let begindate = (this.props.project.beginDate || "").substr(0, 10);
		// let enddate = (this.props.project.endDate || "").substr(0, 10);

		// billing sections list
		let billingSectionsList = this.props.salesOrderLines.map(line => {
			return {
				value: line._id,
				label: line.description
			}
		});
		billingSectionsList.unshift({
			value: '',
			label: i18n.__('none'),
		});

		// my members, managers and groups
		let managers = (this.props.project.assignedManagers || []).map(id =>
			this.props.employees.find(e => e._id == id) || {} as Employee
		);
		let members = (this.props.project.assignedMembers || []).map(id =>
			this.props.employees.find(e => e._id == id) || {} as Employee
		);
		let groups = (this.props.project.assignedGroups || []).map(id =>
			this.props.employeeGroups.find(g => g._id == id) || {} as EmployeeGroup
		);

		// group cards
		let inMyGroups = (groupId: string) => {
			return (this.props.project.assignedGroups || []).indexOf(groupId) > -1;
		};
		let groupListTransform = g =>
			<div className="flex-no-shrink" key={g._id}>
				<EmployeeGroupCard
					group={g}
					employeeGroups={this.props.employeeGroups}
					employees={this.props.employees}
					allowDrag={true}
					allowDrop={true}
					showSelected={inMyGroups(g._id)}
				/>
			</div>;

		// employee cards
		let inMyEmployees = (employeeId: string) => {
			return (this.props.project.assignedMembers || []).indexOf(employeeId) > -1
				|| (this.props.project.assignedManagers || []).indexOf(employeeId) > -1;
		};
		let employeeListTransform = e =>
			<div className="flex-no-shrink" key={e._id}>
				<EmployeeCard
					employee={e}
					employeeGroups={this.props.employeeGroups}
					employees={this.props.employees}
					showGroups={true}
					allowDrag={true}
					allowDrop={true}
					showSelected={inMyEmployees(e._id)}
					overrideDragType={this.state.showExternalEmployees ? 'external-employee-card' : null}
				/>
			</div>;

		// employees & external resources assigned to task
		let currentTaskEmployees = [];
		let currentTaskExternalResources = [];
		if (this.state.selectedTaskId && !isTaskCreationMode) {
			let employeeMapping = (methodName: string) => e =>
				<div className="flex-row flex-center" key={e._id}>
					<EmployeeCard
						employee={e}
						employeeGroups={this.props.employeeGroups}
						employees={this.props.employees}
						showGroups={true}
					/>
					<div className="spacer-col flex-no-shrink" />
					{
						this.state.canEditProjects &&
						<div
							className="button action-danger flex-no-shrink"
							onClick={() => Meteor.call(methodName, this.state.selectedTaskId, e._id, (err, res) => {
								if (err) { showErrorMessage(err.reason || i18n.__('Employee could not be unassigned from task (unknown reason).')); }
								else { showInformationMessage(i18n.__('Employee has been successfully unassigned from task.')); }
							})}
						>
							{i18n.__('UNASSIGN')}
						</div>
					}
				</div>;

			currentTaskEmployees = this.props.tasks.find(t => t._id == this.state.selectedTaskId).assignedEmployees
				.map(id => this.props.employees.find(e => e._id == id))
				.map(employeeMapping('unassign.employee.task'));

			currentTaskExternalResources = this.props.tasks.find(t => t._id == this.state.selectedTaskId).assignedExternalResources
				.map(id => this.props.employees.find(e => e._id == id))
				.map(employeeMapping('unassign.externalResource.task'));
		}

		// products list
		let productsList = this.props.products.map(p => {
			return {
				label: p.name,
				value: p.code,
			};
		});

		// task form objectCardProps
		let taskFormProps: PropertyInfo[] = [
			{
				propName: 'projectId',
				hidden: true,
				excludeFromCallbacks: !isTaskCreationMode,
			},
			{
				propName: 'name',
				label: i18n.__('Name'),
				editable: this.state.canEditProjects || isTaskCreationMode,
			},
			{
				propName: 'totalTime',
				label: i18n.__('Total Time'),
				editable: this.state.canEditProjects || isTaskCreationMode,
				inputType: 'time',
				inputSize: 'x-small',
			},
			{
				propName: 'beginDate',
				label: i18n.__('Begin Date'),
				editable: this.state.canEditProjects || isTaskCreationMode,
				inputType: 'date',
				inputSize: 'small',
			},
			{
				propName: 'endDate',
				label: i18n.__('End Date'),
				editable: this.state.canEditProjects || isTaskCreationMode,
				inputType: 'date',
				inputSize: 'small',
			},
			{
				propName: 'salesOrderLineId',
				label: i18n.__('Billing Section'),
				editable: this.state.canEditProjects || isTaskCreationMode,
				inputType: 'combo',
				valueList: billingSectionsList,
			},
			{
				propName: 'baseDuration',
				label: i18n.__('Default Timesheet Duration'),
				editable: this.state.canEditProjects || isTaskCreationMode,
				inputType: 'time',
				inputSize: 'x-small',
			},
			{
				propName: 'minEntryDuration',
				label: i18n.__('Minimum Timesheet Duration'),
				editable: this.state.canEditProjects || isTaskCreationMode,
				inputType: 'time',
				inputSize: 'x-small',
			},
		];

		// milestone form objectCardProps
		let milestoneFormProps: PropertyInfo[] = [
			{
				propName: 'projectId',
				hidden: true,
				excludeFromCallbacks: !isMilestoneCreationMode,
			},
			{
				propName: 'date',
				label: i18n.__('Date'),
				editable: this.state.canEditProjects || isMilestoneCreationMode,
				inputType: 'date',
				inputSize: 'small',
			},
			{
				propName: 'milestoneStatus',
				label: i18n.__('Status'),
				editable: this.state.canEditProjects || isMilestoneCreationMode,
				inputType: 'combo',
				valueList: MilestoneStatusList,
			},
		];

		// sales order line form objectCardProps
		let lineFormProps: PropertyInfo[] = [
			{
				propName: 'projectCode',
				hidden: true,
				excludeFromCallbacks: !isLineCreationMode,
			},
			{
				propName: 'companyCode',
				hidden: true,
				excludeFromCallbacks: !isLineCreationMode,
			},
			{
				propName: 'code',
				label: i18n.__('Code'),
				editable: isLineCreationMode,
				inputSize: 'medium',
				excludeFromCallbacks: !isLineCreationMode,
			},
			{
				propName: 'productCode',
				label: i18n.__('Product'),
				editable: this.state.canEditProjects || isLineCreationMode,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: productsList,
				placeholder: ' ',
			},
			{
				propName: 'description',
				label: i18n.__('Description'),
				editable: this.state.canEditProjects || isLineCreationMode,
			},
			{
				propName: 'amountSold',
				label: i18n.__('Amount Sold'),
				editable: this.state.canEditProjects || isLineCreationMode,
				inputType: 'number',
				inputSize: 'small',
			},
            {
                propName: 'amountHours',
                label: i18n.__('Hours Amount'),
                editable: this.state.canEditProjects || isLineCreationMode,
                inputType: 'time',
                inputSize: 'x-small',
            },
			{
				propName: 'amountPaid',
				label: i18n.__('Amount Paid'),
				editable: this.state.canEditProjects && !isLineCreationMode,
				inputType: 'number',
				inputSize: 'small',
			},
			{
				propName: 'hoursBudgetConstrained',
				label: i18n.__('Hours Budget Constrained'),
				editable: this.state.canEditProjects,
				inputType: 'toggle',
			}
		];

		// selected object (for input form)
		let selectedTask = null;
		let selectedMilestone = null;
		let selectedLine = null;
		let selectedLineTasks:any[] = null;
		let sumHoursTasks = 0;
		if (isTaskCreationMode) {
			selectedTask = { _id: 'new', projectId: this.props.projectId };
		}
		else if (isMilestoneCreationMode) {
			selectedMilestone = { _id: 'new', projectId: this.props.projectId };
		}
		else if (isLineCreationMode) {
			selectedLine = {
				_id: 'new',
				projectCode: this.props.project.code,
				companyCode: this.props.project.companyCode,
				hoursBudgetConstrained: true,
				amountPaid: 0,
			};
		}
		else if (this.state.selectedTaskId) {
			selectedTask = this.props.tasks.find(t => t._id == this.state.selectedTaskId);
		}
		else if (this.state.selectedMilestoneId) {
			selectedMilestone = this.props.milestones.find(m => m._id == this.state.selectedMilestoneId);
		}
		else if (this.state.selectedSalesOrderLineId) {
			selectedLine = this.props.salesOrderLines.find(l => l._id == this.state.selectedSalesOrderLineId);

			// linked tasks
			selectedLineTasks = this.props.tasks.filter(t => t.salesOrderLineId == this.state.selectedSalesOrderLineId);
			selectedLineTasks.forEach(lineTask => sumHoursTasks += lineTask.totalTime);

			selectedLineTasks = selectedLineTasks.map(task =>
					<TaskCard
						task={task}
						salesOrderLine={this.props.salesOrderLines.find(l => l._id == task.salesOrderLineId)}
						key={task._id}
						showSmallGraph={true}
					/>
				);
		}

		// new agreement values
		let newAgreement = null;
		if (this.state.employeeIdForAgreement && this.state.taskIdForAgreement) {
			let e = this.props.employees.find(e => e._id == this.state.employeeIdForAgreement) || {} as Employee;
			newAgreement = {
				taskId: this.state.taskIdForAgreement,
				taskName: (this.props.tasks.find(t => t._id == this.state.taskIdForAgreement) || {} as any).name,
				projectName: this.props.project.name,
				employeeId: e._id, employeeName: `${e.firstName} ${e.lastName}`,
				hourlyRate: e.hourlySessionPrice,
				currency: this.props.company.defaultCurrency,
			};
		}

		return (
			<div className="flex-col management-page-container">

				<div className="flex-row flex-no-shrink">

					<div className="flex-grow flex-col">
						<div className="font25 flex-row">
							"<FormInput
								className="display-inlineblock flex-grow"
								seeThrough={true}
								value={this.props.project.name}
								receiveNewValue={this.handleProjectNameChange}
								confirmNewValue={true}
								editable={this.state.canEditProjects}
							/>"
						</div>
						<div className="flex-row">
							<div className="flex-col width-33">
								<div className="border-bottom padding-s">
									<span className="small secondary">{ i18n.__('Company') }</span><br/>
									<Link className="inline nowrap" to={"/companies/"+this.props.company._id}>{this.props.company.name}</Link>
								</div>
								<div className="border-bottom padding-s">
									<span className="small secondary">{ i18n.__('Customer') }</span><br/>
									<Link className="inline nowrap" to={"/partners/"+this.props.partner._id}>{this.props.partner.name}</Link>
								</div>
								<div className="border-bottom padding-s">
									<span className="small secondary">{ i18n.__('Language') }</span><br/>
									<FormInput
										inputType="select"
										seeThrough={true}
										valuesList={ LanguageList }
										value={this.props.project.languageCode}
										receiveNewValue={this.handleProjectLanguageChange}
										confirmNewValue={true}
										editable={this.state.canEditProjects}
									/>
								</div>
								<div className="padding-s">
									<span className="small secondary">{ i18n.__('Sales Orders') }</span><br/>
									{ so_codes.map(code => <pre key={code} className="inline">{code}</pre>) }
								</div>
							</div>
							<div className="flex-col flex-grow">
								<div className="flex-grow border-bottom border-left padding-s flex-col">
									<span className="small secondary">{ i18n.__('Description') }</span>
									<FormInput
										className="flex-grow"
										multiline={true}
										seeThrough={true}
										baseLineCount={3}
										value={this.props.project.description}
										receiveNewValue={this.handleProjectDescriptionChange}
										confirmNewValue={true}
										editable={this.state.canEditProjects}
									/>
								</div>
								<div className="border-bottom border-left padding-s">
									<span className="small secondary">{ i18n.__('Validity dates') }</span><br/>
									<FormInput
										className="display-inlineblock"
										seeThrough={true}
										value={this.props.project.beginDate}
										confirmNewValue={true}
										receiveNewValue={this.handleProjectBeginDateChange}
										editable={this.state.canEditProjects}
										isStartDate={true}
										dateRangeStart={this.props.project.beginDate}
										dateRangeEnd={this.props.project.endDate}
										inputType="date"
									/>
									<span className="secondary"> { i18n.__('to') } </span>
									<FormInput
										className="display-inlineblock"
										seeThrough={true}
										value={this.props.project.endDate}
										confirmNewValue={true}
										receiveNewValue={this.handleProjectEndDateChange}
										editable={this.state.canEditProjects}
										isEndDate={true}
										dateRangeStart={this.props.project.beginDate}
										dateRangeEnd={this.props.project.endDate}
										inputType="date"
									/>
								</div>
								<div className="border-left padding-s">
									<span className="small secondary">{ i18n.__('Project Code') }</span><br/>
									<pre className="inline">{this.props.project.code}</pre>
								</div>
							</div>
						</div>
					</div>

					<div className="spacer-col" />

					<div className="flex-col">
						<div className="flex-col">
							<div className="title light-text">{ i18n.__('Project status') }</div>
							<FormInput
								inputType="select"
								className="font14"
								seeThrough={true}
								valuesList={ProjectStatusList}
								value={this.props.project.projectStatus}
								receiveNewValue={this.handleProjectStatusChange}
								confirmNewValue={true}
								editable={this.state.canEditProjects}
							/>
						</div>
						<div className="spacer-row" />
						<div className="flex-col">
							<div className="title light-text">{ i18n.__('Alert level') }</div>
							<FormInput
								inputType="select"
								className="alert-level-selector"
								valuesList={AlertLevelList}
								value={this.props.project.alertLevel}
								receiveNewValue={this.handleProjectAlertLevelChange}
								confirmNewValue={true}
								showAllValues={true}
								editable={this.state.canEditProjects}
							/>
						</div>
					</div>

					<div className="spacer-col" />

					<div className="width-25 flex-col">

						<div className="flex-row">
							<div
								className="nav-link small flex-grow"
								onClick={this.handleToggleGroupsView}
							>{ i18n.__(`${this.state.showGroups ? 'hide' : 'show'} groups`) }</div>
							<div className="spacer-col" />
							<div
								className="nav-link small flex-grow"
								onClick={this.handleToggleEmployeesView}
							>{ i18n.__(`${this.state.showEmployees ? 'hide' : 'show'} employees`) }</div>
						</div>

						<div className="spacer-row" />

						<div className="flex-row flex-grow">
							<ObjectInfoCard
								droppable={this.state.canEditProjects}
								droppableTypes={['employee-card']}
								className="flex-grow"
								onDrop={this.handleDropOnManagers}
							>
								<div className="title">{ i18n.__('Managers') }</div>
								<div className="flex-row flex-wrap">
								{
									managers.map((e, index) =>
										<EmployeeBadge key={index} employeeName={`${e.firstName} ${e.lastName}`}
											additionalInfo={e.companyCode != this.props.company.code ? 'External resource' : null}
											draggable={true} draggableType={'employee-card'} draggableObject={{ employeeId: e._id }} />
									)
								}
								</div>
							</ObjectInfoCard>
							<div className="spacer-col small" />
							<ObjectInfoCard
								droppable={this.state.canEditProjects}
								droppableTypes={['employee-card']}
								className="flex-grow"
								onDrop={this.handleDropOnMembers}
							>
								<div className="title">{ i18n.__('Members') }</div>
								<div className="flex-row flex-wrap">
								{
									members.map((e, index) =>
										<EmployeeBadge key={index} employeeName={`${e.firstName} ${e.lastName}`}
											additionalInfo={e.companyCode != this.props.company.code ? 'External resource' : null}
											draggable={true} draggableType={'employee-card'} draggableObject={{ employeeId: e._id }} />
									)
								}
								</div>
							</ObjectInfoCard>
							<div className="spacer-col small" />
							<ObjectInfoCard
								droppable={true}
								droppableTypes={['employee-card']}
								onDrop={this.handleDropOnTrash}
								className="trash"
							>
							</ObjectInfoCard>
						</div>

						<div className="spacer-row" />

						<ObjectInfoCard
							droppable={this.state.canEditProjects}
							droppableTypes={['group-card']}
							onDrop={this.handleDropOnGroups}
						>
							<div className="title">{ i18n.__('Groups') }</div>
							{
								groups.map((g, index) =>
									<div className="small-tag front" key={index}>
										{g && g.name}
										<div
											onClick={() => Meteor.call('unassign.group.project', this.props.projectId, g._id, (err, res) => {
												if (err) { showErrorMessage(err.reason || i18n.__('Group could not be unassigned from project (unknown reason).')); }
												else { showInformationMessage(i18n.__('Group has been successfully unassigned from project.')); }
											})}
											className="small-icon-delete"/>
									</div>
								)
							}
						</ObjectInfoCard>

					</div>

					<div className="spacer-col" />

				</div>

				<div className="spacer-row" />

				<div className="flex-grow flex-row height-100 pos-relative">

					<div
						className="scroll-y width-exclude-side-pane"
						ref={(el) => { this._scrollContainer = el; }}
					>
						<ExpandableSection
							title={
								<div className="flex-row flex-center flex-start">
									<div className="font15 flex-grow">{ i18n.__("Billing Sections") }</div>
									<div className="spacer-col" />
									<button
										className={ `action-add small ${this.state.canEditProjects ? '' : 'disabled'}` }
										onClick={this.handleNewSalesOrderLine}>
										{ i18n.__('NEW BILLING SECTION') }
									</button>
									<div className="spacer-col small" />
								</div>
							}
							expanded={true}>
							<div className="section-row">
								<ItemTableList
									columns={billing_columns}
									items={billing_items}
									enableSorting={true}
									itemsInteractable={true}
									onItemClick={this.handleSalesOrderLineClick}
									selectedIndices={[
										this.props.salesOrderLines.findIndex(l => l._id == this.state.selectedSalesOrderLineId)
									]}
								/>
							</div>
						</ExpandableSection>

						<div className="spacer-row" />

						<ExpandableSection
							title={
								<div className="flex-row flex-center flex-start">
									<div className="font15 flex-grow">{ i18n.__("Tasks") }</div>
									<div className="spacer-col" />
									<button
										className={ `action-add small ${this.state.canEditProjects ? '' : 'disabled'}` }
										onClick={this.handleNewTask}>
										{ i18n.__('NEW TASK') }
									</button>
									<div className="spacer-col small" />
								</div>
							}
							expanded={true}>
							<div className="section-row">
								<ItemBlockList
									items={tasksList}
									showSearchBar={false}
									className="flex-grow"
								/>
							</div>
						</ExpandableSection>

						<div className="spacer-row" />

						<ExpandableSection
							title={
								<div className="flex-row flex-center flex-start">
									<div className="font15 flex-grow">{ i18n.__("Milestones") }</div>
									<div className="spacer-col" />
									<button
										className={ `action-add small ${this.state.canEditProjects ? '' : 'disabled'}` }
										onClick={this.handleNewMilestone}>
										{ i18n.__('NEW MILESTONE') }
									</button>
									<div className="spacer-col small" />
								</div>
							}
							expanded={true}
						>
							<ItemTableList
								columns={milestoneCols}
								items={this.props.milestones}
								enableSorting={true}
								itemsInteractable={true}
								onItemClick={this.handleMilestoneClick}
								selectedIndices={[
									this.props.milestones.findIndex(m => m._id == this.state.selectedMilestoneId)
								]}
							/>
						</ExpandableSection>

						<div className="spacer-row" />

						<ExpandableSection
							title={
								<div className="flex-row flex-center flex-start">
									<div className="font15 flex-grow">{ i18n.__("External Resources") }</div>
								</div>
							}
							expanded={true}
						>
							<ItemTableList
								columns={intercompanyAgreementsCols}
								items={intercompanyAgreements}
								enableSorting={true}
							/>
						</ExpandableSection>

						<div className="spacer-row" />

					</div>

					<div
						className="flex-grow pos-relative scroll-hidden"
						ref={(el) => { this._analyticsPane = el; } }
					>
						{
							this.props.tasks.map((task, index) => {
								if (!this._tasksLineRefs[task._id]) { return ''; }
								let rect = ReactDOM.findDOMNode(this._tasksLineRefs[task._id]).getBoundingClientRect();
								let containerRect = this._scrollContainer.getBoundingClientRect();
								let style = {
									position: 'absolute',
									top: rect.top - containerRect.top + this._scrollContainer.scrollTop,
									width: '100%',
								};
								let taskBegin = task.beginDate || this.props.project.beginDate;
								let taskEnd = task.endDate || this.props.project.endDate;

								return (
									<TimeGraphComponent
										viewCoord={this.state.currentAnalyticsCoord}
										viewDaysRange={this.state.currentAnalyticsDaysRange}
										onViewChange={this.handleAnalyticsViewChange}
										heightPixels={this._tasksLineRefs[task._id].offsetHeight}
										style={style}
										key={'task'+index}
									>
										<DataCurve
											key="0"
											dataKey="task-hours"
											curveColor="#13e03b"
											curveOpacity={1}
											points={this.state.tasksDataApprovedHours[task._id]}
											fillCurve={true}
											overflowValue={task.totalTime}
											overflowColor="red"
											tooltip="On {x}<br/>Hours Approved: {y}"
										/>
										<DataCurve
											key="1"
											dataKey="task-progress"
											curveColor="#ff5000"
											curveOpacity={1}
											points={[
												{ x: taskBegin, y: 0 },
												{ x: taskEnd, y: task.totalTime },
											]}
										/>
										<TimeMarker
											key="2"
											dataKey="task-begin"
											date={taskBegin}
											color="#ff5000"
											tooltip="Task Begin Date: {date}"
										/>
										<TimeMarker
											key="3"
											dataKey="task-end"
											date={taskEnd}
											color="#ff5000"
											tooltip="Task End Date: {date}"
										/>
										<TimeMarker
											key="4"
											dataKey="now"
											date={new Date()}
											color="#00ff35"
										/>
									</TimeGraphComponent>
								);
							})
						}
						<div style={{height: 5000}}/>
					</div>

					<section className={`padding-inner-gutter padding-no-bottom lowkey-pane side-pane flex-col ${this.state.showGroups ? 'open' : 'closed'}`}>
						<CloseButton onClick={this.handleCloseGroupsAndEmployees} bright={true} />
						<div className="section-title">{ i18n.__('Groups') }</div>
						<ItemBlockList
							items={this.props.employeeGroups}
							itemTransform={groupListTransform}
							sortBy="name"
							showSearchBar={true}
							searchProps={['name']}
							className="flex-grow"
						/>
					</section>

					<section className={`padding-inner-gutter padding-no-bottom lowkey-pane side-pane flex-col ${this.state.showEmployees ? 'open' : 'closed'}`}>
						<CloseButton onClick={this.handleCloseGroupsAndEmployees} bright={true} />
						<div className="flex-row flex-center flex-start section-title flex-no-shrink">
							<div className="">{ i18n.__('Employees') }</div>
                            <div className="spacer-col" />
                            <div className="font-reset flex-row ">
	                            <div
	                                className={`button small ${!this.state.showExternalEmployees ? 'selected' : ''}`}
	                                onClick={this.handleShowInternalEmployees}>
	                                { i18n.__('CURRENT COMPANY') }
	                            </div>
	                            <div className="spacer-col" />
	                            <div
	                                className={`button small ${this.state.showExternalEmployees ? 'selected' : ''}`}
	                                onClick={this.handleShowExternalEmployees}>
	                                { i18n.__('OTHER COMPANIES') }
	                            </div>
	                        </div>
						</div>
						<ItemBlockList
							items={this.props.employees.filter(e => this.state.showExternalEmployees ? e.companyCode != this.props.company.code : e.companyCode == this.props.company.code)}
							itemTransform={employeeListTransform}
							sortBy={Tools.getSortFunctionByProp('code', false, true)}
							showSearchBar={true}
							searchProps={['firstName', 'lastName', 'code']}
							className="flex-grow"
						/>
					</section>

				</div>

				<div
					className={ "forward-pane side-pane " +
					(selectedTask || selectedMilestone || selectedLine ? "opened" : "") }
				>
					<CloseButton onClick={this.handleCloseTab} bright={true} />

					{
						selectedTask &&
						<div className="section-container scroll-y padding-outer-gutter">

							<div className="section-title">{ i18n.__('Task') }</div>
							<InputFormManager
								originalValues={selectedTask}
								propertiesInfo={taskFormProps}
								idPropName="_id"
								showSaveButton={ isTaskCreationMode ? i18n.__('CREATE') : i18n.__('UPDATE') }
								showCancelButton={ isTaskCreationMode }
								showRevertButton={ !isTaskCreationMode }
								showDeleteButton={ !isTaskCreationMode }
								allowSave={this.state.canEditProjects}
								allowDelete={true}
								onSave={ isTaskCreationMode ? this.handleTaskCreate : this.handleTaskUpdate }
								onDelete={ this.handleTaskDelete }
								onCancel={ this.handleCloseTab }
							/>

							{
								!isTaskCreationMode &&
								<div>
									<div className="spacer-row"></div>
									<div className="section-title">{ i18n.__('Assigned Employees') }</div>
									<ItemBlockList
										items={currentTaskEmployees}
									/>
									<div className="spacer-row"></div>
									<div className="section-title">{ i18n.__('Assigned External Resources') }</div>
									<ItemBlockList
										items={currentTaskExternalResources}
									/>
								</div>
                    		}

						</div>
					}

					{
						selectedMilestone &&
						<div className="section-container scroll-y padding-outer-gutter">
							<div className="section-title">{ i18n.__('Milestone') }</div>
							<InputFormManager
								originalValues={selectedMilestone}
								propertiesInfo={milestoneFormProps}
								idPropName="_id"
								showSaveButton={ isMilestoneCreationMode ? i18n.__('CREATE') : i18n.__('UPDATE') }
								showCancelButton={ isMilestoneCreationMode }
								showRevertButton={ !isMilestoneCreationMode }
								showDeleteButton={ !isMilestoneCreationMode }
								allowDelete={true}
								allowSave={this.state.canEditProjects}
								onSave={ isMilestoneCreationMode ? this.handleMilestoneCreate : this.handleMilestoneUpdate }
								onDelete={ this.handleMilestoneDelete }
								onCancel={ this.handleCloseTab }
							/>
						</div>
					}

					{ // Code permettant d'afficher le formumaire de la billing section + taches associées
						selectedLine &&
						<div className="section-container scroll-y padding-outer-gutter">
							<div className="section-title">{ i18n.__('Billing Section') }</div>
							<InputFormManager
								originalValues={selectedLine}
								propertiesInfo={lineFormProps}
								idPropName="_id"
								showSaveButton={ isLineCreationMode ? i18n.__('CREATE') : i18n.__('UPDATE') }
								showCancelButton={ isLineCreationMode }
								showRevertButton={ !isLineCreationMode }
								showDeleteButton={ !isLineCreationMode }
								allowSave={this.state.canEditProjects}
								allowDelete={true}
								onDelete={ this.handleSalesOrderLineDelete }
								onSave={ isLineCreationMode ? this.handleSalesOrderLineCreate : this.handleSalesOrderLineUpdate }
								onCancel={ this.handleCloseTab }
							/>
							{ !isLineCreationMode &&
								<div>
									<div className="spacer-row" />
									<div className="section-title">{ i18n.__('Linked Tasks') }</div>
									{
										sumHoursTasks > selectedLine.amountHours && selectedLine.hoursBudgetConstrained &&
										<div>
											<div className= 'message-error'>
												{ i18n.__('Budget is over run by ') + (sumHoursTasks-selectedLine.amountHours) + i18n.__(' Hours')}
											</div>
											<div className="spacer-row" />
										</div>										
									}
									{
										sumHoursTasks < selectedLine.amountHours && selectedLine.hoursBudgetConstrained &&
										<div>
											<div className= 'message-info'>
												{ (selectedLine.amountHours-sumHoursTasks) + i18n.__(' Heures ne sont pas affectées à des tâches ') }
											</div>
											<div className="spacer-row" />
										</div>										
									}
									<ItemBlockList
										items={selectedLineTasks}
										showSearchBar={false}
									/>
								</div>							
							}

						</div>
					}
				</div>

				{
					this.state.employeeIdForAgreement &&
					<IntercompanyAgreementModal
						agreement={newAgreement}
						onClose={this.handleAgreementCancel}
					/>
				}

			</div>
		);
	}
}


export default createContainer((props: props) => {

	// subscribe to base objects
	let sub = Meteor.subscribe('projects.management', { projectId: props.projectId });
	Meteor.subscribe('employees.list');
	Meteor.subscribe('products');
	let project = Projects.findOne(props.projectId);
	let partner = project && Partners.findOne({ code: project.partnerCode, companyCode: project.companyCode }) || {} as any;
	let company = project && Companies.findOne({ code: project.companyCode }) || {} as any;
	let salesOrders = project && SalesOrders.find({ projectCode: project.code, companyCode: project.companyCode }).fetch() || {} as any;
	let salesOrderLines = project && SalesOrderLines.find({ projectCode: project.code, companyCode: project.companyCode }).fetch() || {} as any;
	let products = project && Products.find({ companyCode: project.companyCode }).fetch() || {} as any;
	let tasks = project && Tasks.find({ projectId: props.projectId }).fetch();
	let milestones = project && Milestones.find({ projectId: props.projectId }).fetch();
	let employees = project && Employees.find().fetch() || {} as any;
	let employeeGroups = project && EmployeeGroups.find().fetch() || {} as any;
	let intercompanyAgreements = project && IntercompanyAgreements.find({ projectId: props.projectId }).fetch() || {} as any;

	return {
		project,
		partner,
		company,
		salesOrders,
		salesOrderLines,
		products,
		tasks,
		employees,
		employeeGroups,
		milestones,
		intercompanyAgreements,
		subReady: sub.ready(),
	};

}, ProjectManagementContainer);


// TASK CARD
// this card is specific to the project management view:
// it holds precise info about the task
// can be dragged to reorder tasks

interface taskCardProps {
	task: Task,
	salesOrderLine: SalesOrderLine,

	assignedEmployees?: Employee[],
	assignedExternalResources?: Employee[],

	allowDrop?: boolean,
	onDrop?: (task: Task, type: string, object: any) => any,
	selected?: boolean,
	onClick?: () => any,
	allowReorder?: boolean,
	orderIndex?: number,
	showSmallGraph?: boolean,
}

interface taskCardState {

}

class TaskCard extends Component<taskCardProps, taskCardState> {

	constructor(props: taskCardProps) {
		super(props);
		this.state = {

		}
	}

	static PADDING = 4;
	static ROW_HEIGHT = 16;
	static AXIS_WIDTH = 80;
	static BARS_WIDTH = 180;

	_containerElement: any;
	_graphElement: any;

	// d3 graph creation goes here
	componentDidMount() {
		if (this.props.showSmallGraph) { return; }

		let padding = TaskCard.PADDING;
		let rowHeight = TaskCard.ROW_HEIGHT;
		let height = rowHeight * 7 + padding * 2;
		let axisWidth = TaskCard.AXIS_WIDTH;
		let barsWidth = TaskCard.BARS_WIDTH;
		let width = axisWidth + barsWidth + padding * 2;

		this._graphElement = d3.select(this._containerElement).append('svg')
			.attr('viewBox', `${-padding} ${-rowHeight - padding} ${width} ${height}`)
			.attr('width', width).attr('height', height);

		// create domains
		this._graphElement.append('rect')
			.attr('class', 'domain-ok');
		this._graphElement.append('rect')
			.attr('class', 'domain-notok');

		// warning text
		this._graphElement.append('text')
			.attr('class', 'graph-text warning-text')
			.attr('fill', 'red')
			.attr('x', width - padding)
			.attr('y', 6 * rowHeight)
			.attr('text-anchor', 'end');

		// draw graph
		this.refreshGraph(this.props);
	}

	// d3 graph update
	componentWillUpdate(nextProps: taskCardProps, nextState: taskCardState) {
		if (nextProps.showSmallGraph) { return; }

		this.refreshGraph(nextProps);
	}

	refreshGraph(props: taskCardProps) {
		let padding = TaskCard.PADDING;
		let rowHeight = TaskCard.ROW_HEIGHT;
		let height = rowHeight * 7 + padding * 2;
		let axisWidth = TaskCard.AXIS_WIDTH;
		let barsWidth = TaskCard.BARS_WIDTH;
		let width = axisWidth + barsWidth + padding * 2;

		let hoursSum = props.task.hoursApproved + props.task.hoursSubmitted +
			props.task.hoursAsDraft + props.task.hoursPlanned;
		let maxValue = Math.max(hoursSum || 0, props.task.totalTime, 1);

		// display domains
		this._graphElement.select('rect.domain-ok')
			.datum(props.task.totalTime || 0)
			.attr('x', axisWidth - padding)
			.attr('y', -padding)
			.attr('height', rowHeight * 5 + padding * 2)
			.attr('width', (d, i) => {
				return padding + Math.round((d / maxValue) * barsWidth);
			})
			.attr('fill', 'rgba(255, 255, 255, 0.15)');
		this._graphElement.select('rect.domain-notok')
			.datum(props.task.totalTime || 0)
			.attr('x', (d, i) => {
				return axisWidth + Math.round((d / maxValue) * barsWidth);
			})
			.attr('y', -padding)
			.attr('height', rowHeight * 5 + padding * 2)
			.attr('width', 1000)
			.attr('fill', 'rgba(255, 125, 90, 0.45)');

		// data ranges
		let labels = ['APPROVED', 'SUBMITTED', 'AS DRAFT', 'PLANNED', 'BUDGET'];
		let sum = 0;
		let values = [
			{ start: 0, amount: props.task.hoursApproved || 0 },
			{ start: 0, amount: props.task.hoursSubmitted || 0 },
			{ start: 0, amount: props.task.hoursAsDraft || 0 },
			{ start: 0, amount: props.task.hoursPlanned || 0 },
			{ start: 0, amount: props.task.totalTime || 0 },
		];
		values.forEach((value, index) => {
			if (index == values.length-1) { return; }
			values[index].start = sum;
			sum += value.amount;
		});
		let colors = ['#13e03b', 'yellow', 'orange', 'rgb(77, 255, 244)', 'rgba(0, 0, 0, 0.46)'];

		// create & update rows
		this._graphElement.selectAll('rect.data-bar')
			.data(values)
			.enter()
			.append('rect')
			.attr('class', 'data-bar')
			.attr('height', rowHeight)
			.attr('y', (d, i) => { return i * rowHeight; })
			.attr('fill', (d, i) => { return colors[i]; });
		this._graphElement.selectAll('rect.data-bar')
			.attr('x', (d, i) => {
				return axisWidth + Math.round((d.start / maxValue) * barsWidth);
			})
			.attr('width', (d, i) => {
				return Math.max(1, Math.round((d.amount / maxValue) * barsWidth));
			});

		// create & update labels
		this._graphElement.selectAll('text.bar-label')
			.data(values)
			.enter()
			.append('text')
			.attr('class', 'graph-text bar-label')
			.text((d, i) => { return labels[i]; })
			.attr('x', axisWidth - 8)
			.attr('y', (d, i) => { return (i + 0.75) * rowHeight; })
			.attr('text-anchor', 'end');
		this._graphElement.selectAll('text.bar-value')
			.data(values)
			.enter()
			.append('text')
			.attr('class', 'graph-text bar-value')
			.attr('x', axisWidth + 4)
			.attr('y', (d, i) => { return (i + 0.75) * rowHeight; })
			.attr('stroke-width', 3)
			.attr('stroke', 'rgba(0, 0, 0, 0.4)')
			.attr('paint-order', 'stroke');
		this._graphElement.selectAll('text.bar-value')
			.text((d, i) => { return `${d.amount.toString()} ${i18n.__('hours')}`; });

		// warning text
		this._graphElement.select('text.warning-text')
			.datum(hoursSum - props.task.totalTime)
			.text((d, i) => {
				if (d > 0) {
					return `⚠ ${i18n.__('budget is overrun by')} ${d} ${i18n.__('hours')}`;
				}
				return '';
			});
	}

	render() {
		// let displayEmployees = e =>
		// 	<div className="small-icon front" key={e && e._id}>
		// 		{e && Tools.shortenPersonName(e.firstName, e.lastName)}
		// 	</div>;
		let hoursEntered = this.props.task.hoursApproved +
			this.props.task.hoursSubmitted +
			this.props.task.hoursAsDraft;

		return (
			<ObjectInfoCard
				typeIcon="task"
				draggable={this.props.allowReorder}
				draggableType="task-card"
				draggableObject={{taskId: this.props.task._id}}
				droppable={this.props.allowDrop}
				droppableTypes={['employee-card', 'external-employee-card']}
				onDrop={(type, object) => this.props.onDrop(this.props.task, type, object)}
				selected={this.props.selected}
				onClick={this.props.onClick}
				overlayOnHover={false}
			>
				{
					this.props.orderIndex !== undefined &&
					<div className="code">
						{i18n.__('No.')}{this.props.orderIndex}
					</div>
				}

				<div className="flex-row flex-grow">

					<div className="flex-col flex-grow">
						<div className="flex-row">
							<div className="title">{this.props.task.name}</div>
							<div className="spacer-col"/>
							<BillableStatus billable={this.props.salesOrderLine != null} />
						</div>
						<div className="">
							{
								this.props.salesOrderLine ?
									<span><span className="light-text">{ i18n.__('Associated to billing section: ') }</span> {this.props.salesOrderLine.description}</span>
									: <span className="light-text">{ i18n.__('No billing section assigned.') }</span>
							}
						</div>

						<div className="flex-row">
						{
							this.props.assignedEmployees && this.props.assignedEmployees.map(e =>
								<EmployeeBadge key={e && e._id} employeeName={`${e.firstName} ${e.lastName}`} />)
						}
						</div>

						<div className="flex-row">
						{
							this.props.assignedExternalResources && this.props.assignedExternalResources.map(e =>
								<EmployeeBadge key={e && e._id} employeeName={`${e.firstName} ${e.lastName}`}
									showStatus={(e as any).agreementApproved ? 'approved' : 'pending'}
									additionalInfo={(e as any).agreementInfo}
								/>)
						}
						</div>
					</div>

					<div className="spacer-col" />

					<div
						className="flex-col flex-center"
						ref={el => this._containerElement = el} />

					{
						this.props.showSmallGraph &&
						<TimeBudgetWidget
							totalTime={this.props.task.totalTime}
							consumedTime={hoursEntered}
							size={48}
							tooltip={'Total hours entered: ' + hoursEntered}
							showOvertime={true}
						/>
					}

					<div className="spacer-col" />
				</div>
			</ObjectInfoCard>
		);
	}

}


// TASK CARD INSERTER
// a simple interactive drop target to allow task card reordering
// on drop, will change the order index of the task to a value like x.5

interface inserterProps {
	orderIndex: number,
	onDrop: (taskId: string, newOrderIndex: number) => any,
	isHovered?: boolean,
	isDropTarget?: boolean,
	connectDropTarget?: (element: any) => any,
	isFirst?: boolean,
	isLast?: boolean,
}

interface inserterState {

}

class TaskCardInserterContained extends Component<inserterProps, inserterState> {

	constructor(props: inserterProps) {
		super(props);
		this.state = {

		}
	}

	render() {
		if (!this.props.isDropTarget) {
			return <div style={{display: 'none'}} />;
		}

		let style = {
			height: 0,
			position: 'relative',
			margin: 0,
			zIndex: 1000,
		};
		let childStyle = {
			height: 40,
			top: -4,
			width: '100%',
			position: 'absolute',
			transform: 'translate(0, -50%)',
			backgroundColor: this.props.isHovered ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
		};

		if (this.props.isFirst) {
			childStyle.height = 30;
			childStyle.transform = 'translate(0, 0)';
		} else if (this.props.isLast) {
			childStyle.height = 30;
			childStyle.transform = 'translate(0, -100%)';
		}

		return this.props.connectDropTarget(
			<div style={style}>
				<div style={childStyle} />
			</div>
		);
	}
}

const dropEvents = {
	drop(props: inserterProps, monitor, component: TaskCardInserterContained) {
		if (monitor.didDrop()) { return; }
		props.onDrop(monitor.getItem().taskId, props.orderIndex);
	},
};

function dropCollect(connect, monitor) {
	return {
		connectDropTarget: connect.dropTarget(),
		isHovered: monitor.isOver(),
		isDropTarget: monitor.canDrop(),
	};
}

// using DropTarget HOC
let TaskCardInserter = DropTarget<inserterProps>('task-card', dropEvents, dropCollect)(
	TaskCardInserterContained) as React.ComponentClass<inserterProps>;