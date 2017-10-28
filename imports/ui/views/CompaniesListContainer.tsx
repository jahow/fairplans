import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { browserHistory } from 'react-router';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { CountryList, CurrencyList } from '../../data/choicelists';
import { Company, Companies } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';
import { Tools, DateTools } from '../../utils/tools';

import FormInput from '../controls/FormInput';
import CloseButton from '../controls/CloseButton';
import ItemTableList from '../controls/ItemTableList';
import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';

import ProjectList from '../subviews/ProjectList';


interface props {
	companies: Company[],
	selectedId?: string
}
interface state {
	selectedId?: string,		// if create mode, will hold the value 'new'
	searchText?: string,
	canCreate?: boolean,
	canEdit?: boolean,
	createMode?: boolean,
}

class CompaniesListContainer extends Component<props, state> {

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
			collectionName: 'Companies',
			operation: CollectionOperation.UPDATE,
		}, (err, res) => {
			this.setState({ canEdit: !err && res ? true : false })
		});
		Meteor.call('can.do', {
			collectionName: 'Companies',
			operation: CollectionOperation.INSERT,
		}, (err, res) => {
			this.setState({ canCreate: !err && res ? true : false })
		});
	}

	componentWillReceiveProps(newProps: props) {
		if(newProps.selectedId != null && this.state.selectedId != newProps.selectedId) {
			this.setState({
				selectedId: newProps.selectedId,
			});
		}
	}

	handleItemClick(item: any) {
		if(this.state.selectedId != item._id) {
			this.setState({
				selectedId: item._id,
			});
			browserHistory.replace('/companies/'+item._id);
		} else {
			this.setState({
				selectedId: '',
			});
			browserHistory.replace('/companies/');
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
		browserHistory.replace('/companies/');
	}
	handleClickNew() {
		this.setState({
			selectedId: 'new',
		});
	}


	// EDIT FORM HANDLERS

	handleUpdate(id: string, values: Object) {
		Meteor.call('company.update', { companyId: id, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Company creation updated (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Company has been successfully updated.'));
			this.handleViewTabClose();
		});
	}
	handleCreate(id: string, values: Object) {
		Meteor.call('company.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Company creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Company has been successfully created.'));
			this.handleViewTabClose();
		});
	}
	handleArchive(id: string) {
		// todo
	}
	handleDelete(id: string) {
		if (confirm(i18n.__('Are you sure you want to delete this company?'))) {
			Meteor.call('company.delete', id, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Company delete failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Company has been successfully deleted.'));
				this.handleViewTabClose();
			});
		}
	}


	render() {
		let isCreateMode = this.state.selectedId == 'new';

		// item list params
		let list_columns: { [index: string]: any } = {};
		list_columns['code'] = { label: i18n.__('Company Code'), widthRatio: 0.2 };
		list_columns['name'] = { label: i18n.__('Company Name') };
		list_columns['countryCode'] = { label: i18n.__('Country'), widthRatio: 0.16, mapping: CountryList };
		list_columns['defaultCurrency'] = { label: i18n.__('Currency'), widthRatio: 0.12 };

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
				propName: 'name',
				label: i18n.__('Name'),
				editable: this.state.canEdit,
			},
			{
				propName: 'countryCode',
				label: i18n.__('Country'),
				inputType: 'combo',
				valueList: CountryList,
				placeholder: ' ',
				editable: this.state.canEdit,
				inputSize: 'small',
			},
			{
				propName: 'defaultCurrency',
				label: i18n.__('Default Currency'),
				inputType: 'combo',
				valueList: CurrencyList,
				placeholder: ' ',
				editable: this.state.canEdit,
				inputSize: 'small',
			},
			{
				propName: 'addressLines',
				label: i18n.__('Address'),
				lineCount: 3,
				editable: this.state.canEdit,
			},
			{
				propName: 'addressCity',
				label: i18n.__('City'),
				editable: this.state.canEdit,
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

		let selectedCompany = null;
		let selectedIndices = [];

		if (isCreateMode) {
			selectedCompany = { _id: 'new' };
		} else if (this.state.selectedId) {
			selectedCompany = this.props.companies.find(p => p._id == this.props.selectedId);
			selectedIndices = [this.props.companies.findIndex(p => p._id == this.props.selectedId)];
		}

		return (

			<div className="flex-col management-page-container">

				<div className="flex-row flex-center flex-start flex-no-shrink">
					<div className="page-title">{ i18n.__('Companies') }</div>
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleSearchTextChange}
						placeholder={ i18n.__("search for")+"..." }
						editable={true} />
					<div className="spacer-col"/>
					<button className={`action-add ${this.state.canCreate ? '' : 'disabled'}`} onClick={this.handleClickNew}>
						{ i18n.__('NEW COMPANY') }
					</button>
				</div>

				<div className="spacer-row" />

				<div className="flex-grow flex-row">

					<div className="width-exclude-side-pane flex-col">
						<ItemTableList
							columns={list_columns}
							items={this.props.companies}
							className="flex-grow"
							itemsInteractable={true}
							fixedHeaders={true}
							enableSorting={true}
							onItemClick={this.handleItemClick}
							filters={filters}
							selectedIndices={selectedIndices}
						/>
					</div>

				</div>

				<div
					className={'forward-pane side-pane ' + (selectedCompany ? 'opened' : '')}
				>
					<CloseButton onClick={this.handleViewTabClose} bright={true} />
					{
						selectedCompany &&
						<div className="section-container scroll-y padding-outer-gutter">

							<div className="section-title">{ i18n.__('Properties')}</div>

							<InputFormManager
								originalValues={selectedCompany}
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
									companyCodeFilter={selectedCompany.code}
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

	Meteor.subscribe('companies');
	let companies: Company[] = Companies.find().fetch();

	return {
		companies
	};

}, CompaniesListContainer);
