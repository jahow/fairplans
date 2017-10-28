import * as React from 'react';
import { Component } from 'react';
import { Tools } from '../../utils/tools';
import FormInput from './FormInput';

import { TAPi18n as i18n } from 'meteor/tap:i18n';


interface props {
	items: any[],
	itemTransform?: (item: any, index?: number) => any,
	showSearchBar?: boolean,
	displayHorizontal?: boolean,
	searchProps?: string | string[],
	sortBy?: string | ((object1: any, object2: any) => number),
	revertSortDirection?: boolean,
	id?: string,
	className?: string,
	style?: Object,
	actions?: any[] | any,
	listRef?: (element: any) => any,

	// hardcoded filters
	filters?: {[prop: string]: string }		// filters are regexp strings; use 'prop1|prop2' as name to allow OR filtering
}

interface state {
	searchText?: string,
}


export default class ItemBlockList extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			searchText: '',
		};

		this.setSearchText = this.setSearchText.bind(this);
	}

	componentWillReceiveProps(new_props: props) {
	}

	setSearchText(new_val: string) {
		this.setState({
			searchText: new_val
		});
	}

	render() {
		let baseclass = "item-block-list flex-col ";

		let searchProps = [].concat(this.props.searchProps);
		let searchText = this.state.searchText.toUpperCase();

		let items = this.props.items

		// apply hardcoded filters
		.filter(item => {
			for(let filter in this.props.filters) {

				// the filter regexp we were given
				let filter_exp = this.props.filters[filter].toLowerCase();

				// get the objectCardProps we need to filter
				let filtered_props = filter.split('|');

				// check if one of them matches
				let match = false;
				for(let i = 0; i < filtered_props.length; i++) {
					if(item[filtered_props[i]] === undefined || item[filtered_props[i]] == null) { continue; }

					let item_value = item[filtered_props[i]].toString().toLowerCase();
					if(item_value.match(filter_exp)) { match = true; break; }
				}

				// no match on any prop checked: filter this item out
				if(!match) { return false; }
			}
			return true;
		})

		// apply search text
		.filter(item => {
			if (!this.props.searchProps || this.props.searchProps.length == 0) { return true; }

			for (let i = 0; i < searchProps.length; i++) {
				let value = (item[searchProps[i]] || '').toString();
				//if (!value) { return false; }
				if (value === undefined || value === null) { continue; }
				if (value.toUpperCase().indexOf(searchText) != -1) { return true; }
			}

			return false;
		});

		// apply toggle filters
		// TODO ?

		// sort
		if (typeof this.props.sortBy == 'string') {
			items.sort(Tools.getSortFunctionByProp(this.props.sortBy, this.props.revertSortDirection, false, true));
		} else if (typeof this.props.sortBy == 'function') {
			let sortFunc = this.props.sortBy as (item1: any, item2: any) => number;
			items.sort((item1, item2) => (this.props.revertSortDirection ? -1 : 1)
				* sortFunc(item1, item2));
		}

		return (
			<div className={baseclass + this.props.className} style={this.props.style}>	

				{
					this.props.showSearchBar &&
					<div className="flex-row flex-no-shrink flex-center">
						<div className="flex-grow text-right light-text no-select">
							{ i18n.__('Search') }
						</div>
						<div className="spacer-col" />
						<FormInput
							overlayRight="🔎"
							className="width-40"
							receiveNewValue={this.setSearchText}
							editable={true}
						/>
					</div>
				}
				{ this.props.showSearchBar && <div className="spacer-row small" /> }

				<div
					className={`items-container ${this.props.displayHorizontal ? 'flex-row scroll-x' : 'flex-col scroll-y'}`}
					ref={this.props.listRef}
				>
				{
					this.props.itemTransform ? items.map(this.props.itemTransform) : items
				}
				</div>

				{
					this.props.actions &&
					<div className="action-bar">
						{ this.props.actions }
					</div>
				}

			</div>
		);
	}

}

(ItemBlockList as any).defaultProps = {
	className: "",
	style: {},
};