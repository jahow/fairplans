import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import { browserHistory } from 'react-router';
import * as moment from 'moment';

import { Expense, Expenses, Timecard, Timecards, Tasks, Task } from '../../data/collections';
import { Projects, Project } from '../../data/collections';
import { Employees, Employee } from '../../data/collections';
import { ExpenseTypes, ExpenseType } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';
import { UserEntryStatusList } from '../../data/choicelists';
import { Tools, DateTools, UserEntryTools, QueryTools } from '../../utils/tools';

import Toolbar from '../subviews/Toolbar';
import ItemTableList from '../controls/ItemTableList';
import TimecardEditModal from '../subviews/TimecardEditModal';
import ExpenseEditModal from '../subviews/ExpenseEditModal';


interface props {
	// reactive data
	expenses: Expense[],
	expenseTypes: ExpenseType[],
	timecards: Timecard[],
	tasks: Task[],
	projects: Project[],
	employees: Employee[],
	currentUserId: string,
	currentEmployee: Employee,
}
interface state {
	// selection
	selectedExpenseIds?: string[],		// this is an array of id!
	selectedTimecardIds?: string[],

	currentViewedTimecardId?: string,
	currentViewedExpenseId?: string,
}

class EntriesApprovalView extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
			selectedExpenseIds: [],
			selectedTimecardIds: [],
		};

		this.handleExpenseSelection = this.handleExpenseSelection.bind(this);
		this.handleTimecardSelection = this.handleTimecardSelection.bind(this);
		this.handleTimecardApprove = this.handleTimecardApprove.bind(this);
		this.handleTimecardView = this.handleTimecardView.bind(this);
		this.handleExpenseApprove = this.handleExpenseApprove.bind(this);
		this.handleExpenseView = this.handleExpenseView.bind(this);
		this.closeModals = this.closeModals.bind(this);
	}

	// initial state modification
	componentWillMount() {

	}

	// filter selections to keep valid ids only
	componentWillReceiveProps(nextProps: props) {
		let selectedExpenseIds = this.state.selectedExpenseIds.filter(id => {
			return this.props.expenses.findIndex(e => e._id == id) > -1;
		});
		let selectedTimecardIds = this.state.selectedTimecardIds.filter(id => {
			return this.props.timecards.findIndex(c => c._id == id) > -1;
		});

		this.setState({
			selectedExpenseIds,
			selectedTimecardIds,
		});
	}


	// SELECTION LIST HANDLER

	handleExpenseSelection(expense: Expense) {
		let selectedExpenseIds = this.state.selectedExpenseIds;
		let index = selectedExpenseIds.indexOf(expense._id);

		if (index == -1) { selectedExpenseIds.push(expense._id); }
		else { selectedExpenseIds.splice(index, 1); }

		this.setState({
			selectedExpenseIds
		});
	}
	handleTimecardSelection(timecard: Timecard) {
		let selectedTimecardIds = this.state.selectedTimecardIds;
		let index = selectedTimecardIds.indexOf(timecard._id);

		if (index == -1) { selectedTimecardIds.push(timecard._id); }
		else { selectedTimecardIds.splice(index, 1); }

		this.setState({
			selectedTimecardIds
		});
	}


	// ACTION HANDLERS

	handleTimecardApprove(cardIds: string[]) {
		for (let i = 0; i < cardIds.length; i++ ) {
			Meteor.call('timecard.approve', cardIds[i]);
		}
	}
	handleTimecardView(timecardId: string) {
		this.setState({
			currentViewedTimecardId: timecardId,
		});
	}
	handleExpenseApprove(expenseIds: string[]) {
		for (let i = 0; i < expenseIds.length; i++ ) {
			Meteor.call('expense.approve', expenseIds[i]);
		}
	}
	handleExpenseView(expenseId: string) {
		this.setState({
			currentViewedExpenseId: expenseId,
		});
	}

	// modals close
	closeModals() {
		this.setState({
			currentViewedTimecardId: null,
			currentViewedExpenseId: null,
		});
	}

	render() {
		// COMPUTE ITEM LISTS
		let timecards = this.props.timecards
		.map(timecard => {
			let task = this.props.tasks.find(task => task._id == timecard.taskId) || {} as Task;
			let employee = this.props.employees.find(e => e.userId == timecard.userId);

			return Object.assign({
				employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'unknown',
				projectName: task.projectName,
				duration: timecard.end - timecard.start,
				// date: moment([timecard.year, timecard.month, timecard.day]),
				actions: 
					<div className="flex-row flex-center flex-start">
						<div className="button action-dostuff small flex-no-shrink"
							 onClick={() => this.handleTimecardView(timecard._id)}>
							{ i18n.__('VIEW') }
						</div>
						<div className="spacer-col small" />
						<div className="button action-warning small flex-no-shrink"
							onClick={() => this.handleTimecardApprove([timecard._id])}>
							{ i18n.__('APPROVE') }
						</div>
					</div>
			}, timecard);
		});

		let expenses = this.props.expenses
			.map(expense => {
				let type = this.props.expenseTypes.find(t => t._id == expense.typeId) || {} as ExpenseType;
				let employee = this.props.employees.find(e => e.userId == expense.userId);

				return Object.assign({
					employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'unknown',
					projectName: expense.projectName,
					typeName: type.name,
					// date: moment([expense.year, expense.month, expense.day]),
					actions:
						<div className="flex-row flex-center flex-start">
							<div className="button action-dostuff small flex-no-shrink"
								 onClick={() => this.handleExpenseView(expense._id)}>
								{ i18n.__('VIEW') }
							</div>
							<div className="spacer-col small" />
							<div className="button action-warning small flex-no-shrink"
								 onClick={() => this.handleExpenseApprove([expense._id])}>
								{ i18n.__('APPROVE') }
							</div>
						</div>
				}, expense);
			});


		// item list params
		let timecardCols: { [index: string]: any } = {};
		timecardCols['employeeName'] = {
			label: i18n.__('Employee'),
			// widthRatio: 0.18,
		};
		timecardCols['projectName'] = { label: i18n.__('Project') };
		timecardCols['date'] = {
			label: i18n.__('Date'),
			widthRatio: 0.16,
			transform: (date) => moment(date).format('L'),
		};
		timecardCols['duration'] = {
			label: i18n.__('Duration'),
			widthRatio: 0.12,
			transform: (duration) => DateTools.convertTimeNumberToString(duration)
		};
		timecardCols['actions'] = {
			label: i18n.__('Actions'),
			className: 'flex-row flex-center flex-start',
			// widthRatio: 0.18,
		};

		let expenseCols: { [index: string]: any } = {};
		expenseCols['employeeName'] = {
			label: i18n.__('Employee'),
			// widthRatio: 0.18,
		};
		expenseCols['projectName'] = { label: i18n.__('Project') };
		expenseCols['date'] = {
			label: i18n.__('Date'),
			widthRatio: 0.16,
			transform: (date) => moment(date).format('L'),
		};
		expenseCols['typeName'] = {
			label: i18n.__('Type'),
			widthRatio: 0.12,
		};
		expenseCols['actions'] = {
			label: i18n.__('Actions'),
			className: 'flex-row flex-center flex-start',
			// widthRatio: 0.18,
		};

		// expense type list
		let expenseTypes = this.props.expenseTypes.map(t => {
			return {
				label: Tools.capitalize(t.name),
				value: t._id,
			}
		});

		// compute selected indices list
		let selectedTimecardsIndices = this.state.selectedTimecardIds.map(id => {
			return timecards.findIndex(t => t._id == id);
		});
		let selectedExpensesIndices = this.state.selectedExpenseIds.map(id => {
			return expenses.findIndex(e => e._id == id);
		});

		return (
			<div className="main-pane width-100 with-toolbar flex-col">
				<div className="page-title">{ i18n.__('Entries Approval') }</div>
				<div className="spacer-row" />

				<div className="flex-row flex-grow">

					<div className="width-50 flex-col">
						<div className="section-title">{ i18n.__('Timesheets') }</div>
						<ItemTableList
							columns={timecardCols}
							items={timecards}
							fixedHeaders={true}
							enableSorting={true}
							className="flex-grow font09"
							itemsSelectable={true}
							selectedIndices={selectedTimecardsIndices}
							onItemSelectChange={this.handleTimecardSelection}
						/>

						<div className="spacer-row" />

						<div className="flex-row flex-no-shrink">
							<div className="button-bar">
								<span>
									<strong>{ this.state.selectedTimecardIds.length }</strong>&nbsp;
									<span>{ i18n.__('timesheets have been selected.') }</span>
								</span>
							</div>
							<div className="spacer-col" />
							{
								this.state.selectedTimecardIds.length > 0 &&
								<div className="button-bar">
									<span>
										{ i18n.__('Actions') }:
									</span>
									<div className="button action-dostuff  flex-no-shrink"
										 onClick={() => this.handleTimecardApprove(this.state.selectedTimecardIds)}>
										{ i18n.__('APPROVE') }
									</div>
								</div>
							}
						</div>
					</div>

					<div className="spacer-col" />

					<div className="width-50 flex-col">
						<div className="section-title">{ i18n.__('Expenses') }</div>
						<ItemTableList
							columns={expenseCols}
							items={expenses}
							fixedHeaders={true}
							enableSorting={true}
							className="flex-grow font09"
							itemsSelectable={true}
							selectedIndices={selectedExpensesIndices}
							onItemSelectChange={this.handleExpenseSelection}
						/>

						<div className="spacer-row" />

						<div className="flex-row flex-no-shrink">
							<div className="button-bar">
								<span>
									<strong>{ this.state.selectedExpenseIds.length }</strong>&nbsp;
									<span>{ i18n.__('expenses have been selected.') }</span>
								</span>
							</div>
							<div className="spacer-col" />
							{
								this.state.selectedExpenseIds.length > 0 &&
								<div className="button-bar">
									<span>
										{ i18n.__('Actions') }:
									</span>
									<div className="button action-dostuff  flex-no-shrink"
										 onClick={() => this.handleExpenseApprove(this.state.selectedExpenseIds)}>
										{ i18n.__('APPROVE') }
									</div>
								</div>
							}
						</div>
					</div>

				</div>

				<div className="spacer-row" />

				<Toolbar />

				{
					(this.state.currentViewedTimecardId != null) &&
					<TimecardEditModal
						timecard={
							this.props.timecards.find(c => c._id == this.state.currentViewedTimecardId)
						}
						onClose={this.closeModals}
						readOnly={true}
					/>
				}
				{
					(this.state.currentViewedExpenseId != null) &&
					<ExpenseEditModal
						expense={
							this.props.expenses.find(c => c._id == this.state.currentViewedExpenseId)
						}
						expenseTypes={expenseTypes}
						onClose={this.closeModals}
						readOnly={true}
					/>
				}
			</div>
		);
	}
}

(EntriesApprovalView as any).defaultProps = {
};

export default createContainer((params) => {
	Meteor.subscribe('timecards.list');
	Meteor.subscribe('expenses.list');
	Meteor.subscribe('tasks.list');
	Meteor.subscribe('projects.list');
	Meteor.subscribe('employees.list');

	let currentUserId = Meteor.userId();

	return {
		expenses: Expenses.find(QueryTools.getExpenseApprovalQuery(currentUserId)).fetch(),
		expenseTypes: ExpenseTypes.find().fetch(),
		timecards: Timecards.find(QueryTools.getTimesheetApprovalQuery(currentUserId)).fetch(),
		tasks: Tasks.find().fetch(),
		projects: Projects.find().fetch(),
		currentUserId,
		employees: Employees.find().fetch(),
		currentEmployee: Employees.findOne({ userId: currentUserId }),
	};

}, EntriesApprovalView);
