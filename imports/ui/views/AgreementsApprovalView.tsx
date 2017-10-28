import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import { browserHistory, Link } from 'react-router';
import * as moment from 'moment';

import { IntercompanyAgreements, IntercompanyAgreement } from '../../data/collections';
import { Employees, Employee } from '../../data/collections';
import { DateTools } from '../../utils/tools';

import IntercompanyAgreementModal from '../subviews/IntercompanyAgreementModal';
import Toolbar from '../subviews/Toolbar';
import FormInput from '../controls/FormInput';
import ItemTableList from '../controls/ItemTableList';


interface props {
	// query params
	location: { query?: any },

	// reactive data
	agreements?: IntercompanyAgreement[],
	currentUserId?: string,
	currentEmployee?: Employee,
	managedEmployees?: Employee[],
}
interface state {
	// selection
	selectedIds?: string[],		// this is an array of id!

	viewAgreementId?: string,
	viewAgreementReadOnly?: boolean,
}

class AgreementsApprovalView extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
			selectedIds: [],
		};

		this.handleSelection = this.handleSelection.bind(this);
		this.handleAgreementEdit = this.handleAgreementEdit.bind(this);
		this.handleAgreementClose = this.handleAgreementClose.bind(this);
		this.handleAgreementsApprove = this.handleAgreementsApprove.bind(this);
	}

	handleSelection(agreement: IntercompanyAgreement) {
		let selectedIds = this.state.selectedIds;
		let index = selectedIds.indexOf(agreement._id);

		if (index == -1) { selectedIds.push(agreement._id); }
		else { selectedIds.splice(index, 1); }

		this.setState({
			selectedIds
		});
	}

	handleAgreementEdit(agreementId: string, readOnly?: boolean) {
		this.setState({
			viewAgreementId: agreementId,
			viewAgreementReadOnly: readOnly,
		});
	}
	handleAgreementClose() {
		this.setState({
			viewAgreementId: null
		});
	}

	handleAgreementsApprove(agreementIds: string[]) {
		for (let i = 0; i < agreementIds.length; i++) {
			// do not approve already approved agreements
			if (this.props.agreements.find(a => a._id == agreementIds[i]).isApproved) { continue; }

			// do approval
			Meteor.call('intercompany.agreements.approve', agreementIds[i]);
		}
		this.setState({
			selectedIds: []
		});
	}

	render() {

		// agreements table list
		let agreementCols = {
			projectName: {
				label: i18n.__('Project'),
				transform: (val, object) => <Link className="inline" to={'/projects/' + object.projectId}>{val}</Link>
			},
			taskName: {
				label: i18n.__('Task'),
			},
			employeeName: {
				label: i18n.__('Employee'),
				// TODO: allow link to employee
				// transform: (val, object) => <Link className="inline" to={'/employees/' + object.employeeId}>{val}</Link>
			},
			hoursAmount: {
				label: i18n.__('Hours Budget'),
				transform: val => DateTools.convertTimeNumberToString(val)
			},
			hourlyRate: {
				label: i18n.__('Hourly Rate')
			},
			isApproved: {
				label: i18n.__('Agreement Status'),
				mapping: [
					{ value: true, label: i18n.__('approved') },
					{ value: false, label: i18n.__('not approved') }
				]
			},
			hoursRemaining: {
				label: i18n.__('Hours Remaining'),
				transform: val => DateTools.convertTimeNumberToString(val)
			},
			actions: {
				label: i18n.__('Actions'),
				className: 'flex-row flex-center flex-start',
			}
		};

		let agreements = this.props.agreements.map(agreement => {
			let employee = this.props.managedEmployees.find(e => e._id == agreement.employeeId) || {} as Employee;
			return Object.assign({}, agreement, {
				hourlyRate: `${agreement.hourlyRate.toFixed(2)} ${agreement.currency}`,
				actions: agreement.isApproved ?
					<div className="flex-row flex-center flex-start">
						<div className="button small flex-no-shrink"
							 onClick={() => this.handleAgreementEdit(agreement._id, true)}>
							{ i18n.__('VIEW') }
						</div>
					</div>
					:
					<div className="flex-row flex-center flex-start">
						<div className="button action-dostuff small flex-no-shrink"
							 onClick={() => this.handleAgreementEdit(agreement._id)}>
							{ i18n.__('EDIT') }
						</div>
						<div className="spacer-col small" />
						<div className="button action-warning small flex-no-shrink"
							 onClick={() => this.handleAgreementsApprove([agreement._id])}>
							{ i18n.__('APPROVE') }
						</div>
					</div>
			});
		});

		let selectedIndices = this.state.selectedIds.map(id => {
			return agreements.findIndex(a => a._id == id);
		});

		return (
			<div className="main-pane width-100 with-toolbar flex-col">
				<div className="page-title">{ i18n.__('Intercompany Agreements Approval') }</div>
				<div className="spacer-row" />

				<ItemTableList
					columns={agreementCols}
					items={agreements}
					fixedHeaders={true}
					enableSorting={true}
					className="flex-grow font09"
					itemsSelectable={true}
					selectedIndices={selectedIndices}
					onItemSelectChange={this.handleSelection}
				/>

				<div className="spacer-row" />

				<div className="flex-row flex-no-shrink">
					<div className="button-bar">
						<span>
							<strong>{ this.state.selectedIds.length }</strong>&nbsp;
							<span>{ i18n.__('agreements have been selected.') }</span>
						</span>
					</div>
					<div className="spacer-col" />
					{
						this.state.selectedIds.length > 0 &&
						this.props.agreements.filter(a => this.state.selectedIds.indexOf(a._id) > -1 && !a.isApproved).length > 0 &&
						<div className="button-bar">
							<span>
								{ i18n.__('Actions') }:
							</span>
							<div className="button action-dostuff  flex-no-shrink"
								 onClick={() => this.handleAgreementsApprove(this.state.selectedIds)}>
								{ i18n.__('APPROVE') }
							</div>
						</div>
					}
				</div>

				<div className="spacer-row" />

				<Toolbar />

				{
					this.state.viewAgreementId &&
					<IntercompanyAgreementModal
						agreement={this.props.agreements.find(a => a._id == this.state.viewAgreementId)}
						readOnly={this.state.viewAgreementReadOnly}
						onClose={this.handleAgreementClose}
					/>
				}
			</div>
		);
	}
}

export default createContainer((params) => {
	Meteor.subscribe('employees.list');
	let currentEmployee = Employees.findOne({ userId: Meteor.userId() }) || {} as Employee;
	let managedEmployees = Employees.find({ managerId: currentEmployee._id }).fetch();
	Meteor.subscribe('intercompany.agreements', { managerId: currentEmployee._id });
	let isAdmin = Meteor.user().profile.isAdmin;

	return {
		agreements: isAdmin ? IntercompanyAgreements.find().fetch() : IntercompanyAgreements.find({
			employeeId: {
				$in: managedEmployees.map(e => e._id)
			}
		}).fetch(),
		currentUserId: Meteor.userId(),
		currentEmployee,
		managedEmployees,
	};

}, AgreementsApprovalView);
