import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import { browserHistory } from 'react-router';
import * as moment from 'moment';
import ReactModal2 from 'react-modal2';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { Expense, Expenses, Timecard, Timecards, Tasks, Task } from '../../data/collections';
import { Projects, Project } from '../../data/collections';
import { Employees, Employee } from '../../data/collections';
import { ExpenseTypes, ExpenseType } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';
import { UserEntryStatusList } from '../../data/choicelists';
import { Tools, DateTools, UserEntryTools } from '../../utils/tools';

import Tooltip from '../widgets/Tooltip';
import Toolbar from '../subviews/Toolbar';
import FormInput from '../controls/FormInput';
import ItemTableList from '../controls/ItemTableList';
import TimecardEditModal from '../subviews/TimecardEditModal';
import ExpenseEditModal from '../subviews/ExpenseEditModal';
import { EmployeeList } from '../subviews/EmployeeManagementLists';


interface props {
	// query params
	location: { query?: any },

	// type
	dataType?: string,		// timecards (default), expenses

	// viewed employee
	viewedUserId?: string,
	viewedEmployee?: Employee,

	// reactive data
	expenses: Expense[],
	expenseTypes: ExpenseType[],
	timecards: Timecard[],
	tasks: Task[],
	projects: Project[],
	currentUserId: string,
	currentEmployee: Employee,
}
interface state {
	// selection
	selectedIds?: string[],		// this is an array of id!

	currentEditedTimecardId?: string,
	currentEditedExpenseId?: string,
	currentEditedReadOnly?: boolean

	showUserSelectModal?: boolean,

	// filters
	statusFilter?: string,
	textFilter?: string,
	searchDateStart?: Date,
	searchDateEnd?: Date,

	// allowed actions
	allowedTimecardActions?: { [id: string]: { canEdit: boolean, canDelete: boolean, canSubmit: boolean, canApprove: boolean }};
	allowedExpenseActions?: { [id: string]: { canEdit: boolean, canDelete: boolean, canSubmit: boolean, canApprove: boolean }};
}

