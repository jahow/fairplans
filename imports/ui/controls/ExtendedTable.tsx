import * as React from 'react';
import { Component } from 'react';


export interface Column {
	// widthRatio?: number,
	widthPixels?: number,
	className?: string,
}

export interface Row {
	cells: Cell[],
	className?: string,
	isHeader?: boolean,
	heightPixels?: number,
	onClick?: (row: Row, index: number) => any,		// TODO
	ref?: (element: any, lineIndex: number) => any,
}

export interface Cell {
	content: any | any[],
	rowSpan?: number,
	colSpan?: number,
	style?: Object,
	className?: string,
}

interface props {
	tableColumns: Column[],
	tableRows: Row[],		// a row is an array of cells
	baseColWidth: number,	// in pixels
	baseRowHeight?: number,	// pixels; required if complex table
	fixedColumns?: number,
	fixedRows?: number,
	enableScrollX?: boolean,
	// columnHandleObject?: (columnIndex: number, positioning: React.CSSProperties) => any,	// NOT USED

	id?: string,
	className?: string,
	style?: Object
}

interface state {
}

const SCROLLBAR_SIZE = 17;

export default class ExtendedTable extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
		};

		this.handleFreeCellsScroll = this.handleFreeCellsScroll.bind(this);
		this.handleFixedCellsWheel = this.handleFixedCellsWheel.bind(this);
	}

	// refs
	refs: any;

	componentDidMount() {
		if (this.refs.freeCells) {
			this.refs.freeCells.addEventListener('scroll', this.handleFreeCellsScroll);
		}
		if (this.refs.fixedRows) {
			this.refs.fixedRows.addEventListener('wheel', this.handleFixedCellsWheel);
		}
		if (this.refs.fixedCols) {
			this.refs.fixedCols.addEventListener('wheel', this.handleFixedCellsWheel);
		}
	}

	componentWillUnmount() {
		if (this.refs.freeCells) {
			this.refs.freeCells.removeEventListener('scroll', this.handleFreeCellsScroll);
		}
		if (this.refs.fixedRows) {
			this.refs.fixedRows.removeEventListener('wheel', this.handleFixedCellsWheel);
		}
		if (this.refs.fixedCols) {
			this.refs.fixedCols.removeEventListener('wheel', this.handleFixedCellsWheel);
		}
	}

	handleFreeCellsScroll(event) {
		//console.log("scrolling... ");
		if (this.refs.fixedRows) {
			this.refs.fixedRows.scrollLeft = this.refs.freeCells.scrollLeft;
		}
		if (this.refs.fixedCols) {
			this.refs.fixedCols.scrollTop = this.refs.freeCells.scrollTop;
		}
	}

	handleFixedCellsWheel(event) {
		if (this.refs.freeCells) {
			// TODO: IMPLEMENT SMOOTH SCROLLING HERE
			let newEvent = new CustomEvent('scroll', {
				detail: {},
			});
			this.refs.freeCells.scrollTop += event.deltaY;
			this.refs.freeCells.scrollLeft += event.deltaX;
			this.refs.freeCells.dispatchEvent(newEvent);
		}
	}

	renderCell(cell: Cell, rowIndex: number, colIndex: number, defaultHTML: boolean, tableWidth?: number, tableHeight?: number) {
		// get col&row info
		let colInfo = this.props.tableColumns[colIndex] || {} as Column;
		let rowInfo = this.props.tableRows[rowIndex];

		// attributes
		let attrs = {
			style: {},
			className: cell.className || '',
			colSpan: cell.colSpan,
			rowSpan: cell.rowSpan,
			key: 'col'+colIndex,
		} as any;

		// width
		let width = colInfo.widthPixels || this.props.baseColWidth;
		let height = rowInfo.heightPixels || this.props.baseRowHeight;
		attrs.style.minWidth = width;
		attrs.style.minHeight = height;
		attrs.style.width = width;
		attrs.style.height = height;

		// special: width ratio
		// if (colInfo.widthRatio) {
		// 	attrs.style.minWidth = colInfo.widthRatio + '%';
		// }

		// set flex grow
		attrs.style.flexGrow = width;
		attrs.style.flexBasis = 0;

		// set rel pos
		attrs.style.position = 'relative';

		// apply given style
		if (cell.style) { attrs.style = Object.assign(attrs.style, cell.style); }

		// class name
		attrs.className += ' table-cell';

		// not a default html table
		if (!defaultHTML) {
			// recompute width/height
			width = cell.colSpan > 1 ?
				this.computeWidth(colIndex, colIndex + cell.colSpan - 1) : width;
			height = cell.rowSpan > 1 ?
				this.computeHeight(rowIndex, rowIndex + cell.rowSpan - 1) : null;

			// adjust attributes
			attrs.colSpan = null;
			attrs.rowSpan = null;
			attrs.style.minWidth = width;
			attrs.style.minHeight = height;
			attrs.style.width = width;
			attrs.style.height = height;
			attrs.style.overflow = 'hidden';

			return (
				<div {...attrs}>
				{ cell.content || '\u00a0' }
				</div>
			);
		}

		// header: render th
		if (rowInfo.isHeader) {
			return (
				<th {...attrs}>
				{ cell.content }
				</th>
			);
		}

		// regular row
		return (
			<td {...attrs}>
			{ cell.content }
			</td>
		);
	}

	renderSimpleTable() {
		let style: React.CSSProperties = Object.assign({}, this.props.style);
		style.tableLayout = 'fixed';
		style.borderCollapse = 'initial';

		return (
			<table
				className={'extended-table width-100 ' + (this.props.className || '')}
				style={style}
				id={this.props.id}
			>
				<tbody>
				{
					// select rows
					this.props.tableRows.map((row, rowIndex) =>
						<tr
							className={'table-row ' + (row.className || '')}
							key={'row'+rowIndex}
							onClick={row.onClick ?
								() => row.onClick(row, rowIndex) : () => {}}
							ref={row.ref ? (el) => row.ref(el, rowIndex) : null}
						>
						{
							// select cells
							row.cells.map((cell, colIndex) =>
								this.renderCell(cell, rowIndex, colIndex, true))
						}
						</tr>
					)
				}
				</tbody>
			</table>
		);
	}

	getColumnCount() {
		let maxCount = 0;

		for (let i = 0; i < this.props.tableRows.length; i++) {
			maxCount = Math.max(maxCount, this.props.tableRows[i].cells.length);
		}

		return maxCount;
	}

	computeWidth(startCol: number, endCol: number) {
		let result = 0;

		for (let i = startCol; i <= endCol; i++) {
			let col = this.props.tableColumns[i];
			if (col && col.widthPixels) {
				result += col.widthPixels;
			} else {
				result += this.props.baseColWidth;
			}
		}

		return result;
	}

	computeHeight(startRow: number, endRow: number) {
		let result = 0;

		for (let i = startRow; i <= endRow; i++) {
			let row = this.props.tableRows[i];
			if (row && row.heightPixels) {
				result += row.heightPixels;
			} else {
				result += this.props.baseRowHeight;
			}
		}

		return result;
	}

	renderPartialTable(className: string, isScrollable: boolean, refName: string, startCol: number, endCol: number, startRow: number, endRow: number, growRight: boolean, growBottom: boolean) {
		// partial table has no width/height: render nothing
		if (startCol > endCol || startRow > endRow) { return null; }

		// compute pos
		let left = this.computeWidth(0, startCol-1);
		let top = this.computeHeight(0, startRow-1);

		// outer style
		let style = {
			position: 'absolute',
			left,
			top,
			right: !growRight ? 'auto' : (isScrollable ? 0 : SCROLLBAR_SIZE),
			bottom: !growBottom ? 'auto' : ((isScrollable || !this.props.enableScrollX) ? 0 : SCROLLBAR_SIZE),
			overflowX: isScrollable ? (this.props.enableScrollX  ? 'scroll' : 'auto') : 'hidden',
			overflowY: isScrollable ? 'scroll' : 'hidden',
		};

		// each row style
		let rowStyle = {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			height: this.props.baseRowHeight,
		};

		// generate an array of column indices where a handle will be placed
		// let columnHandles: number[] = [];
		// for (let i = startCol; i <= endCol && i < this.props.tableColumns.length; i++) {
		// 	columnHandles.push(i);
		// }

		return (
			<div className={className} style={style} ref={refName}>
			{
				// select rows
				this.props.tableRows.filter((row, rowIndex) =>
					rowIndex >= startRow && rowIndex <= endRow)
				.map((row, rowIndex) =>
					<div
						className={'table-row ' + (row.className || '')}
						key={'row'+rowIndex}
						style={Object.assign({}, rowStyle, row.heightPixels ? { height: row.heightPixels } : null)}
						onClick={row.onClick ? () => row.onClick(row, rowIndex) : () => {}}
					>
					{
						// select cells
						row.cells.filter((cell, colIndex) =>
							colIndex >= startCol && colIndex <= endCol)
						.map((cell, colIndex) =>
							this.renderCell(cell, startRow+rowIndex, startCol+colIndex, false))
					}
					</div>
				)
			}
			{
				// this.props.columnHandleObject &&
				// columnHandles.map(colIndex => {
				// 	let colStyle = {
				// 		position: 'absolute',
				// 		left: this.computeWidth(0, colIndex),
				// 		top: 0,
				// 		bottom: 0,
				// 	};
				// 	return this.props.columnHandleObject(colIndex, colStyle);
				// })
			}
			</div>
		);
	}

	render() {
		let maxRow = this.props.tableRows.length;
		let maxCol = this.getColumnCount();

		// SIMPLE TABLE
		// use standard HTML markup
		if (!this.props.fixedRows && !this.props.fixedColumns) {
			return this.renderSimpleTable();
		}

		// set position as relative for child objects
		let width = this.computeWidth(0, maxCol-1) + SCROLLBAR_SIZE;
		let height = this.computeHeight(0, maxRow-1) + (this.props.enableScrollX ? SCROLLBAR_SIZE : 0);
		let tableStyle = {
			position: 'relative',
			// minWidth: width,
			// minHeight: height,
			width,
			height,

			minWidth: '100%',	// used to adjust the table to the available space
			maxWidth: '100%',
		};

		// merge with additional style
		tableStyle = Object.assign(tableStyle, this.props.style);

		// TABLE WITH FIXED COL/ROW
		return (
			<div
				className={'extended-table ' + (this.props.className || '')}
				style={tableStyle}
				id={this.props.id}
			>
				{
					(this.props.fixedColumns > 0 && this.props.fixedRows > 0) && this.renderPartialTable(
						'fixed-corner',
						false,
						null,
						0, this.props.fixedColumns-1,
						0, this.props.fixedRows-1, false, false)
				}
				{
					(this.props.fixedColumns > 0) && this.renderPartialTable(
						'fixed-cols',
						false,
						'fixedCols',
						0, this.props.fixedColumns-1,
						this.props.fixedRows, maxRow, false, true)
				}
				{
					(this.props.fixedRows > 0) && this.renderPartialTable(
						'fixed-rows',
						false,
						'fixedRows',
						this.props.fixedColumns, maxCol,
						0, this.props.fixedRows-1, true, false)
				}
				{
					this.renderPartialTable(
						'free-cells',
						true,
						'freeCells',
						this.props.fixedColumns, maxCol,
						this.props.fixedRows, maxRow, true, true)
				}
			</div>
		);
	}

}

(ExtendedTable as any).defaultProps = {
	fixedColumns: 0,
	fixedRows: 0,
	baseColWidth: 20,
	baseRowHeight: 20,
};
