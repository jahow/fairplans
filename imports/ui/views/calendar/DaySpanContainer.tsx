import * as React from 'react';
import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { Meteor } from 'meteor/meteor';
import * as classnames from 'classnames';
import { Tools, DateTools, UserEntryTools, QueryTools } from '../../../utils/tools'
import { createContainer } from 'meteor/react-meteor-data';
import { DropTarget } from 'react-dnd';
import ReactModal2 from 'react-modal2';
import { Gateway } from 'react-gateway';
import * as moment from 'moment';


import { TAPi18n as i18n } from 'meteor/tap:i18n';

import { Timecards, Timecard, UserEntryStatus } from '../../../data/collections';
import { Expenses, Expense } from '../../../data/collections';
import { ExpenseTypes, ExpenseType } from '../../../data/collections';
import { Tasks, Task } from '../../../data/collections';
import { Projects, Project } from '../../../data/collections';
import { Employees, Employee, EmployeeRoles, EmployeeRole } from '../../../data/collections';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../../subviews/MessagesDisplay';

import TimeCard from './TimeCard';
import ExpenseCard from './ExpenseCard';

import TimecardEditModal from '../../subviews/TimecardEditModal';
import ExpenseEditModal from '../../subviews/ExpenseEditModal';
import Spinner from '../../widgets/Spinner';
import DraggableFrame from '../../controls/DraggableFrame';


const DAY_TIMESTEP = 0.25;	// 5 minutes
const DAY_MINDURATION = 0.25;		// 15 minutes

const DEFAULT_DURATION = 1.5;	// default timecard duration

interface props {
	dataType: 'timecard' | 'expense',		// time, expense, leave (?)

	year: number,
	month: number,
	day: number,
	dayStart: number,
	dayEnd: number,
	renderMinified?: boolean,
	renderHorizontal?: boolean,
	renderDetails?: boolean,
	currentUserId: string,
	viewedUserId?: string,

	cards: Timecard[],
	expenses: Expense[],
	expenseTypes: ExpenseType[],
	tasks: Task[],
	projects: Project[],
	currentEmployee: Employee,
	isAdmin?: boolean,
	subReady: boolean,

	// instances of repeating tasks
	repeatingCardInstances: Timecard[],

	onCardOver?: (card_id: string, element: HTMLElement) => any,
	onCardOut?: (card_id: string, element: HTMLElement) => any,
	onCardClick?: (card_id: string, element: HTMLElement) => any,

	// day scroll
	onDayScroll?: (newDayStart: number, newDayEnd: number) => any,

	// click on day
	onDayClick?: (year: number, month: number, day: number) => any,

	//drag n drop
	isHovered: boolean,		// true if hovered by any droppable object
	connectDropTarget?: (element: any) => any
}

interface state {
	previewBoxVisible?: boolean,
	previewBoxStart?: number,
	previewBoxEnd?: number,		// used to preview card creation, resize, move etc.
	previewBoxMinDuration?: number,		// beyond these values, the box will appear red
	previewBoxMaxDuration?: number,

	currentEditedTimecardId?: string,
	currentEditedExpenseId?: string,

	// drag-n-drop
	hoveringObjectPosition?: number

	// allowed actions
	allowedTimecardActions?: { [id: string]: { canEdit: boolean, canDelete: boolean, canSubmit: boolean, canApprove: boolean }};
	allowedExpenseActions?: { [id: string]: { canEdit: boolean, canDelete: boolean, canSubmit: boolean, canApprove: boolean }};

	// project colors
	projectColors?: { [id: string]: string };	// CSS color
}


class DaySpanContainer extends Component<props, state> {

	constructor(props: props) {
		super(props);
		this.state = {
			allowedTimecardActions: {},
			allowedExpenseActions: {},
			projectColors: {},
			previewBoxMinDuration: 0,
			previewBoxMaxDuration: 24,
		};

		this.computeColors(props);

		this.hidePreviewBox = this.hidePreviewBox.bind(this);
		this.showPreviewBox = this.showPreviewBox.bind(this);

		this.handleTimecardResize = this.handleTimecardResize.bind(this);
		this.handleTimecardDelete = this.handleTimecardDelete.bind(this);
		this.handleTimecardSubmit = this.handleTimecardSubmit.bind(this);
		this.handleTimecardApprove = this.handleTimecardApprove.bind(this);
		this.toggleTimecardEditModal = this.toggleTimecardEditModal.bind(this);
		this.handleTimecardNewTask = this.handleTimecardNewTask.bind(this);
		this.handleTimecardCopy = this.handleTimecardCopy.bind(this);

		this.handleDayScroll = this.handleDayScroll.bind(this);
		this.handleDayClick = this.handleDayClick.bind(this);

		this.handleExpenseDelete = this.handleExpenseDelete.bind(this);
		this.handleExpenseSubmit = this.handleExpenseSubmit.bind(this);
		this.handleExpenseApprove = this.handleExpenseApprove.bind(this);
		this.toggleExpenseEditModal = this.toggleExpenseEditModal.bind(this);
		this.handleExpenseNewProject = this.handleExpenseNewProject.bind(this);

		this.closeModals = this.closeModals.bind(this);

		this.renderMinified = this.renderMinified.bind(this);
		this.renderFull = this.renderFull.bind(this);
	}

