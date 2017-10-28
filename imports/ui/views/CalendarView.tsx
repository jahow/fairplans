import * as React from 'react';
import { Component } from 'react';
import * as classnames from 'classnames';
import { Tools, DateTools } from '../../utils/tools';
import ReactModal2 from 'react-modal2';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import Timeline from './calendar/Timeline';
import TaskCatalog from './calendar/TaskCatalog';
import Timetable from './calendar/Timetable';
import ProjectsOverview from './calendar/ProjectsOverview';
import * as Toolbar from '../subviews/Toolbar';

import { Employee } from '../../data/collections';
import { EmployeeList } from '../subviews/EmployeeManagementLists';


export type CalendarDataType = 'timecard' | 'expense' | 'leave' | 'projects-overview';
export type CalendarSpanType = 'day' | 'week' | 'week_alt' | 'month' | number;


interface props {
	projectsOverviewMode?: boolean,
}

interface state {
	spanType?: CalendarSpanType,
	showWeekEnd?: boolean,
	showAltWeek?: boolean,		// alternative display for week (horizontal)
	dataType?: CalendarDataType,
	showTaskCatalog?: boolean,

	currentUserId?: string,		// if empty, will default to current user
	currentEmployeeName?: string,
	showUserSelectModal?: boolean,

	// timeline position
	timelinePositionTarget?: number,	// relative to present day
	timelinePositionCurrent?: number,	// interpolation
	timelinePositionMoved?: boolean,	// true if something changed and need to be interpolated
	timelinePositionHeld?: boolean,		// if true, no animation is done (mouse button is down)
}

