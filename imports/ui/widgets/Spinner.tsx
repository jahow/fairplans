import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import BillableStatus from './BillableStatus';


interface props {
	size?: number,
	hideLabel?: boolean,

	id?: string,
	className?: string,
	style?: Object,
}
interface state {
}

export default class Spinner extends Component<props, state> {

	render() {

		return (
			<div
				className={'spinner-widget flex-col flex-center ' + (this.props.className || '')}
				id={this.props.id}
				style={this.props.style}>

				<svg viewBox="0 0 80 80" width={this.props.size} height={this.props.size}>
					<path
						fill="white" fillOpacity="0.5"
						d={'M40,72C22.4,72,8,57.6,8,40C8,22.4,22.4,8,40,8c17.6,0,32,14.4,32,32c0,1.1-0.9,2-2,2s-2-0.9-2-2c0-15.4-12.6-28-28-28S12,24.6,12,40s12.6,28,28,28c1.1,0,2,0.9,2,2S41.1,72,40,72z'}
						transform="rotate(270 40 40)">
						<animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="0.6s" repeatCount="indefinite" />
					</path>
				</svg>
				
				{ !this.props.hideLabel && <span className="no-select secondary">{i18n.__('Loading...')}</span> }

			</div>
		);
	}

}

(Spinner as any).defaultProps = {
	size: 60
};