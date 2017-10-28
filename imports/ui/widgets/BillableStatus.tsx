import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';


interface props {
	billable: boolean,

	id?: string,
	className?: string,
	style?: Object,
}
interface state {
}

// TODO: put in a better place
const WORKDAY_DURATION = 8;

export default class BillableStatus extends Component<props, state> {
	render() {
		return (
			<div
				id={this.props.id}
				className={'billable-status no-wrap '+(this.props.billable ? 'ok ' : '')+(this.props.className)}
			>
				{ this.props.billable ? '✔' : '✘' }
			</div>
		);
	}

}