import * as React from 'react';
import { Component } from 'react';
import { Link } from 'react-router';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Timecards, Timecard, Expenses, Expense, UserEntryStatus } from '../../data/collections';
import { Employee, Employees, EmployeeGroups, EmployeeGroup } from '../../data/collections';
import { Projects, Project } from '../../data/collections';

import Spinner from '../widgets/Spinner';
import ProjectList from '../subviews/ProjectList';
import LogEntriesList from '../subviews/LogEntriesList';
import ToDoList from '../subviews/ToDoList';
import Toolbar from '../subviews/Toolbar';


interface props {
}
interface state {
}


export default class HomeView extends Component<props, state> {

	render() {
		let style = {
			maxWidth: 900,
			width: '100%',
			alignSelf: 'center',
		};

		return (
			<div className="home-view with-toolbar width-100">
				<div className="flex-col padding-outer-gutter scroll-y">

					<div className="spacer-row flex-grow flex-shrink" />
						<div className="app-title text-center">Fairplans</div>
					<div className="spacer-row" />

					<div className="forward-pane flex-row padding-inner-gutter flex-no-shrink" style={style}>

						<section className="width-17 flex-no-shrink">
							<div className="section-title small nowrap">{ i18n.__('Recent Activities') }</div>
							<LogEntriesList maxCount={5} />
						</section>

						<div className="spacer-col" />

						<section className="flex-grow">

							<div className="flex-row">

								<MyCalendarWidget className="width-60" />

								<div className="spacer-col" />

								<MyGroupsWidget className="flex-grow" />

							</div>

							<div className="spacer-row" />

							<MyProjectsWidget className="" />

							<div className="spacer-row" />

							<MyEmployeesWidget className="" />

						</section>
						
						<div className="spacer-col" />

						<section className="width-33 flex-no-shrink">
							<div className="section-title small nowrap">{ i18n.__('Things To Do') }</div>
							<ToDoList />
						</section>

					</div>

					<div className="spacer-row" />

					<div className="spacer-row flex-grow flex-shrink" />

				</div>

				<Toolbar />
			</div>
		);
	}

}


//
// WIDGETS
//

// MY CALENDAR

interface myCalendarProps {
	id?: string,
	className?: string,
	style?: Object,

	// reactive data (filtered for this user)
	myTimecards: Timecard[],
	myExpenses: Expense[],
}
interface myCalendarState {
}

class MyCalendarWidgetContained extends Component<myCalendarProps, myCalendarState> {

	constructor(props: myCalendarProps) {
		super(props);
	}

	render() {
		let className = `my-calendar-widget widget ${this.props.className || ''}`;
		let presentDay = moment();

		let timesheetsDraft = this.props.myTimecards
		.filter(c => c.status == UserEntryStatus.DRAFT).length;
		let expensesDraft = this.props.myExpenses
		.filter(e => e.status == UserEntryStatus.DRAFT).length;

		let timesheetsPending = this.props.myTimecards
		.filter(c => c.status == UserEntryStatus.SUBMITTED).length;
		let expensesPending = this.props.myExpenses
		.filter(e => e.status == UserEntryStatus.SUBMITTED).length;

		// TODO: compute working hours based on day start/end
		let elapsedWeekHours = 0;
		let startOfWeek = moment(presentDay).day(1);
		elapsedWeekHours = presentDay.diff(startOfWeek, 'days') * 8;	// TODO: factorize this

		let timesheetWeekSum = 0;
		this.props.myTimecards.filter(c => {
			let day = moment([c.year, c.month, c.day]);
			return day.isSame(presentDay, 'week');
		}).forEach(c => {
			timesheetWeekSum += (c.end - c.start);
		});

		return (
			<div id={this.props.id} className={className} style={this.props.style}>

				<Link className="header-box" to="/calendar">
					<div className="day-line">{ presentDay.format('DD') }</div>
					<div className="month-line">{ presentDay.format('MMM').toUpperCase() }</div>
					<div className="label-line">{ i18n.__('MY CALENDAR') }</div>
				</Link>
				
				<div className="flex-row">

					<div className="footer-box left flex-grow">
						<div className="title">{ i18n.__('DRAFTS') }</div>
						<Link to="/timesheets/?status=100&future=0">
							<strong>{ timesheetsDraft }</strong> { i18n.__('timesheets') }<br/>
						</Link>
						<Link to="/expenses/?status=100&future=0">
							<strong>{ expensesDraft }</strong> { i18n.__('expenses') }
						</Link>
					</div>

					<div className="footer-box middle flex-grow">
						<div className="title">{ i18n.__('PENDING') }</div>
						<Link to="/timesheets/?status=101">
							<strong>{ timesheetsPending }</strong> { i18n.__('timesheets') }<br/>
						</Link>
						<Link to="/expenses/?status=101">
							<strong>{ expensesPending }</strong> { i18n.__('expenses') }
						</Link>
					</div>

					<div className="footer-box right flex-grow">
						<div className="title">{ i18n.__('THIS WEEK') }</div>
						<strong>{ elapsedWeekHours }</strong> { i18n.__('working hours elapsed') }<br/>
						<strong>{ timesheetWeekSum }</strong> { i18n.__('hours in timesheets') }
					</div>

				</div>

			</div>
		);
	}
}

let MyCalendarWidget = createContainer((params) => {
	Meteor.subscribe('timecards.list');
	Meteor.subscribe('expenses.list');
	return {
		myTimecards: Timecards.find({ userId: Meteor.userId(), repeating: false }).fetch(),
		myExpenses: Expenses.find({ userId: Meteor.userId() }).fetch(),
	};
}, MyCalendarWidgetContained);


