import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import BillableStatus from './BillableStatus';
import Tooltip from './Tooltip';


interface props {
	totalTime: number,
	consumedTime: number,
	size?: number,
	billableStatus?: boolean,	// not shown if undefined
	tooltip?: string,
	showOvertime?: boolean,

	id?: string,
	className?: string,
	style?: Object,
}
interface state {
}

// TODO: put in a better place
const WORKDAY_DURATION = 8;

export default class TimeBudgetWidget extends Component<props, state> {

	renderInnerWidget() {
		let radius = this.props.size / 2;
		let angle = 2 * Math.PI * Math.min(Math.max(this.props.consumedTime / this.props.totalTime, 0), 1);
		if (!this.props.totalTime || !this.props.consumedTime) { angle = 0; }
		let outer_rad = 9.2;
		let final_x = outer_rad * Math.sin(angle);
		let final_y = -outer_rad * Math.cos(angle);
		let sweep = 0;
		if (angle > Math.PI) { sweep = 1; }
		if (this.props.consumedTime >= this.props.totalTime) { final_x = -0.0001; }
		let path = `M 0 -${outer_rad} A ${outer_rad} ${outer_rad} 0 ${sweep} 1 ${final_x} ${final_y} L 0 0 L 0 -${outer_rad}`;

		// let total_days = this.objectCardProps.totalTime / WORKDAY_DURATION;
		// if (!this.objectCardProps.totalTime) { total_days = 0; }

		// recompute for overtime
		angle = 2 * Math.PI * Math.min(Math.max(this.props.consumedTime / this.props.totalTime, 1) - 1, 1);
		if (!this.props.totalTime || !this.props.consumedTime) { angle = 0; }
		final_x = outer_rad * Math.sin(angle);
		final_y = -outer_rad * Math.cos(angle);
		sweep = 0;
		if (angle > Math.PI) { sweep = 1; }
		if (this.props.consumedTime >= this.props.totalTime * 2) { final_x = -0.0001; }
		let overtimePath = `M 0 -${outer_rad} A ${outer_rad} ${outer_rad} 0 ${sweep} 1 ${final_x} ${final_y} L 0 0 L 0 -${outer_rad}`;

		return (
			<div
				className={'time-budget-widget flex-col flex-center '+(this.props.className || '')}
				id={this.props.id}
				style={this.props.style}>
				<svg
					viewBox="-10 -10 20 20"
					width={this.props.size}
					height={this.props.size}
				>
					<circle cx="0" cy="0" r="10" fill="rgba(0, 0, 0, 0.12)"/>
					<circle cx="0" cy="0" r={outer_rad} fill="rgba(0, 0, 0, 0.12)"/>

					<path d={path} fill="#DDFF67"/>
					{
						this.props.showOvertime &&
						<path d={overtimePath} fill="rgba(255, 0, 0, 0.42)"/>
					}

					<circle cx="0" cy="0" r="6.8" fill="#0080AD"/>
					<text x="0" y="2" fill="white" textAnchor="middle" fontSize="5">
						{this.props.totalTime.toFixed && this.props.totalTime.toFixed(this.props.totalTime >= 10 ? 0 : 2) + "h"}
					</text>
				</svg>

				{
					(this.props.billableStatus !== undefined) &&
					<BillableStatus
						billable={this.props.billableStatus}
					/>
				}
			</div>
		);
	}

	render() {

		if (!this.props.tooltip) {
			return this.renderInnerWidget();
		}

		return <Tooltip text={this.props.tooltip}>
			{ this.renderInnerWidget() }
		</Tooltip>

	}

}

(TimeBudgetWidget as any).defaultProps = {
	totalTime: 0,
	consumedTime: 0,
	size: '80',
};