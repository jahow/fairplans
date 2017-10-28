import * as React from 'react';
import { Component } from 'react';
import { Tools } from '../../utils/tools';

import ExtendedTable, { Column, Row, Cell } from './ExtendedTable';
import ToggleIcon from './ToggleIcon';
import DraggableFrame from './DraggableFrame';


interface props {
	items: any[],					// object holding the props that are displayed on a row
	selectedIndices?: number[],		// indices in the items array
	columns: {[index:string]: {
		label: string,
		widthRatio?: number,	 	// %
		// sort?: string,				// '', 'A' or 'D'
		groupBy?: boolean,
		className?: string,		// will be applied to cells
		style?: any,
		mapping?: { value: any, label: string }[],
		transform?: (value: any, object: any) => string | JSX.Element | JSX.IntrinsicElements
	}},
	itemsInteractable?: boolean,
	enableSorting?: boolean,
	hideHeaders?: boolean,
	fixedHeaders?: boolean,
	actions?: any[] | any,
	itemsSelectable?: boolean,		// add checkboxes in front of items
	lineRef?: (element: any, lineIndex: number) => any,
	baseRowHeight?: number,		// pixels
	columnsResizable?: boolean,

	// events
	onItemClick?: (clickedItem: any, clickedItemIndex: number) => any,
	onItemSelectChange?: (selectedItem: any, selectedItemIndex: number, selected: boolean) => any,
	onItemSelectAll?: () => any,	// if define,d a toggle will appear in the header

	// hardcoded filters
	filters?: {[prop: string]: string }		// filters are regexp strings; use 'prop1|prop2' as name to allow OR filtering
	
	id?: string,
	className?: string,
	style?: Object,
}

interface state {
	sortProp?: string,
	reverseSort?: boolean,
	columnsRelativeWidth?: number[],	// array of ratios which sum should be one; initialized based on columns.widthRatio props
}

const BASE_COL_WIDTH = 40;
const BASE_ROW_HEIGHT = 42;