// MY GROUPS

interface myGroupsProps {
	id?: string,
	className?: string,
	style?: Object,

	// reactive data
	myGroupsAsManager: EmployeeGroup[],
	myGroupsAsMember: EmployeeGroup[],
}
interface myGroupsState {
}

class MyGroupsWidgetContained extends Component<myGroupsProps, myGroupsState> {

	constructor(props: myGroupsProps) {
		super(props);
	}

	render() {
		let className = `my-groups-widget widget flex-col ${this.props.className || ''}`;

		return (
			<div id={this.props.id} className={className} style={this.props.style}>

				<div className="header-box">
					{ i18n.__('MY GROUPS') }
				</div>

				<div className="footer-box flex-grow">

				{
					this.props.myGroupsAsManager.length > 0 &&
					<div className="label-line">{ i18n.__('AS MANAGER') }:</div>
				}
				{
					this.props.myGroupsAsManager.map(g =>
						<Link key={'a'+g._id} className="group-line" to={`/mygroups/${g._id}`}>{ g.name }</Link>
					)
				}

				{
					this.props.myGroupsAsMember.length > 0 &&
					<div className="label-line">{ i18n.__('AS MEMBER') }:</div>
				}
				{
					this.props.myGroupsAsMember.map(g =>
						<Link key={'b'+g._id} className="group-line" to={`/mygroups/${g._id}`}>{ g.name }</Link>
					)
				}

				{
					this.props.myGroupsAsManager.length > 0 &&
					<div>
						<div className="spacer-row small" />
						<Link to="/projects-overview" className="calendar-link">{ i18n.__('GO TO PLANNING VIEW') }</Link>
					</div>
				}
					
				</div>
			</div>
		);
	}
}

let MyGroupsWidget = createContainer((params) => {
	Meteor.subscribe('employeegroups.list');
	Meteor.subscribe('employees.me');
	let me = Employees.findOne({ userId: Meteor.userId() }) || {} as Employee;
	return {
		myGroupsAsManager: EmployeeGroups.find({
			assignedManagers: {
				$elemMatch: { $eq: me._id }
			}
		}).fetch(),
		myGroupsAsMember: EmployeeGroups.find({
			assignedMembers: {
				$elemMatch: { $eq: me._id }
			}
		}).fetch(),
	};
}, MyGroupsWidgetContained);


// MY PROJECTS

interface myProjectsProps {
	id?: string,
	className?: string,
	style?: Object,

	// reactive data
	employeeId: string,
}
interface myProjectsState {
}

class MyProjectsWidgetContained extends Component<myProjectsProps, myProjectsState> {

	constructor(props: myProjectsProps) {
		super(props);
	}

	render() {
		let className = `my-projects-widget widget flex-col ${this.props.className || ''}`;

		return (
			<div id={this.props.id} className={className} style={this.props.style}>

				<div className="header-box">
					{ i18n.__('MY ACTIVE PROJECTS') }
				</div>

				<div className="footer-box flex-grow">

				<ProjectList
					enableLinks={true}
					columnCount={2}
					displayGroupButtons={false}
					displaySearchBar={false}
					// memberIdFilter={this.props.employeeId}
					compactMode={true}
					activeProjectsOnly={true}
				/>
					
				</div>
			</div>
		);
	}
}

let MyProjectsWidget = createContainer((params) => {
	Meteor.subscribe('employees.me');
	let me = Employees.findOne({ userId: Meteor.userId() }) || {} as Employee;
	return {
		employeeId: me._id,
	};
}, MyProjectsWidgetContained);


// MY EMPLOYEES

interface myEmployeesProps {
	id?: string,
	className?: string,
	style?: Object,

	// reactive data
	myManagedGroups?: EmployeeGroup[],
	employees?: Employee[],
}
interface myEmployeesState {
}

class MyEmployeesWidgetContained extends Component<myEmployeesProps, myEmployeesState> {

	constructor(props: myEmployeesProps) {
		super(props);
	}

	render() {
		let className = `my-employees-widget widget flex-col ${this.props.className || ''}`;

		return (
			<div id={this.props.id} className={className} style={this.props.style}>

				<div className="header-box">
					{ i18n.__('MY EMPLOYEES') }
				</div>

				<div className="footer-box flex-grow flex-row flex-wrap">

				{
					this.props.myManagedGroups.map(g =>
						<div className="flex-col group-block flex-grow" key={g._id}>
							<div className="label-line">{ g.name.toUpperCase() }</div>
							{
								g.assignedMembers.map(id => {
									let e = this.props.employees.find(e => e._id == id);
									if (!e) { return ''; }

									return (
										<Link
											key={id}
											className="employee-line"
											to={`/employees/${e._id}`}>
											{ e.firstName } { e.lastName }
										</Link>
									);
								})
							}
						</div>
					)
				}
					
				</div>
			</div>
		);
	}
}

let MyEmployeesWidget = createContainer((params) => {
	Meteor.subscribe('employeegroups.list');
	Meteor.subscribe('employees.me');
	let me = Employees.findOne({ userId: Meteor.userId() }) || {} as Employee;
	return {
		myManagedGroups: EmployeeGroups.find({
			assignedManagers: {
				$elemMatch: { $eq: me._id }
			}
		}).fetch(),
		employees: Employees.find().fetch(),
	};
}, MyEmployeesWidgetContained);