	_container: HTMLElement;
	_isMounted: boolean;

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if display objectCardProps have not changed: do not rerender
		if (this.state.previewBoxEnd == nextState.previewBoxEnd &&
			this.state.previewBoxStart == nextState.previewBoxStart &&
			this.state.previewBoxVisible == nextState.previewBoxVisible &&
			this.state.currentEditedExpenseId == nextState.currentEditedExpenseId &&
			this.state.currentEditedTimecardId == nextState.currentEditedTimecardId &&
			this.state.allowedTimecardActions == nextState.allowedTimecardActions &&
			this.state.allowedExpenseActions == nextState.allowedExpenseActions &&
			this.state.allowedExpenseActions == nextState.allowedExpenseActions &&
			this.state.projectColors == nextState.projectColors &&
			this.props.dayStart == nextProps.dayStart &&
			this.props.dayEnd == nextProps.dayEnd &&
			this.props.isHovered == nextProps.isHovered &&
			this.props.cards == nextProps.cards &&
			this.props.repeatingCardInstances == nextProps.repeatingCardInstances &&
			this.props.expenses == nextProps.expenses &&
			this.props.currentUserId == nextProps.currentUserId &&
			this.props.viewedUserId == nextProps.viewedUserId) {
			// console.log('skipped');
			return false;
		}
		// console.log('not skipped');
		return true;
	}


	componentDidMount() {
		this._isMounted = true;
		this.updateAllowedActions(this.props);
	}

	componentWillMount() {
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	componentWillReceiveProps(nextProps: props) {
		this.computeColors(nextProps);
		this.updateAllowedActions(nextProps);
	}

	// compute colors for project ids 
	computeColors(props: props) {
		if (!props.projects.length) { return; }

		// check if project ids are the same
		let sameProjects = true;
		for (let i = 0; i < props.projects.length; i++) {
			if (!this.state.projectColors[props.projects[i]._id]) {
				sameProjects = false;
				break;
			}
		}
		if (sameProjects) { return; }

		let projectIds = props.projects.map(p => p._id);

		Meteor.call('color.generate.batch', projectIds, (err, res) => {
			if (err) { console.error(err); return; }
			if (!this._isMounted) { return; }
			if (res.length == 0) { return; }

			let projectColors = {};
			res.forEach(c => projectColors[c.id] = `#${c.color.r.toString(16)}${c.color.g.toString(16)}${c.color.b.toString(16)}`);

			this.setState({
				projectColors,
			});
		});
	}

	// compute allowed actions on cards
	updateAllowedActions(props: props) {
		// update possible actions
		let allowedTimecardActions = {};
		let allowedExpenseActions = {};

		props.cards.concat(props.repeatingCardInstances).forEach(timecard => {
			let isFuture = UserEntryTools.isFutureEntry('timecard',
				timecard.year, timecard.month, timecard.day, timecard.end);

			let isProjectManager = false;
			let project = this.props.projects.find(p => p._id == timecard.projectId);
			if (project && this.props.currentEmployee &&
				project.assignedManagers.indexOf(this.props.currentEmployee._id) > -1) {
				isProjectManager = true;
			}

			let isOwnEntry = this.props.currentUserId == timecard.userId;

			allowedTimecardActions[timecard._id] = UserEntryTools.getPossibleActions('timecard',
				timecard.status, false, this.props.isAdmin,
				isProjectManager, isOwnEntry, isFuture);

			// Todo: check for admin/manager role
		});
		props.expenses.forEach(expense => {
			let isFuture = UserEntryTools.isFutureEntry('expense',
				expense.year, expense.month, expense.day);

			let isProjectManager = false;
			let project = this.props.projects.find(p => p._id == expense.projectId);
			if (project && this.props.currentEmployee &&
				project.assignedManagers.indexOf(this.props.currentEmployee._id) > -1) {
				isProjectManager = true;
			}

			let isOwnEntry = this.props.currentUserId == expense.userId;

			allowedExpenseActions[expense._id] = UserEntryTools.getPossibleActions('expense',
				expense.status, false, this.props.isAdmin,
				isProjectManager, isOwnEntry, isFuture);

			// Todo: check for admin/manager role
		});

		// save state
		this.setState({
			allowedTimecardActions,
			allowedExpenseActions,
		});
	}


	// UTILS (ui only)

	// returns a time as number (0-24) according to day start and end
	getTimeFromRatio(ratio: number) {
		return this.props.dayStart + ratio*(this.props.dayEnd - this.props.dayStart);
	}

	roundToTimestep(time) {
		return Math.round(time / DAY_TIMESTEP) * DAY_TIMESTEP;
	}


	// PREVIEW BOX
	// if useHoveredProps is true, the prop isHovered will be used to determine the visibiliy of the preview box
	showPreviewBox(start: number, end: number, useHoveredProp?: boolean, minDuration?: number, maxDuration?: number) {
		this.setState({
			previewBoxVisible: !useHoveredProp,
			previewBoxStart: start,
			previewBoxEnd: end,
			previewBoxMinDuration: minDuration || 0,
			previewBoxMaxDuration: maxDuration || 24,
		});
	}
	hidePreviewBox() {
		this.setState({
			previewBoxVisible: false
		});
	}


	// DATA HELPERS
	getTimecardsForUser(repeatInstances?: boolean) {
		if (repeatInstances) {
			return this.props.repeatingCardInstances.filter(c => c.userId == this.props.viewedUserId);
		}
		return this.props.cards.filter(c => c.userId == this.props.viewedUserId);
	}
	getExpensesForUser() {
		return this.props.expenses.filter(e => e.userId == this.props.viewedUserId);
	}

	// timecard manipulation helpers
	createTimecard(start: number, end: number, taskId: string) {
		Meteor.call('timecard.new', {
			year: this.props.year,
			month: this.props.month,
			day: this.props.day,
			start: this.roundToTimestep(start),
			end: this.roundToTimestep(end),
			userId: this.props.viewedUserId,
			taskId
		}, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Timesheet creation failed (unknown reason).'));
				return;
			}
		});
	}
	updateTimecard(timecardId: string, start: number, end: number) {
		Meteor.call('timecard.update', timecardId, {
			year: this.props.year,
			month: this.props.month,
			day: this.props.day,
			start: this.roundToTimestep(start),
			end: this.roundToTimestep(end),
		}, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Timesheet update failed (unknown reason).'));
				return;
			}
		});
	}
	computeTimecardTimes(positionRatio: number, duration: number, checkOtherCards?: boolean, currentCardId?: string, allowShift?: boolean, allowShrink?: boolean) {
		let position = this.props.dayStart + (this.props.dayEnd - this.props.dayStart) * positionRatio;
		let times = {
			start: this.roundToTimestep(position - duration / 2),
			end: this.roundToTimestep(position + duration / 2),
		};

		// do not check against other cards
		if (!checkOtherCards) { return times; }

		// gather the cards array
		let otherCards = this.getTimecardsForUser();
		if (currentCardId) { otherCards = otherCards.filter(c => c._id != currentCardId); }

		let validTime = UserEntryTools.attemptTimecardPosition(otherCards,
			times.start, times.end,
			allowShift, allowShrink,
			this.props.dayStart, this.props.dayEnd);

		return validTime;
	}
	createExpenseCard(projectId: string) {
		Meteor.call('expense.new', {
			year: this.props.year,
			month: this.props.month,
			day: this.props.day,
			userId: this.props.viewedUserId,
			projectId
		});
	}
	updateExpense(expenseId: string) {
		Meteor.call('expense.update', expenseId, {
			year: this.props.year,
			month: this.props.month,
			day: this.props.day,
		});
	}


	// DRAG N DROP HANDLERS

	// drop ratios are relative positions normalized to [0,1]
	handleDrop(itemType: string, item: any, dropRatioX: number, dropRatioY: number) {
		// create task card from catalog
		if (itemType == 'task-card' && item.taskId && this.props.dataType == 'timecard') {
			let validTime = this.computeTimecardTimes(
				this.props.renderHorizontal ?
					dropRatioX :
					dropRatioY ,
				item.duration || DEFAULT_DURATION, true, null, true, false
			);
			if (validTime) {
				this.createTimecard(validTime.start, validTime.end, item.taskId);
			}
			return;
		}

		// create expense from project card
		if (itemType == 'project-card' && item.projectId && this.props.dataType == 'expense') {
			this.createExpenseCard(item.projectId);
			return;
		}

		// move time card
		if (itemType == 'time-card' && item.timecardId && item.duration) {
			let validTime = this.computeTimecardTimes(
				this.props.renderHorizontal ? dropRatioX : dropRatioY,
				item.duration, true, item.timecardId, true, false
			);
			if (validTime) {
				this.updateTimecard(item.timecardId, validTime.start, validTime.end);
			}
			return;
		}

		// move expense card
		if (itemType == 'expense-card' && item.expenseId) {
			this.updateExpense(item.expenseId);
			return;
		}

		console.error('drop failed!');
	}

	// preview card when one is hovering above us
	handleObjectHovering(itemType: string, item: any, dropRatioX: number, dropRatioY: number) {
		// temp
		//return;

		// preview time card
		if ((itemType == 'time-card' && item.timecardId && item.duration) ||
			(itemType == 'task-card' && item.taskId)) {
			let validTime = this.computeTimecardTimes(
				this.props.renderHorizontal ?
					dropRatioX :
					dropRatioY ,
				item.duration || DEFAULT_DURATION, true, item.timecardId, true, false
			);

			if (validTime) {
				this.showPreviewBox(validTime.start, validTime.end, true);
			} else {
				this.hidePreviewBox();
			}

			return;
		}
	}


	// TIMECARD HANDLERS

	handleTimecardResize(cardId: string, newStart: number, newEnd: number, preview?: boolean) {
		// look for valid times
		let otherCards = this.getTimecardsForUser().filter(c => c._id != cardId);
		let validTime = UserEntryTools.attemptTimecardPosition(otherCards,
			this.roundToTimestep(newStart),
			this.roundToTimestep(newEnd),
			false, true);

		if (validTime) {

			// show preview box
			if (preview) {

				// attempt to load task to check against min/max duration
				let card = this.props.cards.find(c => c._id == cardId);
				let task = this.props.tasks.find(t => t._id == card.taskId)
				if (card && card.taskId && task && task.hoursBudgetConstrained) {
					this.showPreviewBox(validTime.start, validTime.end, false,
						task.minEntryDuration < task.hoursRemaining ? task.minEntryDuration : 0, task.hoursRemaining + card.end - card.start);
				} else {
					this.showPreviewBox(validTime.start, validTime.end);
				}
			}

			// actual data operation
			else {
				this.updateTimecard(cardId, validTime.start, validTime.end);
			}
		}
	}
	handleTimecardDelete(cardId: string) {
		Meteor.call('timecard.delete', cardId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Timesheet deletion failed (unknown reason).'));
				return;
			}
		});
	}
	handleTimecardSubmit(cardId: string) {
		Meteor.call('timecard.submit', cardId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Timesheet submit failed (unknown reason).'));
				return;
			}
		});
	}
	handleTimecardApprove(cardId: string) {
		Meteor.call('timecard.approve', cardId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Timesheet approval failed (unknown reason).'));
				return;
			}
		});
	}
	toggleTimecardEditModal(cardId: string) {
		this.setState({
			currentEditedTimecardId: cardId
		});
	}
	handleTimecardNewTask(cardId: string, taskId: string) {
		Meteor.call('timecard.update', cardId, { taskId });
	}

	handleTimecardCopy(cardId: string) {
		let card = this.props.cards.find(c => c._id == cardId) || this.props.repeatingCardInstances.find(c => c._id == cardId);

		if (!card) {
			showTemporaryErrorMessage(i18n.__('Timesheet copy failed: original object unavailable'));
			return;
		}

		card = Object.assign({}, card);
		delete card._id;
		card.year = this.props.year;
		card.month = this.props.month;
		card.day = this.props.day;
		card.repeating = false;

		Meteor.call('timecard.new', card, this.props.viewedUserId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Timesheet copy failed (unknown reason).'));
				return;
			}
		});
	}

	// day scroll
	handleDayScroll(dX: number, dY: number, newX: number, newY: number, startX: number, startY: number, rect: ClientRect) {
		if (!this.props.onDayScroll) { return; }

		// todo: horizontal mode
		let newDayStart = this.props.dayStart;
		let newDayEnd = this.props.dayEnd;

		let hourPerPx = (this.props.dayEnd - this.props.dayStart) / rect.height;
		newDayStart -= hourPerPx * dY;
		newDayEnd -= hourPerPx * dY;

		this.props.onDayScroll(newDayStart, newDayEnd);
	}

	// day click
	handleDayClick() {
		if (!this.props.onDayClick) { return; }
		this.props.onDayClick(this.props.year, this.props.month, this.props.day);
	}


	// EXPENSE HANDLERS

	handleExpenseDelete(expenseId: string) {
		Meteor.call('expense.delete', expenseId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Expense deletion failed (unknown reason).'));
				return;
			}
		});
	}
	handleExpenseSubmit(expenseId: string) {
		Meteor.call('expense.submit', expenseId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Expense submit failed (unknown reason).'));
				return;
			}
		});
	}
	handleExpenseApprove(expenseId: string) {
		Meteor.call('expense.approve', expenseId, (err, res) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Expense approval failed (unknown reason).'));
				return;
			}
		});
	}
	toggleExpenseEditModal(expenseId?: string) {
		this.setState({
			currentEditedExpenseId: expenseId
		});
	}
	handleExpenseNewProject(expenseId: string, projectId: string) {
		Meteor.call('expense.update', expenseId, { projectId });
	}

	closeModals() {
		this.setState({
			currentEditedExpenseId: null,
			currentEditedTimecardId: null,
		});
	}


	// RENDERING

	render() {
		return this.props.renderMinified ? this.renderMinified() : this.renderFull();
	}

	renderMinified() {
		var my_date = moment([this.props.year, this.props.month, this.props.day]);
		var is_today = moment().isSame(my_date, 'day');
		var is_weekend = my_date.day() == 0 || my_date.day() == 6;

		var classes = classnames("day-span-container", {"today": is_today, "weekend": is_weekend, "clickable": this.props.onDayClick != null});

		let minHours = 8;	// TODO: set this as parameter
		let cardsTop = [];
		let cardsBottom = [];
		let timecards = this.getTimecardsForUser().sort(Tools.getSortFunctionByProp('start'));

		// compute total hours
		let total = 0;
		timecards.forEach(card => total += card.end - card.start);
		total = Math.max(minHours, total);

		// split cards in top/bottom
		let topTotal = 0;
		let bottomTotal = 0;
		timecards.forEach(card => {
			let color = this.state.projectColors[card.projectId];
			let duration = card.end - card.start;

			if (topTotal >= total / 2) {
				cardsBottom.push({ color, width: (duration) / total });
			} else {

				// split card between top & bottom
				if (topTotal + duration > total / 2) {
					let durationBottom = duration - (total / 2 - topTotal);
					duration = total / 2 - topTotal;
					bottomTotal += durationBottom;
					cardsBottom.push({ color, width: 2 * durationBottom / total });
				}
				topTotal += duration;

				cardsTop.push({ color, width: 2 * (duration) / total });
			}
		});

		return (
			<div className={classes} onClick={this.handleDayClick} onMouseDown={Tools.PropagationPreventor}>
				<div className="header flex-no-shrink">
					<div className="day-number">
						{ my_date.format("D") }
					</div>
					<div className="weekday">
						{ my_date.format("ddd") }
					</div>
				</div>

				{
					this.props.subReady && this.props.dataType == 'timecard' && 
					<div className="cards-preview flex-col height-100 padding-xl">

						<div className="flex-row flex-grow">
						{
							cardsTop.map((card, index) => {
								return <div className="card" key={'top'+index} style={{ backgroundColor: card.color, width: `${card.width * 100}%`}}>
								</div>
							})
						}
						</div>
						<div className="flex-row flex-grow">
						{
							cardsBottom.map((card, index) => {
								return <div className="card" key={'bottom'+index} style={{ backgroundColor: card.color, width: `${card.width * 100}%`}}>
								</div>
							})
						}
						</div>

					</div>
				}
			</div>
		);
	}

	renderFull() {
		let my_date = moment([this.props.year, this.props.month, this.props.day]);
		let is_today = moment().isSame(my_date, 'day');
		let is_weekend = my_date.day() == 0 || my_date.day() == 6;

		// grid lines (only if details shown)
		let gridlines = [];
		if (this.props.renderDetails && this.props.dataType == 'timecard') {
			let firstHour = Math.floor(this.props.dayStart);
			for(let i = firstHour; i < this.props.dayEnd; i += 1) {
				let ratio = (i - this.props.dayStart) / (this.props.dayEnd - this.props.dayStart);
				gridlines.push({
					ratio,
					label: DateTools.convertTimeNumberToString(i),
					main: (i == Math.floor(i)),
					last: this.props.dayEnd - i < 1
				});
			}
		}

		// add present time (if already grid lines displayed)
		if (is_today && gridlines.length) {
			let currentTime = moment().hour() + moment().minute() / 60;
			gridlines.push({
				ratio: (currentTime - this.props.dayStart) / (this.props.dayEnd - this.props.dayStart),
				label: i18n.__('now').toUpperCase(),
				isNow: true,
				main: true,
			});
		}

		// expense types
		let expenseTypes = this.props.expenseTypes.map(t => {
			return {
				label: Tools.capitalize(t.name),
				value: t._id,
			}
		});

		// hours total
		let hoursTotal = 0;
		this.getTimecardsForUser().forEach(card => hoursTotal += (card.end - card.start));

		let classes = classnames("day-span-container", {"today": is_today, "weekend": is_weekend});

		return (
			<div className={classes} onMouseDown={(ev) => ev.stopPropagation() }>

				<div className="header">
					<div className="day-number">
						{ my_date.format("D-MMM").toLowerCase() }
					</div>
					<div className="weekday">
						{ my_date.format("dddd") }
					</div>
				</div>

				<div className="body flex-row">

					{ !this.props.subReady && <Spinner className="cards-container" hideLabel={true} /> }

					{
						this.props.subReady && this.props.dataType == 'timecard' && 
						<DraggableFrame className="gridlines-container" cursor="ns-resize" onDrag={this.handleDayScroll}>
							{
								gridlines.map((line, index) =>
								<div
									className={'gridline '+(line.main ? 'main ' : '')+(line.isNow ? 'now ' : '')+(line.last ? 'last' : '')}
									style={{top: (line.ratio * 100).toFixed(2) + '%'}}
									key={'line'+index}
								>
									{line.main && line.label}
								</div>)
							}
						</DraggableFrame>
					}

					{
						this.props.subReady && this.props.dataType == 'timecard' && this.props.connectDropTarget(
							<div
								className="cards-container time-cards-container"
								ref={(el) => { (this as any)._container = el }}
							>
								{ this.getTimecardsForUser(true).map(card => this.renderTimeCardRepeatInstance(card._id)) }
								{ this.getTimecardsForUser().map(card => this.renderTimeCard(card._id)) }
								{
									(this.state.previewBoxVisible || this.props.isHovered) &&
									<TimeCard
										key="PREVIEW"
										cardId="PREVIEW"
										dayStart={this.props.dayStart}
										dayEnd={this.props.dayEnd}
										note={""}
										start={this.state.previewBoxStart}
										end={this.state.previewBoxEnd}
										placeholder={true}
										placeholderMinDuration={this.state.previewBoxMinDuration}
										placeholderMaxDuration={this.state.previewBoxMaxDuration}
									/>
								}
							</div>
						)
					}

					{
						this.props.subReady && this.props.dataType == 'expense' && this.props.connectDropTarget(
							<div
								className="cards-container expense-cards-container width-100"
								ref={(el) => { (this as any)._container = el }}
							>
								{ this.getExpensesForUser().map(expense => this.renderExpenseCard(expense._id)) }
								{
									(this.state.previewBoxVisible || this.props.isHovered) &&
									<ExpenseCard
										key="PREVIEW"
										expenseId="PREVIEW"
										note={""}
										placeholder={true}
									/>
								}
							</div>
						)
					}

				</div>

				{
					hoursTotal > 0 &&
					<div className="hours-total">
						<span>{ hoursTotal }</span> <span className="secondary">{ i18n.__('hours entered') }</span>
					</div>
				}

				{
					(this.state.currentEditedTimecardId != null) &&
					<TimecardEditModal timecard={
						this.props.cards.find(c => c._id == this.state.currentEditedTimecardId) ||
						this.props.repeatingCardInstances.find(c => c._id == this.state.currentEditedTimecardId)
					} onClose={this.closeModals}
					/>
				}

				{
					(this.state.currentEditedExpenseId != null) &&
					<ExpenseEditModal expense={
						this.props.expenses.find(c => c._id == this.state.currentEditedExpenseId)
					} expenseTypes={expenseTypes} onClose={this.closeModals}
					/>
				}

			</div>
		);
	}

	renderTimeCardRepeatInstance(cardId: string) {
		let card = this.props.repeatingCardInstances.find(card => card._id == cardId) || {} as Timecard;
		let task = this.props.tasks.find(task => task._id == card.taskId) || {} as Task;

		let actions = this.state.allowedTimecardActions[cardId];

		return (
			<TimeCard
				key={'INSTANCE'+card._id}
				cardId={card._id}
				dayStart={this.props.dayStart}
				dayEnd={this.props.dayEnd}
				taskName={task.name}
				partnerName={task.partnerName}
				projectName={task.projectName}
				projectId={task.projectId}
				note={card.note}
				start={card.start}
				end={card.end}
				status={UserEntryStatus.TEMPORARY}
				isRepeatInstance={true}
				canApprove={false}
				canEdit={actions && actions.canEdit}
				canSubmit={false}
				canDelete={actions && actions.canDelete}
				onDelete={this.handleTimecardDelete}
				onInstanceConfirm={this.handleTimecardCopy}
				onEdit={this.toggleTimecardEditModal}
				repeating={card.repeating}
				repeatingDays={card.repeatOn}
			/>
		);
	}

	renderTimeCard(cardId: string, minified?: boolean) {
		let card = this.props.cards.find(card => card._id == cardId) || {} as Timecard;
		let task = this.props.tasks.find(task => task._id == card.taskId) || {} as Task;
		let cardEnd = moment([card.year, card.month, card.day, card.end, (card.end - Math.floor(card.end)) * 60]);

		let actions = this.state.allowedTimecardActions[cardId];
		let renderSync = true;

		return (
			<TimeCard
				key={card._id}
				cardId={card._id}
				onResize={(cardId, start, end) => this.handleTimecardResize(cardId, start, end, false)}
				onResizePreview={(cardId, start, end) => this.handleTimecardResize(cardId, start, end, true)}
				onResizePreviewEnd={this.hidePreviewBox}
				dayStart={this.props.dayStart}
				dayEnd={this.props.dayEnd}
				taskName={task.name}
				partnerName={task.partnerName}
				projectName={task.projectName}
				projectId={task.projectId}
				note={card.note}
				cardColor={this.state.projectColors[task.projectId]}
				start={card.start}
				end={card.end}
				status={card.status}
				isFuture={!cardEnd.isBefore()}
				canApprove={actions && actions.canApprove}
				canEdit={actions && actions.canEdit}
				canSubmit={actions && actions.canSubmit}
				canDelete={actions && actions.canDelete}
				onDelete={this.handleTimecardDelete}
				onSubmit={this.handleTimecardSubmit}
				onApprove={this.handleTimecardApprove}
				onEdit={this.toggleTimecardEditModal}
				onNewTask={this.handleTimecardNewTask}
				repeating={card.repeating}
				repeatingDays={card.repeatOn}
				syncStatus={renderSync ? card.syncStatus : undefined}
				syncComments={renderSync && card.syncComments}
			/>
		);
	}

	renderExpenseCard(expenseId: string, minified?: boolean) {
		let expense = this.props.expenses.find(expense => expense._id == expenseId) || {} as Expense;
		let expenseType = this.props.expenseTypes.find(t => t._id == expense.typeId) || {} as ExpenseType;
		let expenseDate = moment([expense.year, expense.month, expense.day]);
		let isFuture = expenseDate.isAfter(moment(), 'day');
		let note = (expense.mileageKm ? `${i18n.__('Mileage')}: ${expense.mileageKm} km\n` : '') +
			(expense.invoiceNumber ? `${i18n.__('Invoice')}: ${expense.invoiceNumber}\n` : '') +
			(expense.note ? `${i18n.__('Note')}:\n${expense.note}` : '');

		let actions = this.state.allowedExpenseActions[expenseId];

		return (
			<ExpenseCard
				key={expense._id}
				expenseId={expense._id}
				expenseTypeName={expenseType.name}
				partnerName={expense.partnerName}
				projectName={expense.projectName}
				projectId={expense.projectId}
				note={note}
				status={expense.status}
				isFuture={isFuture}
				canApprove={actions && actions.canApprove}
				canEdit={actions && actions.canEdit}
				canSubmit={actions && actions.canSubmit}
				canDelete={actions && actions.canDelete}
				onDelete={this.handleExpenseDelete}
				onSubmit={this.handleExpenseSubmit}
				onApprove={this.handleExpenseApprove}
				onEdit={this.toggleExpenseEditModal}
				onNewProject={this.handleExpenseNewProject}
			/>
		);
	}

}