class UserEntriesListView extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
			selectedIds: [],
			allowedTimecardActions: {},
			allowedExpenseActions: {},
			statusFilter: props.location && props.location.query && props.location.query.status !== undefined ? props.location.query.status : '',
			textFilter: '',
		};

		this.handleItemSelection = this.handleItemSelection.bind(this);
		this.handleItemSelectAll = this.handleItemSelectAll.bind(this);

		this.handleTimecardDelete = this.handleTimecardDelete.bind(this);
		this.handleTimecardSubmit = this.handleTimecardSubmit.bind(this);
		this.handleTimecardApprove = this.handleTimecardApprove.bind(this);
		this.handleTimecardEdit = this.handleTimecardEdit.bind(this);
		this.handleTimecardView = this.handleTimecardView.bind(this);
		this.handleExpenseDelete = this.handleExpenseDelete.bind(this);
		this.handleExpenseSubmit = this.handleExpenseSubmit.bind(this);
		this.handleExpenseApprove = this.handleExpenseApprove.bind(this);
		this.handleExpenseEdit = this.handleExpenseEdit.bind(this);
		this.handleExpenseView = this.handleExpenseView.bind(this);
		this.showUserSelectModal = this.showUserSelectModal.bind(this);
		this.closeModals = this.closeModals.bind(this);

		this.handleTextFilterChange = this.handleTextFilterChange.bind(this);
		this.handleStatusFilterChange = this.handleStatusFilterChange.bind(this);
		this.handleSearchDateEndChange = this.handleSearchDateEndChange.bind(this);
		this.handleSearchDateStartChange = this.handleSearchDateStartChange.bind(this);
	}

	// initial state modification
	componentWillMount() {
		this.updateAllowedActions(this.props);
	}

	// check if our selection is valid
	componentWillReceiveProps(nextProps: props) {
		this.updateAllowedActions(nextProps);

		// status change
		if (nextProps.location && nextProps.location.query && nextProps.location.query.status !== undefined && nextProps.location.query.status != this.state.statusFilter) {
			this.setState({
				statusFilter: nextProps.location.query.status
			});
		}

		// we changed data type: clear selection
		if (nextProps.dataType != this.props.dataType) {
			this.setState({
				selectedIds: []
			});
			return;
		}

		let ids = this.state.selectedIds.filter(id => {
			if (this.props.dataType == 'timecards' &&
				this.props.timecards.findIndex(c => c._id == id) == -1) {
				return false;
			}
			if (this.props.dataType == 'expenses' &&
				this.props.expenses.findIndex(e => e._id == id) == -1) {
				return false;
			}

			return true;
		});

		this.setState({
			selectedIds: ids,
		});
	}

	updateAllowedActions(props: props) {

		// update possible actions
		let allowedTimecardActions = {};
		let allowedExpenseActions = {};

		props.timecards.forEach(timecard => {
			let task = this.props.tasks.find(task => task._id == timecard.taskId) || {} as Task;

			let isFuture = UserEntryTools.isFutureEntry('timecard',
				timecard.year, timecard.month, timecard.day, timecard.end);

			let isProjectManager = false;
			let project = this.props.projects.find(p => p._id == task.projectId);
			if (project && this.props.currentEmployee &&
				project.assignedManagers.indexOf(this.props.currentEmployee._id) > -1) {
				isProjectManager = true;
			}

			let isOwnEntry = this.props.currentUserId == timecard.userId;

			let isManager = this.props.viewedEmployee ? this.props.viewedEmployee.managerId == this.props.currentEmployee._id : false;

			allowedTimecardActions[timecard._id] = UserEntryTools.getPossibleActions('timecard',
				timecard.status, isManager, false, isProjectManager, isOwnEntry, isFuture);

			// Todo: check for admin/manager role
		});
		props.expenses.forEach(expense => {
			let type = this.props.expenseTypes.find(t => t._id == expense.typeId) || {} as ExpenseType;

			let isFuture = UserEntryTools.isFutureEntry('expense',
				expense.year, expense.month, expense.day);

			let isProjectManager = false;
			let project = this.props.projects.find(p => p._id == expense.projectId);
			if (project && this.props.currentEmployee &&
				project.assignedManagers.indexOf(this.props.currentEmployee._id) > -1) {
				isProjectManager = true;
			}

			let isOwnEntry = this.props.currentUserId == expense.userId;

			let isManager = this.props.viewedEmployee ? this.props.viewedEmployee.managerId == this.props.currentEmployee._id : false;

			allowedExpenseActions[expense._id] = UserEntryTools.getPossibleActions('expense',
				expense.status, isManager, false, isProjectManager, isOwnEntry, isFuture);

			// Todo: check for admin/manager role
		});

		// save state
		this.setState({
			allowedTimecardActions,
			allowedExpenseActions,
		});
	}


	// SELECTION LIST HANDLER

	handleItemSelection(item, itemIndex, selected) {
		let selection = this.state.selectedIds;
		let index = selection.indexOf(item._id);

		if (index == -1) { selection.push(item._id); }
		else { selection.splice(index, 1); }

		this.setState({
			selectedIds: selection
		});
	}
	handleItemSelectAll() {
		let selection = this.state.selectedIds;
		let data: (Timecard | Expense)[] = this.props.dataType == 'expense' ? this.props.expenses : this.props.timecards;
		if (selection.length >= data.length) {
			selection = [];
		} else {
			selection = data.map(e => e._id);
		}

		this.setState({
			selectedIds: selection
		});
	}


	// filter handlers
	handleTextFilterChange(newVal) {
		this.setState({
			textFilter: newVal
		});
	}
	handleStatusFilterChange(newVal) {
		this.setState({
			statusFilter: newVal !== null ? newVal.toString() : ''
		});
	}
	handleSearchDateStartChange(newValue: Date) {
		this.setState({ searchDateStart: newValue });
	}
	handleSearchDateEndChange(newValue: Date) {
		this.setState({ searchDateEnd: newValue });
	}

	// ACTION HANDLERS

	handleTimecardDelete(cardIds: string[]) {
		for (let i = 0; i < cardIds.length; i++ ) {
			Meteor.call('timecard.delete', cardIds[i], (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Timesheet delete failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Timesheet has been successfully deleted.'));
			});
		}
	}
	handleTimecardSubmit(cardIds: string[]) {
		for (let i = 0; i < cardIds.length; i++ ) {
			Meteor.call('timecard.submit', cardIds[i], (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Timesheet submit failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Timesheet successfully submitted.'));
			});
		}
	}
	handleTimecardApprove(cardIds: string[]) {
		for (let i = 0; i < cardIds.length; i++ ) {
			Meteor.call('timecard.approve', cardIds[i], (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Timesheet approval failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Timesheet has been successfully approved.'));
			});
		}
	}
	handleTimecardEdit(timecardId: string) {
		this.setState({
			currentEditedTimecardId: timecardId,
			currentEditedReadOnly: false,
		});
	}
	handleTimecardView(timecardId: string) {
		this.setState({
			currentEditedTimecardId: timecardId,
			currentEditedReadOnly: true,
		});
	}
	handleExpenseDelete(expenseIds: string[]) {
		for (let i = 0; i < expenseIds.length; i++ ) {
			Meteor.call('expense.delete', expenseIds[i], (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Expense delete failed failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Expense has been successfully deleted.'));
			});
		}
	}
	handleExpenseSubmit(expenseIds: string[]) {
		for (let i = 0; i < expenseIds.length; i++ ) {
			Meteor.call('expense.submit', expenseIds[i], (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Expense submit failed failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Expense has been successfully submitted.'));
			});
		}
	}
	handleExpenseApprove(expenseIds: string[]) {
		for (let i = 0; i < expenseIds.length; i++ ) {
			Meteor.call('expense.approve', expenseIds[i], (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Expense approval failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Expense has been successfully approved.'));
			});
		}
	}
	handleExpenseEdit(expenseId: string) {
		this.setState({
			currentEditedExpenseId: expenseId,
			currentEditedReadOnly: false,
		});
	}
	handleExpenseView(expenseId: string) {
		this.setState({
			currentEditedExpenseId: expenseId,
			currentEditedReadOnly: true,
		});
	}

	showUserSelectModal() {
		this.setState({
			showUserSelectModal: true,
		});
	}

	// modals close
	closeModals() {
		this.setState({
			currentEditedExpenseId: null,
			currentEditedTimecardId: null,
			showUserSelectModal: false,
		});
	}

	render() {
		if (this.props.dataType == 'timecards') { return this.renderTimecards(); }
		if (this.props.dataType == 'expenses') { return this.renderExpenses(); }

		return <div></div>;
	}

	renderTimecards() {
		let timecards = this.props.timecards.filter(timecard =>
			timecard.userId == this.props.viewedUserId)
		.filter((entry : Timecard | Expense): boolean => {
			if (this.state.searchDateStart && entry.date < this.state.searchDateStart) { return false; }
			if (this.state.searchDateEnd && entry.date > this.state.searchDateEnd) { return false; }
			return true;
		})
		.map(timecard => {
			let task = this.props.tasks.find(task => task._id == timecard.taskId) || {} as Task;
			let actions = this.state.allowedTimecardActions[timecard._id];

			// generate tooltip content
			let tooltip = '';
			if (timecard.note) { tooltip = `{{${i18n.__('Public note')}:}}\n${timecard.note}`; }
			if (timecard.internalNote) {
				if (tooltip) { tooltip += '\n\n'; }
				tooltip += `{{${i18n.__('Private note')}:}}\n${timecard.internalNote}`;
			}

			return Object.assign({}, timecard, {
				taskName: task.name,
				projectName: task.projectName,
				partnerName: task.partnerName,
				duration: timecard.end - timecard.start,
				date: moment([timecard.year, timecard.month, timecard.day]),
				note: tooltip ? <Tooltip text={tooltip} containerClassName="nowrap">
						{ timecard.note + (timecard.internalNote ? ' - ' + timecard.internalNote : '') }
					</Tooltip> : `(${i18n.__('empty')})`,
				actions: 
					<div className="button-bar">
					{
						actions.canApprove &&
						<div className="button action-dostuff small flex-no-shrink"
							onClick={() => this.handleTimecardApprove([timecard._id])}>
							{ i18n.__('APPROVE') }
						</div>
					}
					{
						actions.canEdit &&
						<div className="button action-dostuff small flex-no-shrink"
							onClick={() => this.handleTimecardEdit(timecard._id)}>
							{ i18n.__('EDIT') }
						</div>
					}
					{
						actions.canSubmit &&
						<div className="button action-warning small flex-no-shrink"
							onClick={() => this.handleTimecardSubmit([timecard._id])}>
							{ i18n.__('SUBMIT') }
						</div>
					}
					{
						actions.canDelete &&
						<div className="button action-danger small flex-no-shrink"
							onClick={() => this.handleTimecardDelete([timecard._id])}>
							{ i18n.__('DELETE') }
						</div>
					}
					{
						(!actions.canApprove && !actions.canSubmit && !actions.canDelete && !actions.canEdit ) &&
						<div className="button small flex-no-shrink"
							onClick={() => this.handleTimecardView(timecard._id)}>
							{ i18n.__('VIEW') }
						</div>
					}
					</div>
			});
		});

		// item list params
		let listCols: { [index: string]: any } = {};
		listCols['taskName'] = {
			label: i18n.__('Task'),
			widthRatio: 0.18,
		};
		listCols['projectName'] = { label: i18n.__('Project') };
		listCols['partnerName'] = { label: i18n.__('Partner') };
		listCols['duration'] = {
			label: i18n.__('Duration'),
			widthRatio: 0.08,
			transform: (duration) => DateTools.convertTimeNumberToString(duration)
		};
		listCols['date'] = {
			label: i18n.__('Date'),
			widthRatio: 0.08,
			transform: (moment) => moment.format('L'),
		};
		listCols['note'] = { label: i18n.__('Note') };
		listCols['status'] = {
			label: i18n.__('Status'),
			mapping: UserEntryStatusList,
			widthRatio: 0.1,
		};
		listCols['actions'] = {
			label: i18n.__('Actions'),
			className: 'flex-row flex-center flex-start',
			widthRatio: 0.18,
		};

		// compute selected indices list
		let selectedIndices = this.state.selectedIds.map(id => {
			return timecards.findIndex(t => t._id == id);
		});

		// compute available global actions
		let globalActions = {
			canApprove: true,
			canSubmit: true,
			canDelete: true,
		};
		this.state.selectedIds.forEach(id => {
			let actions = this.state.allowedTimecardActions[id];
			if (!actions) { return; }
			globalActions.canApprove = globalActions.canApprove && actions.canApprove;
			globalActions.canSubmit = globalActions.canSubmit && actions.canSubmit;
			globalActions.canDelete = globalActions.canDelete && actions.canDelete;
		});

		// filters
		let filters: { [index: string]: any } = {
			'taskName|note|projectName|partnerName':  '.*' + this.state.textFilter + '.*',
			'status': this.state.statusFilter !== null ? this.state.statusFilter.toString() : ''
		};

		return (
			<div className="main-pane width-100 with-toolbar flex-col">
				<div className="flex-row flex-center flex-start flex-no-shrink">
					<div className="page-title">{ i18n.__('Timesheets') }</div>
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleTextFilterChange}
						placeholder={ i18n.__("search for")+"..." }
						value={this.state.textFilter}
						editable={true} />
					<div className="spacer-col"/>
					<FormInput
						inputType="select"
						valuesList={ UserEntryStatusList }
						receiveNewValue={this.handleStatusFilterChange}
						placeholder={ i18n.__("filter status")+"..." }
						value={ this.state.statusFilter !== '' ? parseInt(this.state.statusFilter) : '' }
						editable={true} />
					<div className="spacer-col" />
					<FormInput
						receiveNewValue={this.handleSearchDateStartChange}
						inputType="date"
						placeholder="from..."
						value={this.state.searchDateStart}
						isStartDate={true}
						dateRangeStart={this.state.searchDateStart}
						dateRangeEnd={this.state.searchDateEnd}
						editable={true} />
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleSearchDateEndChange}
						inputType="date"
						placeholder="to..."
						value={this.state.searchDateEnd}
						isEndDate={true}
						dateRangeStart={this.state.searchDateStart}
						dateRangeEnd={this.state.searchDateEnd}
						editable={true} />
					<div className="spacer-col"/>
					{
						this.props.viewedEmployee &&
						<div>
							<span className="secondary">{ i18n.__('Current employee')}: </span>
							<span>{ this.props.viewedEmployee.firstName + ' ' + this.props.viewedEmployee.lastName }</span>
						</div>
					}
					<div className="spacer-col" />
					<div className="button flex-no-shrink"
						onClick={this.showUserSelectModal}>
						{ i18n.__('CHANGE CURRENT EMPLOYEE') }
					</div>
					<div className="spacer-col" />
				</div>
				<div className="spacer-row" />

				<ItemTableList
					columns={listCols}
					items={timecards}
					fixedHeaders={true}
					enableSorting={true}
					className="flex-grow"
					itemsSelectable={true}
					selectedIndices={selectedIndices}
					onItemSelectChange={this.handleItemSelection}
					onItemSelectAll={this.handleItemSelectAll}
					filters={filters}
				/>

				<div className="spacer-row" />

				<div className="flex-row flex-no-shrink">
					<div className="button-bar">
						<span>
							<strong>{ this.state.selectedIds.length }</strong>&nbsp;
							<span>{ i18n.__('entries have been selected.') }</span>
						</span>
					</div>
					<div className="spacer-col" />

					{
						(this.state.selectedIds.length > 0) &&
						<div className="button-bar">
							<span>
								{ i18n.__('Actions') }: 
							</span>
							{
								globalActions.canApprove &&
								<div className="button action-dostuff  flex-no-shrink"
									onClick={() => this.handleTimecardApprove(this.state.selectedIds)}>
									approve
								</div>
							}
							{
								globalActions.canSubmit &&
								<div className="button action-warning  flex-no-shrink"
									onClick={() => this.handleTimecardSubmit(this.state.selectedIds)}>
									submit
								</div>
							}
							{
								globalActions.canDelete &&
								<div className="button action-danger  flex-no-shrink"
									onClick={() => this.handleTimecardDelete(this.state.selectedIds)}>
									delete
								</div>
							}
							{
								(!globalActions.canApprove && !globalActions.canSubmit && !globalActions.canDelete )&&
								<span>
									{ i18n.__('No actions available.') }
								</span>
							}
						</div>
					}
				</div>

				<div className="spacer-row" />

				<Toolbar />

				{
					(this.state.currentEditedTimecardId != null) &&
					<TimecardEditModal
						timecard={ this.props.timecards.find(c => c._id == this.state.currentEditedTimecardId) }
						onClose={this.closeModals}
						readOnly={this.state.currentEditedReadOnly}
					/>
				}

				{
					this.state.showUserSelectModal &&
					<ReactModal2
						onClose={this.closeModals}
						closeOnEsc={true}
						closeOnBackdropClick={true}
						backdropClassName='overlay-pane-background'
						modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col section width-50'
					>
						<div className="title">{ i18n.__('Choose current employee') }</div>

						<EmployeeList
							onClick={(e: Employee) => { this.closeModals(); browserHistory.push('/timesheets/?user='+e.userId); }}
							isSelected={(e: Employee) => e.userId == (this.props.viewedUserId)}
						/>

						<div className="button-bar flex-no-shrink">
							<div className="separator" />
							<div className={'button action-cancel'}
								onClick={this.closeModals}>
								{ i18n.__('CLOSE') }
							</div>
						</div>
					</ReactModal2>
				}
			</div>
		);
	}

	renderExpenses() {
		// expense types
		let expenseTypes = this.props.expenseTypes.map(t => {
			return {
				label: Tools.capitalize(t.name),
				value: t._id,
			}
		});

		let expenses = this.props.expenses.filter(expense =>
			expense.userId == this.props.viewedUserId)
		.filter((entry : Timecard | Expense): boolean => {
			if (this.state.searchDateStart && entry.date < this.state.searchDateStart) { return false; }
			if (this.state.searchDateEnd && entry.date > this.state.searchDateEnd) { return false; }
			return true;
		})
		.map(expense => {
			let type = this.props.expenseTypes.find(t => t._id == expense.typeId) || {} as ExpenseType;
			let actions = this.state.allowedExpenseActions[expense._id];

			return Object.assign({}, expense, {
				projectName: expense.projectName,
				partnerName: expense.partnerName,
				typeName: type.name,
				date: moment([expense.year, expense.month, expense.day]),
				actions: 
					<div className="button-bar">
					{
						actions.canApprove &&
						<div className="button action-dostuff small flex-no-shrink"
							onClick={() => this.handleExpenseApprove([expense._id])}>
							{ i18n.__('APPROVE') }
						</div>
					}
					{
						actions.canEdit &&
						<div className="button action-dostuff small flex-no-shrink"
							onClick={() => this.handleExpenseEdit(expense._id)}>
							{ i18n.__('EDIT') }
						</div>
					}
					{
						actions.canSubmit &&
						<div className="button action-warning small flex-no-shrink"
							onClick={() => this.handleExpenseSubmit([expense._id])}>
							{ i18n.__('SUBMIT') }
						</div>
					}
					{
						actions.canDelete &&
						<div className="button action-danger small flex-no-shrink"
							onClick={() => this.handleExpenseDelete([expense._id])}>
							{ i18n.__('DELETE') }
						</div>
					}
					{
						(!actions.canApprove && !actions.canSubmit && !actions.canDelete && !actions.canEdit )&&
						<div className="button small flex-no-shrink"
							onClick={() => this.handleExpenseView(expense._id)}>
							{ i18n.__('VIEW') }
						</div>
					}
					</div>
			});
		});

		// item list params
		let listCols: { [index: string]: any } = {};
		listCols['projectName'] = { label: i18n.__('Project') };
		listCols['partnerName'] = { label: i18n.__('Partner') };
		listCols['typeName'] = {
			label: i18n.__('Type'),
			widthRatio: 0.1,
		};
		listCols['date'] = {
			label: i18n.__('Date'),
			widthRatio: 0.08,
			transform: (moment) => moment.format('L'),
		};
		listCols['note'] = { label: i18n.__('Note') };
		listCols['status'] = {
			label: i18n.__('Status'),
			mapping: UserEntryStatusList,
			widthRatio: 0.1,
		};
		listCols['actions'] = {
			label: i18n.__('Actions'),
			className: 'flex-row flex-center flex-start',
			widthRatio: 0.18,
		};

		// compute selected indices list
		let selectedIndices = this.state.selectedIds.map(id => {
			return expenses.findIndex(t => t._id == id);
		});

		// compute available global actions
		let globalActions = {
			canApprove: true,
			canSubmit: true,
			canDelete: true,
		};
		this.state.selectedIds.forEach(id => {
			let actions = this.state.allowedExpenseActions[id];
			if (!actions) { return; }
			globalActions.canApprove = globalActions.canApprove && actions.canApprove;
			globalActions.canSubmit = globalActions.canSubmit && actions.canSubmit;
			globalActions.canDelete = globalActions.canDelete && actions.canDelete;
		});

		// filters
		let filters: { [index: string]: any } = {
			'note|projectName|partnerName':  '.*' + this.state.textFilter + '.*',
			'status': this.state.statusFilter !== null ? this.state.statusFilter.toString() : ''
		};

		return (
			<div className="main-pane width-100 with-toolbar flex-col">
				<div className="flex-row flex-center flex-start flex-no-shrink">
					<div className="page-title">{ i18n.__('Expenses') }</div>
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleTextFilterChange}
						placeholder={ i18n.__("search for")+"..." }
						value={this.state.textFilter}
						editable={true} />
					<div className="spacer-col"/>
					<FormInput
						inputType="select"
						valuesList={ UserEntryStatusList }
						receiveNewValue={this.handleStatusFilterChange}
						placeholder={ i18n.__("filter status")+"..." }
						value={ this.state.statusFilter !== '' ? parseInt(this.state.statusFilter) : '' }
						editable={true} />
					<div className="spacer-col" />
					<FormInput
						receiveNewValue={this.handleSearchDateStartChange}
						inputType="date"
						placeholder="from..."
						value={this.state.searchDateStart}
						isStartDate={true}
						dateRangeStart={this.state.searchDateStart}
						dateRangeEnd={this.state.searchDateEnd}
						editable={true} />
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleSearchDateEndChange}
						inputType="date"
						placeholder="to..."
						value={this.state.searchDateEnd}
						isEndDate={true}
						dateRangeStart={this.state.searchDateStart}
						dateRangeEnd={this.state.searchDateEnd}
						editable={true} />
					<div className="spacer-col"/>
					{
						this.props.viewedEmployee &&
						<div>
							<span className="secondary">{ i18n.__('Current employee')}: </span>
							<span>{ this.props.viewedEmployee.firstName + ' ' + this.props.viewedEmployee.lastName }</span>
						</div>
					}
					<div className="spacer-col" />
					<div className="button flex-no-shrink"
						onClick={this.showUserSelectModal}>
						{ i18n.__('CHANGE CURRENT EMPLOYEE') }
					</div>
					<div className="spacer-col" />
				</div>
				
				<div className="spacer-row" />

				<ItemTableList
					columns={listCols}
					items={expenses}
					fixedHeaders={true}
					enableSorting={true}
					className="flex-grow"
					itemsSelectable={true}
					selectedIndices={selectedIndices}
					onItemSelectChange={this.handleItemSelection}
					onItemSelectAll={this.handleItemSelectAll}
					filters={filters}
				/>

				<div className="spacer-row" />

				<div className="flex-row flex-no-shrink">
					<div className="button-bar">
						<span>
							<strong>{ this.state.selectedIds.length }</strong>&nbsp;
							<span>{ i18n.__('expenses have been selected.') }</span>
						</span>
					</div>
					<div className="spacer-col" />

					{
						(this.state.selectedIds.length > 0) &&
						<div className="button-bar">
							<span>
								{ i18n.__('Actions') }: 
							</span>
							{
								globalActions.canApprove &&
								<div className="button action-dostuff  flex-no-shrink"
									onClick={() => this.handleExpenseApprove(this.state.selectedIds)}>
									approve
								</div>
							}
							{
								globalActions.canSubmit &&
								<div className="button action-warning  flex-no-shrink"
									onClick={() => this.handleExpenseSubmit(this.state.selectedIds)}>
									submit
								</div>
							}
							{
								globalActions.canDelete &&
								<div className="button action-danger  flex-no-shrink"
									onClick={() => this.handleExpenseDelete(this.state.selectedIds)}>
									delete
								</div>
							}
							{
								(!globalActions.canApprove && !globalActions.canSubmit && !globalActions.canDelete ) &&
								<span>
									{ i18n.__('No actions available.') }
								</span>
							}
						</div>
					}
				</div>

				<div className="spacer-row" />

				<Toolbar />

				{
					(this.state.currentEditedExpenseId != null) &&
					<ExpenseEditModal
						expense={ this.props.expenses.find(c => c._id == this.state.currentEditedExpenseId) }
						expenseTypes={expenseTypes} onClose={this.closeModals}
						readOnly={this.state.currentEditedReadOnly}
					/>
				}

				{
					this.state.showUserSelectModal &&
					<ReactModal2
						onClose={this.closeModals}
						closeOnEsc={true}
						closeOnBackdropClick={true}
						backdropClassName='overlay-pane-background'
						modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col section width-50'
					>
						<div className="title">{ i18n.__('Choose current employee') }</div>

						<EmployeeList
							onClick={(e: Employee) => { this.closeModals(); browserHistory.push('/expenses/?user='+e.userId); }}
							isSelected={(e: Employee) => e.userId == (this.props.viewedUserId)}
						/>

						<div className="button-bar flex-no-shrink">
							<div className="separator" />
							<div className={'button action-cancel'}
								onClick={this.closeModals}>
								{ i18n.__('CLOSE') }
							</div>
						</div>
					</ReactModal2>
				}
			</div>
		);
	}
}

(UserEntriesListView as any).defaultProps = {
	dataType: 'timecards',
};

export default createContainer((props: props) => {

	let viewedUserId = (props.location && props.location.query && props.location.query.user) || Meteor.userId();

	Meteor.subscribe('timecards.list', viewedUserId);
	Meteor.subscribe('expenses.list', viewedUserId);
	Meteor.subscribe('tasks.list', viewedUserId);
	Meteor.subscribe('projects.list', viewedUserId);
	Meteor.subscribe('employees.list');

	return {
		expenses: Expenses.find().fetch(),
		expenseTypes: ExpenseTypes.find().fetch(),
		timecards: Timecards.find({ repeating: false }).fetch(),
		tasks: Tasks.find().fetch(),
		currentUserId: Meteor.userId(),
		viewedUserId: viewedUserId,
		projects: Projects.find().fetch(),
		currentEmployee: Employees.findOne({ userId: Meteor.userId() }),
		viewedEmployee: Employees.findOne({ userId: viewedUserId }),
	};

}, UserEntriesListView);
