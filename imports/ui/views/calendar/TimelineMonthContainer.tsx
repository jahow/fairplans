import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import * as classnames from 'classnames';
import * as moment from 'moment';
import { createContainer } from 'meteor/react-meteor-data';

import { Tools, DateTools } from '../../../utils/tools'
import { Timecard, Timecards, Task, Tasks,
	Expense, Expenses, Project, Projects } from '../../../data/collections';
import { CalendarSpanType, CalendarDataType } from '../CalendarView';


interface props {
	dataType: CalendarDataType,		// timecard, expense...
	currentUserId: string,

	year: number,
	month: number,
	dayWidth: number,
	spanType: string,
	onDayClick?: (year: number, month: number, day: number) => any,

	// mobileView: boolean,
	shiftX: number,		// used to translate the block on the X axis

	// used for project preview
	cards: Timecard[],
	expenses: Expense[],
	tasks: Task[],
}

interface state {
	projectColors?: { color: { r: number, g: number, b: number }, id: string }[],

	// project preview
	projectIds?: string[],		// array of project ids
	projectDistribution?: { ratio: number, id: string }[][],	// index is the date, ratio is a number between 0 and 1
}


class TimelineMonthContainer extends Component<props, state> {

	constructor(props: props) {
		super(props);
		this.state = {
			projectColors: [],
			projectDistribution: [],
			projectIds: [],
		};

		this.computeProjectDistribution(props.cards, props.expenses, props.currentUserId, props.dataType);
	}
	
	_isMounted: boolean;

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if display params have not changed: skip render
		if (nextProps.year == this.props.year &&
			nextProps.month == this.props.month &&
			nextProps.spanType == this.props.spanType &&
			nextProps.dataType == this.props.dataType &&
			nextProps.shiftX == this.props.shiftX &&
			nextProps.currentUserId == this.props.currentUserId &&
			nextState.projectColors == this.state.projectColors &&
			nextState.projectDistribution == this.state.projectDistribution) {
			return false;
		}

