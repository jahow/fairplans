import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { browserHistory } from 'react-router';
import * as moment from 'moment';

import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';
import { ProductTypeList, ProductUnitList } from '../../data/choicelists';
import { Product, Products, Companies, Company, ProductType, ProductUnit } from '../../data/collections';
import { CollectionOperation } from '../../data/collections';

import { Tools, DateTools } from '../../utils/tools';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import FormInput from '../controls/FormInput';
import CloseButton from '../controls/CloseButton';
import ItemTableList from '../controls/ItemTableList';
import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';

import ProjectList from '../subviews/ProjectList';


interface props {
	// reactive data
	products: Product[],
	companies: Company[],

	// comes from url arg
	selectedId?: string
}
interface state {
	selectedId?: string,		// if create mode, will hold the value 'new'
	searchText?: string,
	typeFilter?: string,
	canEdit?: boolean,
	canCreate?: boolean,
	createMode?: boolean,
}

class ProductsListContainer extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			selectedId: props.selectedId || '',
			searchText: '',
			typeFilter: '',
			createMode: false,
		};

		this.checkOperationsPermitted(props);

		this.handleItemClick = this.handleItemClick.bind(this);
		this.handleSearchTextChange = this.handleSearchTextChange.bind(this);
		this.handleTypeFilterChange = this.handleTypeFilterChange.bind(this);
		this.handleViewTabClose = this.handleViewTabClose.bind(this);
		this.handleUpdate = this.handleUpdate.bind(this);
		this.handleDelete = this.handleDelete.bind(this);
		this.handleCreate = this.handleCreate.bind(this);
		this.handleArchive = this.handleArchive.bind(this);
		this.handleClickNew = this.handleClickNew.bind(this);
	}

	checkOperationsPermitted(props: props) {
		Meteor.call('can.do', {
			collectionName: 'Products',
			operation: CollectionOperation.UPDATE,
		}, (err, res) => {
			this.setState({ canEdit: !err && res ? true : false })
		});
		Meteor.call('can.do', {
			collectionName: 'Products',
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
			browserHistory.replace('/products/'+item._id);
		} else {
			this.setState({
				selectedId: '',
			});
			browserHistory.replace('/products/');
		}
	}
	handleSearchTextChange(searchText) {
		this.setState({
			searchText
		});
	}
	handleTypeFilterChange(value) {
		this.setState({
			typeFilter: value !== null ? value.toString() : ''
		});
	}
	handleViewTabClose() {
		this.setState({
			selectedId: '',
		});
		browserHistory.replace('/products/');
	}
	handleClickNew() {
		this.setState({
			selectedId: 'new',
		});
	}


	// EDIT FORM HANDLERS

	handleUpdate(id: string, values: Object) {
		Meteor.call('product.update', { productId: id, newValues: values }, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Product creation failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Product has been successfully created.'));
			this.handleViewTabClose();
		});
	}
	handleCreate(id: string, values: Object) {
		Meteor.call('product.create', values, (err, res) => {
			if (err) {
				showErrorMessage(err.reason || i18n.__('Product update failed (unknown reason).'));
				return;
			}
			showInformationMessage(i18n.__('Product has been successfully updated.'));
			this.handleViewTabClose();
		});
	}
	handleArchive(id: string) {
		// todo
	}
	handleDelete(id: string) {
		if (confirm(i18n.__('Are you sure you want to delete this product?'))) {
			Meteor.call('product.delete', id, (err, res) => {
				if (err) {
					showErrorMessage(err.reason || i18n.__('Product delete failed (unknown reason).'));
					return;
				}
				showInformationMessage(i18n.__('Product has been successfully deleted.'));
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
		list_columns['companyCode'] = {
			label: i18n.__('Company'),
			groupBy: true,
			mapping: companiesList
		};
		list_columns['code'] = { label: i18n.__('Product Code'), widthRatio: 0.18 };
		list_columns['type'] = { label: i18n.__('Type'), widthRatio: 0.18, mapping: ProductTypeList };
		list_columns['name'] = { label: i18n.__('Name') };
		list_columns['updateTime'] = { label: i18n.__('Last Updated'),
			widthRatio: 0.18,
			transform: DateTools.printDateFromTimestamp
		};

		// filters
		let filters: { [index: string]: any } = {
			'name|code':  '.*' + this.state.searchText + '.*',
			'type': this.state.typeFilter
		};

		// input form params
		let formPropInfo: PropertyInfo[] = [
			{
				propName: 'code',
				label: i18n.__('Code'),
				editable: isCreateMode,
				inputSize: 'small',
				excludeFromCallbacks: !isCreateMode,
				required: isCreateMode,
			},
			{
				propName: 'companyCode',
				label: i18n.__('Company'),
				editable: isCreateMode,
				inputSize: 'medium',
				inputType: 'combo',
				valueList: companiesList,
				placeholder: ' ',
				required: isCreateMode,
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
				valueList: ProductTypeList,
				editable: this.state.canEdit,
				inputSize: 'small',
			},
			{
				propName: 'unit',
				label: i18n.__('Unit'),
				editable: false,
				inputSize: 'small',
				transform: (value) => {
					return ProductUnitList.find(u => u.value == value).label;
				}
			},
			{
				propName: 'description',
				label: i18n.__('Description'),
				editable: this.state.canEdit,
				lineCount: 3,
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

		let selectedProduct = null;
		let selectedIndices = [];

		if (isCreateMode) {
			selectedProduct = { _id: 'new', type: ProductType.MATERIAL, unit: ProductUnit.PIECE };
		} else if (this.state.selectedId) {
			selectedProduct = this.props.products.find(p => p._id == this.props.selectedId);
			selectedIndices = [this.props.products.findIndex(p => p._id == this.props.selectedId)];
		}

		return (
			<div className="flex-col management-page-container">

				<div className="flex-row flex-center flex-start flex-no-shrink">
					<div className="page-title">{ i18n.__('Products') }</div>
					<div className="spacer-col"/>
					<FormInput
						receiveNewValue={this.handleSearchTextChange}
						placeholder={ i18n.__("search for")+"..." }
						editable={true} />
					<div className="spacer-col"/>
					<FormInput
						inputType="select"
						valuesList={ ProductTypeList }
						receiveNewValue={this.handleTypeFilterChange}
						placeholder={ i18n.__("filter type")+"..." }
						editable={true} />
					<div className="spacer-col" />
					<button className={`action-add ${this.state.canCreate ? '' : 'disabled'}`} onClick={this.handleClickNew}>
						{ i18n.__('NEW PRODUCT') }
					</button>
				</div>

				<div className="spacer-row" />

				<div className="flex-grow flex-row">

					<div className="width-exclude-side-pane flex-col">
						<ItemTableList
							columns={list_columns}
							items={this.props.products}
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
					className={'forward-pane side-pane ' + (selectedProduct ? 'opened' : '')}
				>
					<CloseButton onClick={this.handleViewTabClose} bright={true} />
					{
						selectedProduct &&
						<div className="section-container scroll-y padding-outer-gutter">

							<div className="section-title">{ i18n.__('Properties')}</div>

							<InputFormManager
								originalValues={selectedProduct}
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

						</div>
					}
				</div>

			</div>
		);
	}
}


export default createContainer((params) => {

	Meteor.subscribe('products');
	
	return {
		products: Products.find().fetch(),
		companies: Companies.find().fetch(),
	};

}, ProductsListContainer);
