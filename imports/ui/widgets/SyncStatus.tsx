import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import * as classnames from 'classnames';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import Tooltip from './Tooltip';
import { SynchronizationStatus } from  '../../data/collections';


interface props {
	status: SynchronizationStatus,
	tooltip?: string,
	size?: number,

	id?: string,
	className?: string,
	style?: Object,
}
interface state {
}

export default class SyncStatus extends Component<props, state> {
	renderInnerShape() {
		return (
			<svg
				viewBox="0 0 10 10"
				width={this.props.size}
				height={this.props.size}
			>
				<defs>
					<path d="M1.3 -0.7 A0.8 0.8 0 0 1 2.1 -1.5 H5.7 L7.5 0 L6 1.5 H1.3 z" id="arrow" />
				</defs>

				<rect x="0" y="0" rx="1" ry="1" width="10" height="10" />

				<use xlinkHref="#arrow" className="arrow arrow2" transform="translate(0 2.8)" />
				<use xlinkHref="#arrow" className="arrow arrow1" transform="translate(10 7.2) rotate(180)" />

			</svg>
		);
	}

	render() {
		let style = Object.assign(this.props.style || {}, {
			height: this.props.size,
			width: this.props.size,
		});

		let className = classnames('sync-status', this.props.className, {
			synced: this.props.status == SynchronizationStatus.SYNCED,
			awaiting: this.props.status == SynchronizationStatus.AWAITING_SYNC,
			error: this.props.status == SynchronizationStatus.SYNC_ERROR,
			inprogress: this.props.status == SynchronizationStatus.SYNC_IN_PROGRESS,
			notrelevant: this.props.status == SynchronizationStatus.NOT_RELEVANT,
			// hoverable: this.props.tooltip != null,
			hoverable: true
		});

		let statusLabel = ''
		switch (this.props.status) {
			case SynchronizationStatus.NOT_RELEVANT: statusLabel = i18n.__('Not relevant'); break;
			case SynchronizationStatus.AWAITING_SYNC: statusLabel = i18n.__('Not synchronized'); break;
			case SynchronizationStatus.SYNCED: statusLabel = i18n.__('Synchronized'); break;
			case SynchronizationStatus.SYNC_ERROR: statusLabel = i18n.__('Error during synchronization'); break;
			case SynchronizationStatus.SYNC_IN_PROGRESS: statusLabel = i18n.__('Synchronizing...'); break;
			default: statusLabel = i18n.__('unknown'); break;
		}

		let tooltip = this.props.tooltip ?
		`{{${statusLabel}}}\n${this.props.tooltip}` : `{{${statusLabel}}}`; 

		return (
			<Tooltip
				text={tooltip}
				containerId={this.props.id}
				containerClassName={className}
				containerStyle={style}
			>
				{ this.renderInnerShape() }
			</Tooltip>
		);

		/*
		return (
			<div
				id={this.props.id}
				className={className}
				style={style}
			>
				{ this.renderInnerShape() }
			</div>
		);
		*/
	}

}

(SyncStatus as any).defaultProps = {
	size: 24,
	className: '',
};