export default class ItemTableList extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			columnsRelativeWidth: this.computeActualColumnWidthRatios(props),
		};

		this.handleItemClick = this.handleItemClick.bind(this);
		this.handleHeaderClick = this.handleHeaderClick.bind(this);
		this.handleColumnResize = this.handleColumnResize.bind(this);
	}

	componentWillReceiveProps(new_props: props) {
	}

	handleItemClick(item, index) {
		if(!this.props.itemsInteractable) { return; }

		// click handler
		this.props.onItemClick(item, index);
	}

	handleHeaderClick(prop) {
		let currentProp = this.state.sortProp;

		if (currentProp == prop && !this.state.reverseSort) {
			this.setState({
				sortProp: prop,
				reverseSort: true,
			});
		} else if (currentProp == prop && this.state.reverseSort) {
			this.setState({
				sortProp: null,
				reverseSort: true,
			});
		} else {
			this.setState({
				sortProp: prop,
				reverseSort: false,
			});
		}
	}

	handleColumnResize(colIndex: number) {
		return (dX: number, dY: number, newX: number, newY: number, startX: number, startY: number, rect: ClientRect, element: HTMLElement) => {
			let columnsRelativeWidth = [].concat(this.state.columnsRelativeWidth);
			let ratioDiff = columnsRelativeWidth[colIndex] * dX / rect.width;
			columnsRelativeWidth[colIndex] += ratioDiff;
			columnsRelativeWidth[colIndex + 1] -= ratioDiff;

			// from this index, walk through the array to make sure all columns have the minimum width
			let minRelativeWidth = BASE_COL_WIDTH * this.state.columnsRelativeWidth[colIndex] / rect.width;
			if (ratioDiff > 0) {
				for (let i = colIndex + 1; i < columnsRelativeWidth.length - 1; i++) {
					let diff = Math.max(0, minRelativeWidth - columnsRelativeWidth[i]);
					if (diff > 0) {
						columnsRelativeWidth[i] += diff;
						columnsRelativeWidth[i + 1] -= diff;
					}
				}
			} else if (ratioDiff < 0) {
				for (let i = colIndex; i >= 1; i--) {
					let diff = Math.max(0, minRelativeWidth - columnsRelativeWidth[i]);
					if (diff > 0) {
						columnsRelativeWidth[i] += diff;
						columnsRelativeWidth[i - 1] -= diff;
					}
				}
			}

			// make sure all columns have a valid size
			if (columnsRelativeWidth[0] < minRelativeWidth * 1.1 || columnsRelativeWidth[columnsRelativeWidth.length - 1] < minRelativeWidth * 1.1) {
				return;
			}

			this.setState({
				columnsRelativeWidth
			});
		};
	}

	generateItemRow(item: any, visibleProperties: string[], groupProperty: string, index: number): Row {
		// group header
		if (item['_groupValue']) {
			let value = item['_groupValue'];

			// mapping
			let mapping = this.props.columns[groupProperty].mapping;
			if (mapping) {
				value = (mapping.find(obj => obj.value == value) || { label: value }).label;
			}

			// transform
			let transform = this.props.columns[groupProperty].transform || (value => value);
			value = transform(value, item);

			return {
				cells: [{
					content: `${this.props.columns[groupProperty].label}: ${value}`,
					colSpan: visibleProperties.length,
				}],
				className: 'group-line',
			};
		}

		let cells: Cell[] = visibleProperties.map(prop => {
			let transform = this.props.columns[prop].transform || function(value) { return value; };
			return {
				className: this.props.columns[prop].className || '',
				style: this.props.columns[prop].style,
				content: transform(
					this.props.columns[prop].mapping ?
					(this.props.columns[prop].mapping.find(obj => obj.value == item[prop]) || {label: item[prop]}).label :
					item[prop],
					item
				)
			};
		})

		// add checkbox
		if (this.props.itemsSelectable) {
			let selected = (this.props.selectedIndices.indexOf(item._index) > -1);

			cells.unshift({
				content: <ToggleIcon
					value={selected}
					onChange={() => this.props.onItemSelectChange(item, item._index, !selected)}
				/>,
				className: 'flex-col flex-center',
				style: { flexGrow: 0, height: BASE_COL_WIDTH-2 }
			});
		}

		return {
			cells,
			onClick: () => this.handleItemClick(item, item._index),
			className: 'item-line ' + (this.props.selectedIndices.indexOf(item._index) >= 0 ? 'selected-line': ''),
			ref: this.props.lineRef ? (el, index) => this.props.lineRef(el, index-1) : null,
		};
	}

	computeActualColumnWidthRatios(props: props): number[] {
		let ratios = [];

		// 1. get a list of visible props
		let visibleProps: string[] = [];
		for(let col in props.columns) {
			// prop used for grouping: do not make a column
			if(props.columns[col].groupBy) { continue; }

			// this prop is visible
			visibleProps.push(col);
		}

		let widthSum = 0;
		let remainingColCount = visibleProps.length;

		// count cols and compute total width
		visibleProps.forEach(prop => {
			if(props.columns[prop].widthRatio) {
				widthSum += props.columns[prop].widthRatio;
				remainingColCount--;
			}
		});

		let widthMult = widthSum > 1 ? 1 / widthSum : 1;
		let remainingColWidth = Math.max(0, 1 - widthSum);

		// space remaining columns
		let i = 0;
		visibleProps.forEach(prop => {
			if(!props.columns[prop].widthRatio) {
				ratios[i++] = remainingColWidth / remainingColCount;
			} else {
				ratios[i++] = props.columns[prop].widthRatio * widthMult;
			}
		});

		return ratios;
	}
	
	render() {
		var baseclass = "item-table-list "
			+ (this.props.itemsInteractable ? "interactable " : "")
			+ (this.props.enableSorting ? "sortable " : "");

		let visible_props = [];
		let grouping_prop = null;
		// let sorting_prop = null

		for(let col in this.props.columns) {
			// prop used for grouping: do not make a column
			if(this.props.columns[col].groupBy) { grouping_prop = col; continue; }

			// this prop is visible
			// if(this.objectCardProps.columns[col].sort) { sorting_prop = col; }
			visible_props.push(col);
		}

		// generale table columns
		let i = 0;
		let tableCols: Column[] = visible_props.map(prop => {
			return {
				widthPixels: BASE_COL_WIDTH * this.state.columnsRelativeWidth[i++] * this.state.columnsRelativeWidth.length,
			};
		});

		// add checkbox col if necessary
		if (this.props.itemsSelectable) {
			tableCols.unshift({
				widthPixels: BASE_COL_WIDTH,
			})
		}

		let list_items = this.props.items.map((item, index) => Object.assign({ _index: index}, item));

		// filter items
		list_items = list_items.filter(item => {
			for(let filter in this.props.filters) {

				// the filter regexp we were given
				let filter_exp = this.props.filters[filter].toLowerCase();
				if (filter_exp === '') { continue; }

				// get the objectCardProps we need to filter
				let filtered_props = filter.split('|');

				// check if one of them matches
				let match = false;
				for(let i = 0; i < filtered_props.length; i++) {
					if(item[filtered_props[i]] === undefined || item[filtered_props[i]] == null) { continue; }

					let item_value = item[filtered_props[i]].toString().toLowerCase();
					if(item_value === filter_exp) { match = true; break; }
					else if(item_value.match(filter_exp)) { match = true; break; }
				}

				// no match on any prop checked: filter this item out
				if(!match) { return false; }
			}
			return true;
		});

		// sort items
		if(this.props.enableSorting && this.state.sortProp) {
			list_items = list_items.sort(Tools.getSortFunctionByProp(this.state.sortProp, this.state.reverseSort));
		}

		// group items
		if(grouping_prop) {
			let list_items_sorted = list_items.sort((item1, item2) => item1[grouping_prop] < item2[grouping_prop] ? -1 :
				(item1[grouping_prop] == item2[grouping_prop] ? 0 : 1));

			list_items = [];
			let current_group_value = null;

			// let's add group headers with the _groupValue prop
			list_items_sorted.forEach(item => {
				if(item[grouping_prop] != current_group_value) {
					current_group_value = item[grouping_prop];
					list_items.push({ _groupValue: current_group_value })
				}
				list_items.push(item);
			});
		}

		// generate rows
		let tableRows: Row[] = [];

		// header
		tableRows.push({
			cells: visible_props.map((prop, index, array) => {
				let content = this.props.columns[prop].label as any;
				let className = '';

				if (this.props.enableSorting) {
					content =
						<div className="flex-row" onClick={() => this.handleHeaderClick(prop)}>
							<div className="flex-col flex-center padding-s">
								<span className="sort-arrow sort-arrow-up">▲</span>
								<span className="sort-arrow sort-arrow-down">▼</span>
							</div>
							<div className="nowrap">{ this.props.columns[prop].label }</div>
							{
								this.props.columnsResizable && index < array.length -1 &&
								<DraggableFrame className="table-col-handle" cursor="col-resize" onDrag={this.handleColumnResize(index)} />
							}
						</div>;

					if (prop == this.state.sortProp && this.state.reverseSort) {
						className = 'sorting-rev';
					} else if (prop == this.state.sortProp && !this.state.reverseSort) {
						className = 'sorting';
					}
 				}

				return {
					content,
					className,
				};
			}),
			className: 'header-line',
			heightPixels: BASE_ROW_HEIGHT,
		});

		// add checkbox col if necessary
		if (this.props.itemsSelectable) {
			let isAllSelected = this.props.selectedIndices.length >= this.props.items.length && this.props.items.length > 0;

			tableRows[0].cells.unshift({
				content: this.props.onItemSelectAll ? <ToggleIcon
					value={isAllSelected}
					onChange={this.props.onItemSelectAll}
				/> : '',
				style: { flexGrow: 0 }
			});
		}

		// items
		tableRows = tableRows.concat(
			list_items.map((item, index) =>
				this.generateItemRow(item, visible_props, grouping_prop, index)
			)
		);

		// actions
		if (this.props.actions) {
			tableRows.push({
				cells: [{
					content: this.props.actions,
					colSpan: visible_props.length,
				}],
				className: 'action-bar',
				heightPixels: BASE_ROW_HEIGHT,
			})
		}

		// // handle generator
		// let columnHandlesGenerator = (colIndex: number, positioning: React.CSSProperties) => {
		// 	return <div className="table-col-handle" style={positioning} />;
		// };

		return (
			<ExtendedTable
				className={baseclass + (this.props.className || '')}
				tableColumns={tableCols}
				tableRows={tableRows}
				baseColWidth={BASE_COL_WIDTH}
				baseRowHeight={this.props.baseRowHeight}
				fixedRows={(this.props.fixedHeaders && !this.props.hideHeaders) ? 1 : 0}
			/>
		);

	}

}

(ItemTableList as any).defaultProps = {
	itemsInteractable: false,
	onItemClick: () => {},
	className: "",
	style: {},
	selectedIndices: [],
	baseRowHeight: BASE_ROW_HEIGHT,
	columnsResizable: true,
};