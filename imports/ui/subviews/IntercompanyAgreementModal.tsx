import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactModal2 from 'react-modal2';
import { Gateway } from 'react-gateway';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import { showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage } from '../subviews/MessagesDisplay';
import InputFormManager, { PropertyInfo  } from '../subviews/InputFormManager';
import { IntercompanyAgreements, IntercompanyAgreement, Project, Employee } from '../../data/collections';
import { CurrencyList } from '../../data/choicelists';


interface props {
	agreement: IntercompanyAgreement,		// if an id is present on the object, it's an update; else it's a new agreement
	onClose: () => any,

	readOnly?: boolean,
}

interface state {
}

export default class IntercompanyAgreementModal extends Component<props, state> {

	constructor(props: props) {
		super(props);
		this.state = {};

		this.handleSave = this.handleSave.bind(this);
	}

	handleSave(id: string, values: Object) {
		// creation
		if (!id) {
			Meteor.call('intercompany.agreement.create', values, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Intercompany Agreement creation failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Intercompany Agreement has been successfully created.'));
				this.props.onClose();
			});
		}

		// update
		else {
			Meteor.call('intercompany.agreement.update', { agreementId: id, newValues: values }, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Intercompany Agreement update failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Intercompany Agreement has been successfully updated.'));
				this.props.onClose();
			});
		}
	}

	render() {
		// is this a creation
		let createMode = this.props.agreement._id ? false : true;

		// input form params
		let formPropInfo: PropertyInfo[] = [
			{
				propName: 'projectName',
				label: i18n.__('Project'),
				excludeFromCallbacks: true,
			},
			{
				propName: 'taskName',
				label: i18n.__('Project'),
				excludeFromCallbacks: true,
			},
			{
				propName: 'employeeName',
				label: i18n.__('Employee'),
				excludeFromCallbacks: true,
			},

			{
				propName: 'hoursAmount',
				label: i18n.__('Budget (hours)'),
				editable: true,
				inputType: 'time',
				inputSize: 'x-small',
				required: true,
			},
			{
				propName: 'hourlyRate',
				label: i18n.__('Hourly Rate'),
				editable: true,
				inputType: 'number',
				inputSize: 'x-small',
				required: true,
			},
			{
				propName: 'currency',
				label: i18n.__('Currency'),
				editable: true,
				inputType: 'combo',
				valueList: CurrencyList,
				inputSize: 'x-small',
				placeholder: '',
			},

			// hidden props
			{ propName: 'taskId', hidden: true, excludeFromCallbacks: !createMode },
			{ propName: 'employeeId', hidden: true, excludeFromCallbacks: !createMode },
		];

		return (
			<Gateway into="modal">
				<ReactModal2
					onClose={this.props.onClose}
					closeOnEsc={true}
					closeOnBackdropClick={true}
					backdropClassName='overlay-pane-background'
					modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col section width-50'
				>
					<div className="section-title">{ createMode ? i18n.__('Create a New Intercompany Agreement') : i18n.__('Edit an Intercompany Agreement') }</div>

					<InputFormManager
						originalValues={this.props.agreement}
						propertiesInfo={formPropInfo}
						idPropName="_id"
						showSaveButton={ createMode ? i18n.__('CREATE AGREEMENT') : true }
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