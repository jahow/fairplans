import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { DateTools } from '../../../utils/tools'
import DaySpanContainer from './DaySpanContainer';
import { CalendarSpanType, CalendarDataType } from '../CalendarView';
import DraggableFrame from '../../controls/DraggableFrame';


const BLOCK_WIDTH = 80;		// %


interface props {
	setTimelinePosition: (newPos: number, held?: boolean) => any,
	setSpanType: (newType: CalendarSpanType) => any,
	timelinePosition: number,
	spanType: CalendarSpanType,
	dataType: CalendarDataType,
	showWeekend?: boolean,
	showWeekAlternative?: boolean,
	currentUserId: string,
}

interface state {
	dayStart?: number,
	dayEnd?: number,
}

export default class Timetable extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			dayStart: 8,
			dayEnd: 19,
		};

		this.renderByDay = this.renderByDay.bind(this);
		this.renderByWeek = this.renderByWeek.bind(this);
		this.renderByMonth = this.renderByMonth.bind(this);
		this.renderDay = this.renderDay.bind(this);
		this.renderWeek = this.renderWeek.bind(this);
		this.renderMonth = this.renderMonth.bind(this);
		this.handleDayContainerScroll = this.handleDayContainerScroll.bind(this);
		this.handleDayContainerClick = this.handleDayContainerClick.bind(this);
		this.handleBackdropDrag = this.handleBackdropDrag.bind(this);
		this.handleBackdropDragEnd = this.handleBackdropDragEnd.bind(this);
		this.handleBackdropWheel = this.handleBackdropWheel.bind(this);
	}

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if display objectCardProps have not changed: do not rerender
		if (this.props.timelinePosition == nextProps.timelinePosition &&
			this.props.spanType == nextProps.spanType &&
			this.props.showWeekend == nextProps.showWeekend &&
			this.props.showWeekAlternative == nextProps.showWeekAlternative &&
			this.props.dataType == nextProps.dataType &&
			this.props.currentUserId == nextProps.currentUserId &&
			this.state.dayStart == nextState.dayStart &&
			this.state.dayEnd == nextState.dayEnd) {
			return false;
		}
		// console.log('gotta update');
		// console.dir(nextProps);
		// console.dir(nextState);

		return true;
	}

	// day scrolling
	handleDayContainerScroll(newDayStart: number, newDayEnd: number) {
		// first round values to 6mn (0.1)
		let start = Math.floor(newDayStart * 10) / 10;
		let end = Math.floor(newDayEnd * 10) / 10;

		let interval = end - start;
		start = Math.max(newDayStart, 0);
		end = Math.min(start + interval, 24);
		start = Math.min(start, end - interval);

		this.setState({
			dayStart: start,
			dayEnd: end,
		});
	}

	// day click
	handleDayContainerClick(year: number, month: number, day: number) {
		let newPos = DateTools.getTimeLineCoordinateFromDate(year, month, day);
		this.props.setSpanType('week');
		this.props.setTimelinePosition(newPos);
	}

	// backdrop scrolling
	handleBackdropDrag(dX: number, dY: number, newX: number, newY: number, startX: number, startY: number, rect: ClientRect) {
		let unitPerPx = 100 / rect.width / BLOCK_WIDTH;

		switch(this.props.spanType) {
			case 'day': unitPerPx *= 3; break;
			case 'week_alt':
			case 'week': unitPerPx *= 7; break;
			case 'month': unitPerPx *= 30; break;
		}

		this.props.setTimelinePosition(this.props.timelinePosition - dX * unitPerPx, true);
	}
	handleBackdropDragEnd() {
		this.props.setTimelinePosition(this.props.timelinePosition, false);
	}
	handleBackdropWheel(dY: number, rect: ClientRect) {
		let diff = dY * 0.004;
		this.handleDayContainerScroll(this.state.dayStart + diff, this.state.dayEnd + diff);
	}

	// RENDERING

	render() {
		switch(this.props.spanType) {
			case 'day': return this.renderByDay();
			case 'week': return this.renderByWeek();
			case 'week_alt': return this.renderByWeek(true);
			case 'month': return this.renderByMonth();
		}
	}

	renderByDay() {
		let selected_date = DateTools.getDateFromTimeLineCoordinates(this.props.timelinePosition);
		let selected = moment([selected_date.year, selected_date.month, selected_date.day]);

		let day_range = 2;
		let visible_days = [];
		for(let i = -day_range; i <= day_range; i++) {
			let other_date = moment(selected).add(i, 'days');
			visible_days.push({
				year: other_date.year(),
				month: other_date.month(),
				day: other_date.date(),
				isCurrent: i == 0,
				showDetails: i >= -1 && i <= 1,
			});
		}

		return (
			<DraggableFrame className="timetable" cursor="move"
				onDrag={this.handleBackdropDrag}
				onDragEnd={this.handleBackdropDragEnd}
				onWheel={this.handleBackdropWheel}
				allowBubbledEvents={true}>

				<div className="day-blocks-container">
					{/*selected.format("YYYY-MM-DD")*/}
				{
					visible_days.map((date) => {
						return this.renderDay(date.year, date.month, date.day, date.isCurrent, date.showDetails);
					})
				}
				</div>

			</DraggableFrame>
		);
	}
	renderDay(year, month, day, isCurrent?: boolean, showDetails?: boolean) {
		let coords = DateTools.getTimeLineCoordinateFromDate(year, month, day);
		let current = moment([year, month, day]);

		let blockWidth = BLOCK_WIDTH * 0.35;

		let styles = {
			left: blockWidth * (coords - this.props.timelinePosition) + '%',
			width: blockWidth + '%',
		}

		return (
			<div className="day-block" key={year+'-'+month+'-'+day} style={styles}>
				{
					isCurrent && <div className="previous" onClick={() => {
						this.props.setTimelinePosition(coords - 1)
					}}/>
				}
				{
					isCurrent && <div className="next" onClick={() => {
						this.props.setTimelinePosition(coords + 1)
					}}/>
				}
				<div className="period-label">{ current.format('LL') }</div>
				{
					this.renderDayContainer(year, month, day, false, showDetails)
				}
			</div>
		);
	}

	renderByWeek(alternativeDisplay?: boolean) {
		let selected_date = DateTools.getDateFromTimeLineCoordinates(this.props.timelinePosition);
		let selected = moment([selected_date.year, selected_date.month, selected_date.day]);

		let week_range = 1;
		let visible_weeks = [];
		for(let i = -week_range; i <= week_range; i++) {
			let other_date = moment(selected).add(i, 'weeks');
			visible_weeks.push({
				year: other_date.year(),
				weekNumber: other_date.week(),
				isCurrent: i == 0,
			});
		}

		return (
			<DraggableFrame className="timetable" cursor="move"
				onDrag={this.handleBackdropDrag}
				onDragEnd={this.handleBackdropDragEnd}
				onWheel={this.handleBackdropWheel}
				allowBubbledEvents={true}>

				<div className="week-blocks-container">
					{
						visible_weeks.map(week => {
							return this.renderWeek(week.year, week.weekNumber, week.isCurrent, alternativeDisplay);
						})
					}
				</div>

			</DraggableFrame>
		);
	}
	renderWeek(year, weekNumber, currentWeek: boolean, alternativeDisplay?: boolean) {
		let week_start = moment([year]).week(weekNumber).day(1);	// start at monday
		let day_count = 5;
		if(this.props.showWeekend) {
			day_count = 7;
			week_start.startOf('week');
		}
		let days = new Array(day_count).fill(0).map((day, index) => {
			let current_date = moment(week_start).add(index, 'days');
			return {
				year: current_date.year(),
				month: current_date.month(),
				day: current_date.date()
			};
		});

		let coords = DateTools.getWeekCoordinatesInTimeline(year, weekNumber);

		let styles = {
			left: BLOCK_WIDTH * (coords.mid - 0.5 - this.props.timelinePosition)/7 + '%',
			width: BLOCK_WIDTH + '%',
		};

		return (
			<div
				className={`week-block ${alternativeDisplay ? 'alt-display' : ''}`}
				key={year+"-w"+weekNumber}
				style={styles}
			>
				{
					currentWeek && <div className="previous" onClick={() => {
						this.props.setTimelinePosition(coords.mid - 7)
					}}/>
				}
				{
					currentWeek && <div className="next" onClick={() => {
						this.props.setTimelinePosition(coords.mid +7)
					}}/>
				}
				<div className="period-label">{ i18n.__('week ') + week_start.format('W, YYYY') }</div>
				{
					days.map(date => 
						{ return this.renderDayContainer(date.year, date.month, date.day, false, currentWeek, alternativeDisplay) }
					)
				}
			</div>
		);
	}

	renderByMonth() {
		let selected_date = DateTools.getDateFromTimeLineCoordinates(this.props.timelinePosition);
		let selected = moment([selected_date.year, selected_date.month, selected_date.day]);

		let month_range = 1;
		let visible_months = [];
		for(let i = -month_range; i <= month_range; i++) {
			let other_date = moment(selected).add(i, 'months');
			visible_months.push({
				year: other_date.year(),
				month: other_date.month(),
				isCurrent: i == 0,
			});
		}

		return (
			<DraggableFrame className="timetable" cursor="move"
				onDrag={this.handleBackdropDrag}
				onDragEnd={this.handleBackdropDragEnd}
				allowBubbledEvents={true}>

				<div className="month-blocks-container">
					{
						visible_months.map(month => {
							return this.renderMonth(month.year, month.month, month.isCurrent);
						})
					}
				</div>

			</DraggableFrame>
		);
	}
	renderMonth(year, month, isCurrent?: boolean) {
		let month_start = moment([year, month]).startOf('month');
		let week_start = moment(month_start).startOf('week');		// this is the start of the first week, so possibly sibling
		let last_week_end = moment(month_start).endOf('month').endOf('week');
		let day_count = Math.ceil(last_week_end.diff(week_start, 'hours')/24);
		let days = new Array(day_count).fill(0).map((day, index) => {
			let current_date = moment(week_start).add(index, 'days');
			return {
				year: current_date.year(),
				month: current_date.month(),
				day: current_date.date(),
				sibling: (current_date.month() != month)
			};
		});

		let coords = DateTools.getMonthCoordinatesInTimeline(year, month);

		let styles = {
			left: BLOCK_WIDTH * (coords.mid - this.props.timelinePosition)/30 + '%',
			width: BLOCK_WIDTH + '%',
		};

		return (
			<div className="month-block" key={year+"-m"+month} style={styles}>
				{
					isCurrent && <div className="previous" onClick={() => {
						this.props.setTimelinePosition(coords.mid - 30)
					}}/>
				}
				{
					isCurrent && <div className="next" onClick={() => {
						this.props.setTimelinePosition(coords.mid + 30)
					}}/>
				}
				<div className="period-label">{ month_start.format('MMMM YYYY') }</div>
				{
					days.map(date => {
						if(date.sibling) {
							return <div className="padding" key={'S'+date.year+'-'+date.month+'-'+date.day}></div>
						}
						return this.renderDayContainer(date.year, date.month, date.day, true)
					})
				}
			</div>
		);
	}

	renderDayContainer(year: number, month: number, day: number, minified: boolean, showDetails?: boolean, displayHorizontal?: boolean) {

		return <DaySpanContainer
			key={year+'-'+month+'-'+day}
			//mobileView={this.objectCardProps.mobileView}
			dataType={this.props.dataType}
			year={year}
			month={month}
			day={day}
			dayStart={this.state.dayStart}
			dayEnd={this.state.dayEnd}
			renderMinified={minified}
			renderDetails={showDetails}
			renderHorizontal={displayHorizontal}
			viewedUserId={this.props.currentUserId}
			onDayScroll={minified ? null : this.handleDayContainerScroll}
			onDayClick={minified ? this.handleDayContainerClick : null}
		/>
	}
}