// drag n drop
const dropEvents = {

	hover(props, monitor, component: DaySpanContainer) {
		if (!monitor.canDrop()) {
			return;
		}

		// Obtain the dragged item
		var domNode = findDOMNode(component).querySelector('.cards-container');
		var dropRelX = (monitor.getClientOffset().x - domNode.getBoundingClientRect().left) / domNode.getBoundingClientRect().width;
		var dropRelY = (monitor.getClientOffset().y - domNode.getBoundingClientRect().top) / domNode.getBoundingClientRect().height;

		// console.log("hoverin' yRatio=" + dropRelY);

		component.handleObjectHovering(monitor.getItemType(), monitor.getItem(), dropRelX, dropRelY);
	},

	drop(props, monitor, component: DaySpanContainer) {
		// console.log("droppin'");
		if (monitor.didDrop()) {
			return;
		}

		// Obtain the dragged item
		var domNode = findDOMNode(component).querySelector('.cards-container');
		var dropRelX = (monitor.getClientOffset().x - domNode.getBoundingClientRect().left) / domNode.getBoundingClientRect().width;
		var dropRelY = (monitor.getClientOffset().y - domNode.getBoundingClientRect().top) / domNode.getBoundingClientRect().height;

		//console.log("dropped card id="+item.id+" pos="+drop_pos);
		component.handleDrop(monitor.getItemType(), monitor.getItem(), dropRelX, dropRelY);
	},

	canDrop(props: props, monitor) {
		// cannot drop if we're not on our timetable
		//if (props.currentUserId != props.viewedUserId) { return false; }

		return true;
	},
};

