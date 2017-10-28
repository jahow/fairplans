import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { Expenses, Expense, Timecards, Timecard, Employees, Employee, IntercompanyAgreements } from '../../data/collections';
import { Link } from 'react-router';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import { QueryTools } from '../../utils/tools';



interface todoListProps {
	// reactive data
	expensesCount: number,
	timecardsCount: number,
	agreementsCount: number,

	id?: string,
	className?: string,
	style?: Object,
}

class ToDoList extends Component<todoListProps, any> {

	constructor(props: todoListProps) {
		super(props);

		this.state = {

		};
	}

	render() {
		return (
		    <div className={'todo-list flex-col '+(this.props.className || '')} id={this.props.id} style={this.props.style}>

				{
					this.props.timecardsCount > 0 &&
					<div className="widget-box">
						<Link to="/approval">
							<strong>{ this.props.timecardsCount } { i18n.__('timesheets') }</strong> { i18n.__('left to approve.') }
						</Link>
					</div>
				}
				{
					this.props.timecardsCount > 0 &&
					<div className="spacer-row small"/>
				}

				{
					this.props.expensesCount > 0 &&
					<div className="widget-box">
						<Link to="/approval">
							<strong>{ this.props.expensesCount } { i18n.__('expenses') }</strong> { i18n.__('left to approve.') }
						</Link>
					</div>
				}
				{
					this.props.expensesCount > 0 &&
					<div className="spacer-row small"/>
				}

				{
					this.props.agreementsCount > 0 &&
					<div className="widget-box">
						<Link to="/agreements">
							<strong>{ this.props.agreementsCount } { i18n.__('intercompany agreements') }</strong> { i18n.__('left to approve.') }
						</Link>
					</div>
				}

				{
					this.props.expensesCount == 0 && this.props.timecardsCount == 0 && this.props.agreementsCount == 0 &&
					<div className="widget-box">
						{ i18n.__('Nothing left to approve.') }
					</div>
				}

		    </div>
        );
	}
}

export default createContainer<todoListProps>((props: todoListProps) => {

	Meteor.subscribe('timecards.list');
	Meteor.subscribe('expenses.list');
	Meteor.subscribe('tasks.list');
	Meteor.subscribe('projects.list');
	Meteor.subscribe('current.employee');

	let currentUserId = Meteor.userId();
	let currentEmployee = Employees.findOne({ userId: currentUserId }) || {} as Employee;

	Meteor.subscribe('intercompany.agreements', { managerId: currentEmployee._id });

	return {
		expensesCount: Expenses.find(QueryTools.getExpenseApprovalQuery(currentUserId)).count(),
		timecardsCount: Timecards.find(QueryTools.getTimesheetApprovalQuery(currentUserId)).count(),
		agreementsCount: IntercompanyAgreements.find({ isApproved: false }).count(),
	};

}, ToDoList);

