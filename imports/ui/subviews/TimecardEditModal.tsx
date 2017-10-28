import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactModal2 from 'react-modal2';
import { Gateway } from 'react-gateway';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import InputFormManager, { PropertyInfo  } from '../subviews/InputFormManager';
import { Timecards, Timecard, UserEntryStatus } from '../../data/collections';


interface props {
	timecard: Timecard,
	onClose: () => any,
	readOnly?: boolean,
}

interface state {
}

export default class TimecardEditModal extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {};

		this.handleSave = this.handleSave.bind(this);
	}

	handleSave(id: string, values: Object) {
		Meteor.call('timecard.update', id, values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Timesheet update failed (unknown reason).'));
				//console.dir(values);
				return;
			}
			showInformationMessage(i18n.__('Timesheet has been successfully updated.'));
		});
		this.props.onClose();
	}

	render() {
		// input form params
		let formPropInfo: PropertyInfo[] = [
			{
				propName: 'date',
				label: i18n.__('Date'),
				inputType: 'date',
				inputSize: 'x-small',
				hidden: (values) => values.repeating,
			},
			{
				propName: 'start',
				label: i18n.__('Start Time'),
				editable: true,
				inputType: 'time',
				inputSize: 'x-small',
				numberStep: 15,
			},
			{
				propName: 'end',
				label: i18n.__('End Time'),
				editable: true,
				inputType: 'time',
				inputSize: 'x-small',
				numberStep: 15,
			},
			{
				propName: 'note',
				label: i18n.__('Public Note'),
				editable: true,
				lineCount: 3,
			},
			{
				propName: 'internalNote',
				label: i18n.__('Internal Note'),
				editable: true,
				lineCount: 3,
			},
			{
				propName: 'taskEstimatedProgress',
				label: i18n.__('Estimated Progress'),
				editable: true,
				inputType: 'percentage',
				inputSize: 'x-small',
			},
			{
				propName: 'repeating',
				label: i18n.__('Enable Recurrence'),
				editable: true,
				inputType: 'toggle',
			},
			{
				propName: 'repeatOn',
				label: i18n.__('Repeat On'),
				editable: true,
				hidden: (values) => !values.repeating,
				inputType: 'togglelist',
				valueList: [
					{ value: 0, label: i18n.__('Sun')},
					{ value: 1, label: i18n.__('Mon')},
					{ value: 2, label: i18n.__('Tue')},
					{ value: 3, label: i18n.__('Wed')},
					{ value: 4, label: i18n.__('Thu')},
					{ value: 5, label: i18n.__('Fri')},
					{ value: 6, label: i18n.__('Sat')},
				]
			},
			{
				propName: 'repeatStart',
				label: i18n.__('Begin Repeat On'),
				editable: true,
				hidden: (values) => !values.repeating,
				inputType: 'date',
				inputSize: 'x-small',
			},
			{
				propName: 'repeatEnd',
				label: i18n.__('End Repeat On'),
				editable: true,
				hidden: (values) => !values.repeating,
				inputType: 'date',
				inputSize: 'x-small',
			},
			{
				propName: 'repeatIntervalMode',
				label: i18n.__('Repeat Mode'),
				editable: true,
				hidden: (values) => !values.repeating,
				inputType: 'option',
				valueList: [
					{ value: true, label: i18n.__('Interval between weeks')},
					{ value: false, label: i18n.__('Specific weeks in month')},
				],
			},
			{
				propName: 'repeatWeekInterval',
				label: i18n.__('Repeat Week Interval'),
				editable: true,
				hidden: (values) => (!values.repeating || !values.repeatIntervalMode),
				inputType: 'number',
				inputSize: 'x-small',
				numberMin: 1,
			},
			{
				propName: 'repeatOnWeeks',
				label: i18n.__('On Which Weeks In Month'),
				editable: true,
				hidden: (values) => (!values.repeating || values.repeatIntervalMode),
				inputType: 'togglelist',
				valueList: [
					{ value: 0, label: i18n.__('first')},
					{ value: 1, label: i18n.__('second')},
					{ value: 2, label: i18n.__('third')},
					{ value: 3, label: i18n.__('fourth')},
					{ value: -1, label: i18n.__('last')},
				]
			},
		];

		return (
			<Gateway into="modal">
				<ReactModal2
					onClose={this.props.onClose}
					closeOnEsc={true}
					closeOnBackdropClick={true}
					backdropClassName='overlay-pane-background'
					modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col width-66'
				>
					<div className="section-title">{ i18n.__('Edit Timesheet Entry') }</div>

					<InputFormManager
						originalValues={this.props.timecard}
						propertiesInfo={formPropInfo}
						idPropName="_id"
						showSaveButton={ true }
						showCancelButton={ true }
						allowSave={ true }
						onSave={ this.handleSave }
						onCancel={ this.props.onClose }
						onClose={ this.props.onClose }
						readOnly={ this.props.readOnly }
					/>
				</ReactModal2>
			</Gateway>
		);
	}
}