export default class CalendarView extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
			spanType: props.projectsOverviewMode ? 14 : 'week',
			dataType: props.projectsOverviewMode ? 'projects-overview' : 'timecard',
			timelinePositionTarget: 0,
			timelinePositionCurrent: 0,
			timelinePositionMoved: true,
		};

		this.setSpanType = this.setSpanType.bind(this);
		this.setDataType = this.setDataType.bind(this);
		this.setTimelinePosition = this.setTimelinePosition.bind(this);
		this.releaseTimelinePosition = this.releaseTimelinePosition.bind(this);
		this.animate = this.animate.bind(this);
		this.toggleTaskCatalog = this.toggleTaskCatalog.bind(this);
		this.toggleUserSelectModal = this.toggleUserSelectModal.bind(this);
		this.handleEmployeeSelection = this.handleEmployeeSelection.bind(this);

		this.handleClickModeDay = this.handleClickModeDay.bind(this);
		this.handleClickModeWeek = this.handleClickModeWeek.bind(this);
		this.handleClickModeWeekends = this.handleClickModeWeekends.bind(this);
		this.handleClickModeMonth = this.handleClickModeMonth.bind(this);
		this.handleClickModeProjects = this.handleClickModeProjects.bind(this);
		this.handleClickEntriesTimecards = this.handleClickEntriesTimecards.bind(this);
		this.handleClickEntriesExpenses = this.handleClickEntriesExpenses.bind(this);

		// start anim loop for timeline interpolation
		this._previousAnimStepTime = null;
		requestAnimationFrame(this.animate);
	}

	_previousAnimStepTime: number;

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if timeline position has not changed: do not rerender
		if (nextState.timelinePositionTarget == this.state.timelinePositionTarget &&
			nextState.timelinePositionCurrent == this.state.timelinePositionCurrent &&
			nextState.spanType == this.state.spanType &&
			nextState.dataType == this.state.dataType &&
			nextState.showWeekEnd == this.state.showWeekEnd &&
			nextState.showAltWeek == this.state.showAltWeek &&
			nextState.showTaskCatalog == this.state.showTaskCatalog &&
			nextState.currentUserId == this.state.currentUserId &&
			nextState.showUserSelectModal == this.state.showUserSelectModal) {
			return false;
		}

		return true;
	}

	// TIMELINE ANIMATION

	// this is looping forever
	animate(timestamp) {
		// anim start
		if (!this._previousAnimStepTime) {
			this._previousAnimStepTime = timestamp;
		}

		var deltaTime = (timestamp - this._previousAnimStepTime) * 0.001;	// secs
		this._previousAnimStepTime = timestamp;

		// skip if nothing has changed
		if(!this.state.timelinePositionMoved) {
			requestAnimationFrame(this.animate);
			return;
		}

		//console.log("animating timeline...");
		// this is computing the interpolated value; delta is in seconds

		// will be true if animation is required
		var active = false;

		// position target animation: snap to points
		var targetPos = this.state.timelinePositionTarget;
		var nearestSnapPos = DateTools.getNearestSnapPoint(targetPos, this.state.spanType);
		var posDiff = nearestSnapPos - targetPos;

		if (posDiff) { active = true; }

		// only animate target pos if not held
		if (!this.state.timelinePositionHeld) {
			targetPos += posDiff * Math.min(deltaTime * 8, 0.5);
			if (Math.abs(posDiff) < 0.05) {
				targetPos = nearestSnapPos;
			}
		}

		// current position animation: interpolate to target pos
		var currentPos = this.state.timelinePositionCurrent;
		posDiff = targetPos - currentPos;

		if (posDiff) { active = true; }
		
		// if held: animate current pos very slowly and keep shifting the target
		if (this.state.timelinePositionHeld) {
			posDiff = posDiff * posDiff * posDiff * 0.00004;
			targetPos += posDiff * Math.min(deltaTime * 4, 0.5);
		}

		currentPos += posDiff * Math.min(deltaTime * 4, 0.5);
		if (Math.abs(targetPos - currentPos) < 0.05) {
			currentPos = targetPos;
		}

		// no change and not held: animation not required; request next anim frame
		if (!active && !this.state.timelinePositionHeld) {
			this.setState({
				timelinePositionMoved: false
			}, () => {
				requestAnimationFrame(this.animate);
			});
			return;
		}

		// state update and request anim frame
		this.setState({
			timelinePositionTarget: targetPos,
			timelinePositionCurrent: currentPos,
		}, () => {
			requestAnimationFrame(this.animate);
		});
	}


	// SELECTOR HANDLERS

	setSpanType(spanType: CalendarSpanType, showWeekEnd?, showAltWeek?) {
		let validSpanType = spanType;
		if (typeof spanType == 'number' && (spanType as number) < 1) { validSpanType = 1; }

		this.setState({
			spanType: validSpanType,
			showWeekEnd: showWeekEnd !== undefined ? showWeekEnd : this.state.showWeekEnd,
			showAltWeek: showAltWeek !== undefined ? showAltWeek : this.state.showAltWeek,
			timelinePositionMoved: true,
		});
	}
	setDataType(dataType: CalendarDataType) {
		this.setState({
			dataType
		});
	}

	// this coord is in time units (days) with the present day as a reference
	setTimelinePosition(timelinePosition: number, positionHeld?: boolean) {
		// console.log('new target pos: '+timelinePosition)
		this.setState({
			timelinePositionTarget: timelinePosition,
			timelinePositionMoved: true,
			timelinePositionHeld: positionHeld,
		});
	}
	releaseTimelinePosition() {
		this.setState({
			timelinePositionMoved: true,
			timelinePositionHeld: false,
		});
	}


	// view options

	toggleTaskCatalog() {
		this.setState({
			showTaskCatalog: !this.state.showTaskCatalog,
		});
	}
	toggleUserSelectModal() {
		this.setState({
			showUserSelectModal: !this.state.showUserSelectModal,
		});
	}

	// employee selection
	handleEmployeeSelection(employee: Employee) {
		this.setState({
			currentUserId: employee ? employee.userId : null,
			currentEmployeeName: employee ? `${employee.lastName} ${employee.firstName}` : null,
		});
		this.toggleUserSelectModal();
	}


	// toolbar handlers
	handleClickModeDay() { this.setSpanType('day'); }
	handleClickModeWeek() { this.setSpanType('week'); }
	handleClickModeWeekends() { this.setSpanType('week', !this.state.showWeekEnd); }
	handleClickModeMonth() { this.setSpanType('month'); this.setDataType('timecard'); }
	handleClickModeProjects() { this.setDataType('projects-overview'); this.setSpanType(14); }
	handleClickEntriesTimecards() { this.setDataType('timecard'); }
	handleClickEntriesExpenses() { this.setDataType('expense'); }


	// RENDERING

	render() {
		return (
			<div className="calendar-view">

				{
					this.state.dataType != 'projects-overview' &&
					<div className="main-view flex-row">
						<Timetable
							setTimelinePosition={this.setTimelinePosition}
							setSpanType={this.setSpanType}
							timelinePosition={this.state.timelinePositionTarget}
							spanType={this.state.spanType}
							dataType={this.state.dataType}
							showWeekend={this.state.showWeekEnd}
							showWeekAlternative={this.state.showAltWeek}
							currentUserId={this.state.currentUserId}
						/>
						<TaskCatalog
							opened={this.state.showTaskCatalog}
							onClose={this.toggleTaskCatalog}
							onOpen={this.toggleTaskCatalog}
							showProjectsOnly={this.state.dataType == 'expense'}
							currentUserId={this.state.currentUserId}
						/>
					</div>
				}

				{
					this.state.dataType == 'projects-overview' &&
					<div className="main-view flex-row">
						<ProjectsOverview
							setTimelinePosition={this.setTimelinePosition}
							setSpanType={this.setSpanType}
							timelinePosition={this.state.timelinePositionTarget}
							spanType={this.state.spanType}
						/>
					</div>
				}

				<Timeline
					setTimelinePosition={this.setTimelinePosition}
					releaseTimelinePosition={this.releaseTimelinePosition}
					currentTimelinePosition={this.state.timelinePositionCurrent}
					targetTimelinePosition={this.state.timelinePositionTarget}
					spanType={this.state.spanType}
					dataType={this.state.dataType}
					currentUserId={this.state.currentUserId}
				/>

				{
					this.state.dataType != 'projects-overview' &&
					<Toolbar.default>

						<Toolbar.SubMenu label={i18n.__('view mode')}>
							<Toolbar.Button
								label="day"
								onClick={ this.handleClickModeDay }
								active={ this.state.spanType == 'day' }
							/>
							<div className="spacer-row small"/>
							<div className="flex-row flex-center">
								<Toolbar.Button
									label="week"
									onClick={ this.handleClickModeWeek }
									active={ this.state.spanType == 'week' }
								/>
								<div className="spacer-col small"/>
								<Toolbar.SmallButton
									label="weekends"
									onClick={ this.handleClickModeWeekends }
									active={ this.state.showWeekEnd }
									disabled={ this.state.spanType != 'week' }
								/>
							</div>
							<div className="spacer-row small"/>
							<Toolbar.Button
								label="month"
								onClick={ this.handleClickModeMonth }
								active={ this.state.spanType == 'month' }
							/>
							{
								/*
								<div className="spacer-row small"/>
								<Toolbar.Button
									label="projects overview"
									onClick={ this.handleClickModeProjects }
									active={ this.state.dataType == 'projects-overview' }
								/>
								*/
							}
						</Toolbar.SubMenu>

						<Toolbar.Separator />

						<Toolbar.SubMenu label={i18n.__('type of entries')}>
							<Toolbar.Button
								label="timesheets"
								onClick={ this.handleClickEntriesTimecards }
								active={ this.state.dataType == 'timecard' }
							/>
							<div className="spacer-row small"/>
							<Toolbar.Button
								label="expenses"
								onClick={ this.handleClickEntriesExpenses }
								active={ this.state.dataType == 'expense' }
							/>
						</Toolbar.SubMenu>

						<Toolbar.Separator />

						<Toolbar.Button
							label="change active employee"
							subtitle={ i18n.__('current') + ': ' + (this.state.currentEmployeeName || i18n.__('me')) }
							onClick={this.toggleUserSelectModal}
						/>
						<div className="spacer-col flex-no-shrink"/>

					</Toolbar.default>
				}
				
				{
					this.state.dataType == 'projects-overview' &&
					<Toolbar.default/>
				}

				{
					this.state.showUserSelectModal &&
					<ReactModal2
						onClose={this.toggleUserSelectModal}
						closeOnEsc={true}
						closeOnBackdropClick={true}
						backdropClassName='overlay-pane-background'
						modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col section width-50'
					>
						<div className="title">{ i18n.__('Choose current employee') }</div>

						<EmployeeList
							onClick={this.handleEmployeeSelection}
							isSelected={(e: Employee) => e.userId == (this.state.currentUserId || Meteor.userId())}
						/>

						<div className="button-bar flex-no-shrink">
							<div className={'button action-dostuff'}
								onClick={this.toggleUserSelectModal}>
								{ i18n.__('CLOSE') }
							</div>
							<div className="separator" />
							<div className={'button action-cancel'}
								onClick={() => this.handleEmployeeSelection(null)}>
								{ i18n.__('CLEAR CURRENT EMPLOYEE') }
							</div>
						</div>
					</ReactModal2>
				}

			</div>
		);
	}
}