import * as React from 'react';
import { Component } from 'react';
import { createContainer } from 'meteor/react-meteor-data';
import ReactModal2 from 'react-modal2';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { Partners, Partner, Companies, Company, CollectionOperation } from '../../data/collections';
import { LanguageList } from '../../data/choicelists';

import ProjectManagementContainer from './ProjectManagementContainer';
import ProjectList from '../subviews/ProjectList';
import Toolbar from '../subviews/Toolbar';
import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';
import CloseButton from '../controls/CloseButton';


interface props {
	routeParams: any

	// reactive data
	companies: Company[],
	partners: Partner[],
}
interface state {
	canCreate?: boolean,
	showCreationModal?: boolean,
}


class PartnersListView extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
			canCreate: false,
			showCreationModal: false,
		};

		this.checkOperationsPermitted();

		this.handleCloseCreationModal = this.handleCloseCreationModal.bind(this);
		this.handleOpenCreationModal = this.handleOpenCreationModal.bind(this);
		this.handleProjectCreate = this.handleProjectCreate.bind(this);
	}

	checkOperationsPermitted() {
		Meteor.call('can.do', {
			collectionName: 'Projects',
			operation: CollectionOperation.INSERT,
		}, (err, res) => {
			this.setState({ canCreate: !err && res ? true : false })
		});
	}

	handleCloseCreationModal() {
		this.setState({ showCreationModal: false });
	}
	handleOpenCreationModal() {
		this.setState({ showCreationModal: true });
	}

	handleProjectCreate(id: string, values: Object) {
		Meteor.call('project.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Project creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Project successfully created.'));
		});
		this.handleCloseCreationModal();
	}

	render() {
		// a project id is specified: go into management mode
		if(this.props.routeParams.projectId) {
			return (
				<div className="width-100 with-toolbar">
					<ProjectManagementContainer projectId={this.props.routeParams.projectId} />
					<Toolbar />
				</div>
			);
		}

		// no project id: display list

		// companies list
		let companiesList = this.props.companies.map(c => {
			return {
				value: c.code,
				label: c.name
			};
		});

		// partners list
		let partnersList = this.props.partners.map(p => {
			return {
				value: p.code,
				label: p.name
			};
		});

		// creation form params
		let formPropInfo: PropertyInfo[] = [
			{
				propName: 'code',
				label: i18n.__('Code'),
				editable: true,
				inputSize: 'small',
			},
			{
				propName: 'companyCode',
				label: i18n.__('Company'),
				editable: true,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: companiesList,
				placeholder: ' ',
			},
			{
				propName: 'name',
				label: i18n.__('Name'),
				editable: true,
			},
			{
				propName: 'partnerCode',
				label: i18n.__('Partner'),
				editable: true,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: partnersList,
				placeholder: ' ',
			},
			{
				propName: 'description',
				label: i18n.__('Description'),
				editable: true,
				lineCount: 3,
			},
			{
				propName: 'languageCode',
				label: i18n.__('Language'),
				editable: true,
				inputSize: 'small',
				inputType: 'combo',
				valueList: LanguageList,
				placeholder: ' ',
			},
			{
				propName: 'beginDate',
				label: i18n.__('Begin Date'),
				inputType: 'date',
				editable: true,
			},
			{
				propName: 'endDate',
				label: i18n.__('End Date'),
				inputType: 'date',
				editable: true,
			},
		];

		return (
			<div className="width-100 with-toolbar">
				<div className="flex-col management-page-container">
					<div className="flex-row flex-center flex-start flex-no-shrink">
						<div className="page-title">{i18n.__('Projects') }</div>
						<div className="spacer-col" />
						<button
							className={`action-add ${this.state.canCreate ? '' : 'disabled'}`}
							onClick={this.handleOpenCreationModal}>
							{ i18n.__('NEW PROJECT') }
						</button>
					</div>

					<div className="spacer-row" />

					<div className="lowkey-pane flex-grow padding-outer-gutter flex-col">
						<ProjectList columnCount={4} enableLinks={true} />
					</div>
				</div>

				{
					this.state.showCreationModal &&
					<ReactModal2
						onClose={this.handleCloseCreationModal}
						closeOnEsc={true}
						closeOnBackdropClick={true}
						backdropClassName='overlay-pane-background'
						modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col width-66'
					>
						<CloseButton onClick={this.handleCloseCreationModal} bright={true} />

						<div className="section-container">
							<div className="section-title">{ i18n.__('New Project')}</div>
							<InputFormManager
								originalValues={{}}
								propertiesInfo={formPropInfo}
								idPropName="_id"
								showSaveButton={ i18n.__('CREATE') }
								showCancelButton={ true }
								allowSave={ true }
								onSave={ this.handleProjectCreate }
								onCancel={ this.handleCloseCreationModal }
							/>
						</div>

					</ReactModal2>
				}

				<Toolbar />
			</div>
		);
	}
}

export default createContainer((params) => {

	Meteor.subscribe('project.creation');

	return {
		partners: Partners.find().fetch(),
		companies: Companies.find().fetch(),
	};

}, PartnersListView);