import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactModal2 from 'react-modal2';
import { Gateway } from 'react-gateway';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import InputFormManager, { PropertyInfo  } from '../subviews/InputFormManager';
import { Expenses, Expense, UserEntryStatus } from '../../data/collections';
import { ExpenseRefundTypeList, CurrencyList } from '../../data/choicelists';


interface props {
	expense: Expense,
	expenseTypes: { label: string, value: any }[],
	onClose: () => any,
	readOnly?: boolean,
}

interface state {
}

export default class ExpenseEditModal extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {};

		this.handleSave = this.handleSave.bind(this);
	}

	handleSave(id: string, values: Object) {
		Meteor.call('expense.update', id, values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Expense update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Expense has been successfully updated.'));
		});
		this.props.onClose();
	}

	render() {
		// input form params
		let formPropInfo: PropertyInfo[] = [
			{
				propName: 'typeId',
				label: i18n.__('Expense Type'),
				editable: true,
				inputType: 'combo',
				inputSize: 'small',
				valueList: this.props.expenseTypes,
				placeholder: i18n.__('N/A'),
			},
			{
				propName: 'mileageKm',
				label: i18n.__('Mileage'),
				editable: true,
				inputType: 'number',
				inputSize: 'x-small',
			},
			{
				propName: 'invoiceNumber',
				label: i18n.__('Invoice No.'),
				editable: true,
				inputSize: 'medium',
			},
			{
				propName: 'refundAmount',
				label: i18n.__('Refund Amount'),
				editable: true,
				inputType: 'number',
				inputSize: 'x-small',
			},
			{
				propName: 'refundAmountCurrency',
				label: i18n.__('Refund Currency'),
				editable: true,
				inputType: 'combo',
				valueList: CurrencyList,
				inputSize: 'x-small',
			},
			{
				propName: 'refundType',
				label: i18n.__('Billing Type'),
				editable: true,
				inputType: 'combo',
				valueList: ExpenseRefundTypeList,
				inputSize: 'small',
			},
			{
				propName: 'billingAmount',
				label: i18n.__('Refund Amount'),
				editable: true,
				inputType: 'number',
				inputSize: 'x-small',
			},
			{
				propName: 'billingAmountCurrency',
				label: i18n.__('Billing Currency'),
				editable: true,
				inputType: 'combo',
				valueList: CurrencyList,
				inputSize: 'x-small',
			},
			{
				propName: 'billingType',
				label: i18n.__('Billing Type'),
				editable: true,
				inputType: 'combo',
				valueList: ExpenseRefundTypeList,
				inputSize: 'small',
			},
			{
				propName: 'vatAmounts',
				label: i18n.__('VAT Amounts'),
				editable: true,
				inputType: 'objectlist',
				objectFields: [
					{ propName: 'amount', inputType: 'number', placeholder: 'amount', className: 'width-33' },
					{ propName: 'description', inputType: 'text', placeholder: 'description' },
				]
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
					<div className="section-title">{ i18n.__('Edit Expense') }</div>

					<InputFormManager
						originalValues={this.props.expense}
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