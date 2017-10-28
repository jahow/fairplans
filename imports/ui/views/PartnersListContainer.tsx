import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { browserHistory } from 'react-router';
import * as moment from 'moment';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { PartnerTypeList, LanguageList } from '../../data/choicelists';
import { Partner, Partners, Companies, Company, PartnerType } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';

import { Tools, DateTools } from '../../utils/tools';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import FormInput from '../controls/FormInput';
import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';
import CloseButton from '../controls/CloseButton';
import ItemTableList from '../controls/ItemTableList';

import ProjectList from '../subviews/ProjectList';


interface props {
	// reactive data
	partners: Partner[],
	companies: Company[],

	// comes from url arg
	selectedId?: string
}
interface state {
	selectedId?: string,		// if create mode, will hold the value 'new'
	searchText?: string,
	canEdit?: boolean,
	canCreate?: boolean,
	createMode?: boolean,
}

class PartnersListContainer extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			selectedId: props.selectedId || '',
			searchText: '',
			createMode: false,
		};

		this.checkOperationsPermitted(props);

		this.handleItemClick = this.handleItemClick.bind(this);
		this.handleSearchTextChange = this.handleSearchTextChange.bind(this);
		this.handleViewTabClose = this.handleViewTabClose.bind(this);
		this.handleUpdate = this.handleUpdate.bind(this);
		this.handleDelete = this.handleDelete.bind(this);
		this.handleCreate = this.handleCreate.bind(this);
		this.handleArchive = this.handleArchive.bind(this);
		this.handleClickNew = this.handleClickNew.bind(this);
	}

	checkOperationsPermitted(props: props) {
		Meteor.call('can.do', {
			collectionName: 'Partners',
			operation: CollectionOperation.UPDATE,
		}, (err, res) => {
			this.setState({ canEdit: !err && res ? true : false })
		});
		Meteor.call('can.do', {
			collectionName: 'Partners',
			operation: CollectionOperation.INSERT,
		}, (err, res) => {
			this.setState({ canCreate: !err && res ? true : false })
		});
	}

	componentWillReceiveProps(new_props: props) {
		if(new_props.selectedId != null) {
			this.setState({
				selectedId: new_props.selectedId,
			});
		}
	}

	handleItemClick(item: any) {
		if(this.state.selectedId != item._id) {
			this.setState({
				selectedId: item._id,
			});
			browserHistory.replace('/partners/'+item._id);
		} else {
			this.setState({
				selectedId: '',
			});
			browserHistory.replace('/partners/');
		}
	}
	handleSearchTextChange(searchText) {
		this.setState({
			searchText
		});
	}
	handleViewTabClose() {
		this.setState({
			selectedId: '',
		});
		browserHistory.replace('/partners/');
	}
	handleClickNew() {
		this.setState({
			selectedId: 'new',
		});
	}


	// EDIT FORM HANDLERS

	handleUpdate(id: string, values: Object) {
		Meteor.call('partner.update', { partnerId: id, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Partner creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Partner has been successfully created.'));
			this.handleViewTabClose();
		});
	}
	handleCreate(id: string, values: Object) {
		Meteor.call('partner.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Partner update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Partner has been successfully updated.'));
			this.handleViewTabClose();
		});
	}
	handleArchive(id: string) {
		// todo
	}
	handleDelete(id: string) {
		if (confirm(i18n.__('Are you sure you want to delete this partner?'))) {
			Meteor.call('partner.delete', id, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Partner delete failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Partner has been successfully deleted.'));
				this.handleViewTabClose();
			});
		}
	}


	render() {
		let isCreateMode = this.state.selectedId == 'new';

		// companies list
		let companiesList = this.props.companies.map(c => {
			return {
				value: c.code,
				label: c.name
			};
		});

		// item list params
		let list_columns: { [index: string]: any } = {};
		list_columns['code'] = { label: i18n.__('Partner Code'), widthRatio: 0.2 };
		list_columns['companyCode'] = { label: i18n.__('Company'), groupBy: true, mapping: companiesList };
		list_columns['type'] = { label: i18n.__('Type'), widthRatio: 0.18, mapping: PartnerTypeList };
		list_columns['name'] = { label: i18n.__('Partner Name') };
		list_columns['languageCode'] = { label: i18n.__('Language'), widthRatio: 0.16, mapping: LanguageList };
		list_columns['updateTime'] = { label: i18n.__('Last Updated'),
			widthRatio: 0.18,
			transform: DateTools.printDateFromTimestamp };

		// filters
		let filters: { [index: string]: any } = {
			'name|code':  '.*' + this.state.searchText + '.*'
		};

		// input form params
		let formPropInfo: PropertyInfo[] = [
			{
				propName: 'code',
				label: i18n.__('Code'),
				editable: isCreateMode,
				inputSize: 'small',
				excludeFromCallbacks: !isCreateMode,
			},
			{
				propName: 'companyCode',
				label: i18n.__('Company'),
				editable: isCreateMode,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: companiesList,
				placeholder: ' ',
			},
			{
				propName: 'name',
				label: i18n.__('Name'),
				editable: this.state.canEdit,
			},
			{
				propName: 'type',
				label: i18n.__('Type'),
				inputType: 'combo',
				valueList: PartnerTypeList,
				editable: this.state.canEdit,
				inputSize: 'small',
			},
			{
				propName: 'languageCode',
				label: i18n.__('Language'),
				inputType: 'combo',
				valueList: LanguageList,
				placeholder: ' ',
				editable: this.state.canEdit,
				inputSize: 'small',
			},
			{
				propName: 'externalCompanyCode',
				label: i18n.__('Use this partner for intercompany orders with'),
				valueList: companiesList,
				placeholder: ' ',
				editable: this.state.canEdit,
				inputSize: 'medium',
				inputType: 'combo',
			},
		];
		if (!isCreateMode) {
			let formatDate = (timestamp) => moment(timestamp).format('LLL');
			formPropInfo.push(
				{
					propName: 'creationTime',
					label: i18n.__('Created On'),
					seeThrough: true,
					transform: formatDate,
				},
				{
					propName: 'updateTime',
					label: i18n.__('Updated On'),
					seeThrough: true,
					transform: formatDate,
				},
			);
		}

		let selectedPartner = null;
		let selectedIndices = [];

		if (isCreateMode) {
			selectedPartner = { _id: 'new', type: PartnerType.CUSTOMER };
		} else if (this.state.selectedId) {
			selectedPartner = this.props.partners.find(p => p._id == this.props.selectedId);
			selectedIndices = [this.props.partners.findIndex(p => p._id == this.props.selectedId)];
		}

		return (
			<div className="flex-col management-page-container">

				<div className="flex-row flex-center flex-start flex-no-shrink">
					<div className="page-title">{ i18n.__('Partners') }</div>
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleSearchTextChange}
						placeholder={ i18n.__("search for")+"..." }
						editable={true} />
					<div className="spacer-col"/>
					<button className={`action-add ${this.state.canCreate ? '' : 'disabled'}`} onClick={this.handleClickNew}>
						{ i18n.__('NEW PARTNER') }
					</button>
				</div>

				<div className="spacer-row" />

				<div className="flex-grow flex-row">

					<div className="width-exclude-side-pane flex-col">
						<ItemTableList
							columns={list_columns}
							items={this.props.partners}
							className="flex-grow"
							itemsInteractable={true}
							enableSorting={true}
							onItemClick={this.handleItemClick}
							filters={filters}
							selectedIndices={selectedIndices}
							fixedHeaders={true}
						/>
					</div>

				</div>

				<div
					className={'forward-pane side-pane ' + (selectedPartner ? 'opened' : '')}
				>
					<CloseButton onClick={this.handleViewTabClose} bright={true} />
					{
						selectedPartner &&
						<div className="section-container scroll-y padding-outer-gutter">

							<div className="section-title">{ i18n.__('Properties')}</div>

							<InputFormManager
								originalValues={selectedPartner}
								propertiesInfo={formPropInfo}
								idPropName="_id"
								showSaveButton={ isCreateMode ? i18n.__('CREATE') : i18n.__('UPDATE') }
								showCancelButton={ isCreateMode }
								showRevertButton={ !isCreateMode }
								showDeleteButton={ !isCreateMode }
								allowSave={this.state.canEdit}
								allowDelete={this.state.canEdit}
								onSave={ isCreateMode ? this.handleCreate : this.handleUpdate }
								onDelete={ this.handleDelete }
								onCancel={ this.handleViewTabClose }
							/>

							<div className="spacer-row"/>

							{
								!isCreateMode &&
								<div className="section-title">{ i18n.__('Related projects')}</div>
							}
							{
								!isCreateMode &&
								<ProjectList
									compactMode={true}
									partnerCodeFilter={selectedPartner.code}
									columnCount={1}
									displayGroupButtons={false}
									enableLinks={true}
								/>
							}
						</div>
					}
				</div>

			</div>
		);
	}
}


export default createContainer((params) => {

	Meteor.subscribe('partners');

	return {
		partners: Partners.find().fetch(),
		companies: Companies.find().fetch(),
	};

}, PartnersListContainer);