		return true;
	}

	componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	// on objectCardProps receive: recompute color of timecard
	componentWillReceiveProps(nextProps: props) {
		this.computeProjectDistribution(nextProps.cards, nextProps.expenses, nextProps.currentUserId, nextProps.dataType);
	}

	// compute project distribution on the month
	computeProjectDistribution(cardsUnfiltered: Timecard[], expensesUnfiltered: Expense[], userId: string, dataType: CalendarDataType) {
		if (!this._isMounted) { return; }

		let projectDistribution = [];
		let projectIds = [];

		// preview for timecards
		if (dataType == 'timecard') {
			let cards = cardsUnfiltered.filter(c => c.userId == userId);
			let card: Timecard;
			let task: Task;
			for (let i = 0; i < cards.length; i++) {
				card = cards[i];

				let ratio = (card.end - card.start) / 10;	// TODO : USE CONSTANTS!!

				task = Tasks.findOne(card.taskId);
				if (!task) { continue; }

				if (projectIds.indexOf(task.projectId) == -1) { projectIds.push(task.projectId); }

				let dayDist = projectDistribution[card.day];
				if(!dayDist) {
					dayDist = [];
					projectDistribution[card.day] = dayDist;
				}

				let index = dayDist.findIndex(d => d.id == task.projectId);
				if (index > -1) {
					dayDist[index].ratio += ratio;
				} else {
					dayDist.push({ id: task.projectId, ratio });
				}
			}
		}

		// preview for expenses
		else if (dataType == 'expense') {
			let expenses = expensesUnfiltered.filter(e => e.userId == userId);
			let expense: Expense;
			for (let i = 0; i < expenses.length; i++) {
				expense = expenses[i];

				if (projectIds.indexOf(expense.projectId) == -1) { projectIds.push(expense.projectId); }

				let dayDist = projectDistribution[expense.day];
				if(!dayDist) {
					dayDist = [];
					projectDistribution[expense.day] = dayDist;
				}

				let index = dayDist.findIndex(d => d.id == expense.projectId);
				if (index > -1) {
					dayDist[index].ratio += 0.2;
				} else {
					dayDist.push({ id: expense.projectId, ratio: 0.2 });
				}
			}
		}

		projectDistribution.forEach(dist => dist = dist.sort(Tools.getSortFunctionByProp('id')));

		let me = this;
		this.setState({
			projectDistribution,
			projectIds,
		}, function() {
			me.computeColors();
		});
	}

	// compute colors for project ids 
	computeColors() {
		if (!this.state.projectIds.length) { return; }

		// check if project ids are the same
		let sameProjects = true;
		for (let i = 0; i < this.state.projectIds.length; i++) {
			if (this.state.projectColors.findIndex(c => c.id == this.state.projectIds[i]) == -1) {
				sameProjects = false;
				break;
			}
		}
		if (sameProjects) { return; }

		Meteor.call('color.generate.batch', this.state.projectIds, (err, res) => {
			if (err) { console.error(err); return; }
			if (!this._isMounted) { return; }

			if (res.length == 0) { return; }

			this.setState({
				projectColors: res.map(c => {
					return {
						id: c.id,
						color: `#${c.color.r.toString(16)}${c.color.g.toString(16)}${c.color.b.toString(16)}`,
					};
				}),
			});
		});
	}

	isEndOfSpan(dayIndex, dayCount) {
		switch (this.props.spanType) {
			case 'day': return true;
			case 'week':
			case 'week_alt':
				let currentDay = moment([this.props.year, this.props.month]).date(dayIndex + 1);
				return currentDay.day() == 6;	// are we sunday?
			case 'month': return dayIndex == dayCount - 1;
		}
		return false;
	}

	// RENDERING

	render() {
		var coords = DateTools.getMonthCoordinatesInTimeline(this.props.year, this.props.month);

		var styles = {
			left: this.props.dayWidth * (coords.start - 0.5),
			width: this.props.dayWidth * coords.length,
			transform: 'translateX('+this.props.shiftX+'px)'
		};

		var present = moment();
		var presentMonth = this.props.month == present.month()
			&& this.props.year == present.year();
		var presentDay = presentMonth ? present.date() : -1;
		let thisMonth = moment([this.props.year, this.props.month]);

		// compute the days in the month
		var daysCount = thisMonth.endOf('month').date();
		var days = new Array(daysCount);
		for (let i = 0; i < daysCount; i++) {
			days[i] = {
				day: i + 1,
				isToday: (i + 1 == presentDay),
				isSpanEnd: this.isEndOfSpan(i, daysCount),
				isFuture: moment(thisMonth).date(i + 1).isAfter(present, 'day'),
			}
		}

		// month label
		let label = DateTools.getMonthName(this.props.month).toUpperCase()
			+ " " + this.props.year;

		// project preview
		let distribFormat = (project, index) => {
			let projectColor = this.state.projectColors.find(c => c.id == project.id);
			let style = {
				height: (project.ratio * 100).toFixed(2) + '%',
				backgroundColor: projectColor && projectColor.color,
			};
			return <div style={style} key={index}></div>;
		};

		return (
			<div className="timeline-month-container" style={styles}>
				<div className="month-label">
					{label}
				</div>
				{
					days.map((day, i) => 
						<div
							className={
								(day.isToday ? "day-block present" : "day-block") +
								(day.isSpanEnd ? " span-end" : "")
							}
							key={i}
							style={{width: this.props.dayWidth}}
							onClick={() => this.props.onDayClick(this.props.year, this.props.month, i+1)}
						>
							{
								(this.state.projectDistribution[i+1] != null) &&
								<div className={'project-dist '+(day.isFuture ? 'future' : '')}>
								{
									this.state.projectDistribution[i+1].map(distribFormat)
								}
								</div>
							}

							<span className="day-label">{i+1}</span>
						</div>
					)
				}
			</div>
		);
	}
}

export default createContainer((params: props) => {

	Meteor.subscribe('timecards.day', { year: params.year, month: params.month });
	Meteor.subscribe('expenses.day', { year: params.year, month: params.month });

	let currentUserId = params.currentUserId || Meteor.userId();
	let cards = Timecards.find({ "year": params.year, "month": params.month, repeating: false }).fetch();
	let expenses = Expenses.find({ "year": params.year, "month": params.month }).fetch();

	return {
		// projectDistribution: distribution,
		// projectIds,
		expenses,
		cards,
		tasks: Tasks.find().fetch(),
		currentUserId,
	};

}, TimelineMonthContainer);