function dropCollect(connect, monitor) {
	return {
		connectDropTarget: connect.dropTarget(),
		isHovered: monitor.isOver({ shallow: true }) && monitor.canDrop(),
	};
}


// METEOR REACTIVE DATA

export default createContainer((params) => {

	let query = {
		year: params.year,
		month: params.month,
		day: params.day,
		repeating: false,
	};
	let expQuery = {
		year: params.year,
		month: params.month,
		day: params.day,
	};
	let cardsSub = Meteor.subscribe('timecards.day', query);
	let expSub = Meteor.subscribe('expenses.day', expQuery);
	Meteor.subscribe('projects.list');
	Meteor.subscribe('current.employee');

	let currentSub = cardsSub;
	if (params.dataType == 'expense') { currentSub = expSub; }

	let viewedUserId = params.viewedUserId || Meteor.userId();

	// repeating cards
	let repeatingCardInstances = Timecards.find(QueryTools.getRepeatingCardInstances(params.year, params.month, params.day, viewedUserId)).fetch();

	// filter out when week does not match
	repeatingCardInstances = repeatingCardInstances.filter(card => {
		let now = moment([params.year, params.month, params.day]);
		
		// repeat with intervals between weeks
		if (card.repeatIntervalMode) {
			let startWeek = moment(card.repeatStart).startOf('week');
			let weekInterval = now.diff(startWeek, 'weeks');
			return weekInterval % card.repeatWeekInterval == 0;
		}

		// repeat on specific weeks in the month (-1 is the last week)
		else {
			let firstWeek = moment(now).startOf('month').startOf('week');
			let lastWeek = moment(now).endOf('month').startOf('week');
			let diffFromFirst = now.diff(firstWeek, 'weeks');
			let diffFromLast = -1 - Math.ceil(lastWeek.diff(now, 'weeks', true));
			return card.repeatOnWeeks.indexOf(diffFromFirst) > -1 || card.repeatOnWeeks.indexOf(diffFromLast) > -1;
		}
	});

	let currentEmployee = Employees.findOne({ userId: Meteor.userId() });
	let role = currentEmployee && EmployeeRoles.findOne(currentEmployee.roleId);
	let user = Meteor.user();
	let isAdmin = (user.profile && user.profile.isAdmin) || (role && role.isAdmin);

	return {
		cards: Timecards.find(query).fetch(),
		expenses: Expenses.find(expQuery).fetch(),
		expenseTypes: ExpenseTypes.find().fetch(),
		tasks: Tasks.find().fetch(),
		projects: Projects.find().fetch(),

		// repeating cards
		repeatingCardInstances,

		// get current user reactively
		currentUserId: Meteor.userId(),
		viewedUserId,
		currentEmployee,
		isAdmin,

		subReady: currentSub.ready(),
	};

}, DropTarget<props>(
	['time-card', 'task-card', 'expense-card', 'project-card'],
	dropEvents,
	dropCollect
)(DaySpanContainer));

