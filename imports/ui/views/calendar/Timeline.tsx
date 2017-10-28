import * as React from 'react';
import { Component } from 'react';
import * as moment from 'moment';

import { DateTools } from '../../../utils/tools'
import TimelineMonthContainer from './TimelineMonthContainer';
import { CalendarSpanType, CalendarDataType } from '../CalendarView';


const DAY_WIDTH = 16;	// pixels

interface props {
	setTimelinePosition: (newPos: number, positionHeld?: boolean) => any,
	releaseTimelinePosition: () => any,
	currentTimelinePosition: number,
	targetTimelinePosition: number,
	spanType: CalendarSpanType,
	dataType: CalendarDataType,
	currentUserId: string,
}

interface state {
	// selector manipulation
	selectorHeld?: boolean,
	selectorRefPosX?: number,	// this is a screen coord
}

export default class Timeline extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
		};

		// methods binding
		this.handleSelectorMouseDown = this.handleSelectorMouseDown.bind(this);
		this.handleSelectorMouseMove = this.handleSelectorMouseMove.bind(this);
		this.handleSelectorMouseUp = this.handleSelectorMouseUp.bind(this);
		this.handleDayClick = this.handleDayClick.bind(this);
	}

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if display objectCardProps have not changed: do not rerender
		if (this.props.currentTimelinePosition == nextProps.currentTimelinePosition &&
			this.props.targetTimelinePosition == nextProps.targetTimelinePosition &&
			this.props.spanType == nextProps.spanType &&
			this.props.dataType == nextProps.dataType &&
			this.props.currentUserId == nextProps.currentUserId) {
			return false;
		}
		// console.log('gotta update');
		// console.dir(nextProps);
		// console.dir(nextState);

		return true;
	}

	componentWillMount() {
	}

	componentWillUpdate() {
	}


	// PERIOD SELECTOR HANDLERS

	handleSelectorMouseDown(event) {
		this.setState({
			selectorHeld: true,
			selectorRefPosX: event.clientX,
		});

		window.addEventListener("mousemove", this.handleSelectorMouseMove);
		window.addEventListener("mouseup", this.handleSelectorMouseUp);
	}
	handleSelectorMouseMove(event) {
		if(!this.state.selectorHeld) { return; }

		let diffX = event.clientX - this.state.selectorRefPosX;
		var newSelectorPos = this.props.targetTimelinePosition + diffX / DAY_WIDTH;

		this.setState({
			selectorRefPosX: event.clientX
		});

		event.preventDefault();
		event.stopPropagation();

		// send selector position to parent
		this.props.setTimelinePosition(newSelectorPos, true);
	}
	handleSelectorMouseUp(event) {
		this.setState({
			selectorHeld: false,
			selectorRefPosX: null,
		});

		window.removeEventListener("mousemove", this.handleSelectorMouseMove);
		window.removeEventListener("mouseup", this.handleSelectorMouseUp);

		// register new selection date
		this.props.releaseTimelinePosition();
	}

	handleDayClick(year, month, day) {
		let newPos = DateTools.getTimeLineCoordinateFromDate(year, month, day);
		this.props.setTimelinePosition(newPos);
	}


	// RENDERING

	render() {

		let current_date = DateTools.getDateFromTimeLineCoordinates(this.props.currentTimelinePosition);
		let visible_months = [];
		let month_range = 2;	// -3 to +3

		for(let i = -month_range; i <= month_range; i++) {
			let other_month = moment([
				current_date.year,
				current_date.month,
				1
			]).add(i, 'months');
			visible_months.push({
				year: other_month.year(),
				month: other_month.month()
			});
		}


		// SELECTOR STYLING & POSITION

		// in days
		let spanSize = 1;
		switch (this.props.spanType) {
			case 'day': spanSize = 1; break;
			case 'week': spanSize = 7; break;
			case 'month': spanSize = 30; break;
			default: spanSize = this.props.spanType as number;
		};

		let selectorWidth = spanSize * DAY_WIDTH;
		let shiftX = (this.props.targetTimelinePosition - this.props.currentTimelinePosition) * DAY_WIDTH;

		let selectorStyle = {
			width: selectorWidth,
			transform: 'translateX(' + (shiftX - selectorWidth/2) + 'px)'
		};

		// list of clickable periods
		let clickablePeriods = [];
		return (
			<div className="timeline">

				<div className="month-blocks-container">
				{
					visible_months.map((month) => 
						<TimelineMonthContainer
							key={month.month+'-'+month.year}
							dataType={this.props.dataType}
							//mobileView={this.objectCardProps.mobileView}
							year={month.year}
							month={month.month}
							dayWidth={DAY_WIDTH}
							spanType={this.props.spanType}
							shiftX={Math.floor(-this.props.currentTimelinePosition * DAY_WIDTH)}
							onDayClick={this.handleDayClick}
							currentUserId={this.props.currentUserId}
						/>
					)
				}
				</div>


				<div
					style={selectorStyle}
					className="period-selector"
					onMouseDown={this.handleSelectorMouseDown}
				>
				</div>

			</div>
		);
	}
}