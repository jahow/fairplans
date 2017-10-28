import * as React from 'react';
import { Component } from 'react';
import * as DatePicker from 'react-datepicker';
import * as moment from 'moment';
import * as classnames from 'classnames';


interface props {
	// input types (default: text)
	inputType?: 'text' | 'number' | 'password' | 'select' | 'date' | 'time',

	// this is the value of the input
	value?: any,
	isControlled?: boolean,		// if not controlled, the input will handle its content on its own; defaults to true

	// input label (hidden if null)
	label?: string,

	// various properties
	required?: boolean,		// simply change the appearance
	name?: string,			// used when sending back value (optional)
	placeholder?: string,	// text displayed when the input is empty
	editable?: boolean,		// default: false
	receiveNewValue?: (newVal: any, name?: string) => any,

	// appearance
	overlayRight?: string,
	overlayLeft?: string,
	seeThrough?: boolean,

	// confirm mode: a small prompt will ask the user to confirm value save
	// value will only be sent back to the parent when the user confirms
	confirmNewValue?: boolean,

	// not functional yet
	// autoResize?: boolean,

	// select input only
	valuesList?: (any | {value: any, label: string})[],
	showAllValues?: boolean,

	// text only
	multiline?: boolean,
	baseLineCount?: number,
	autoHeightAdjust?: boolean,

	// numeric/date values restriction
	min?: number | Date | moment.Moment,
	max?: number | Date | moment.Moment,
	step?: number, 

	// date only
	isStartDate?: boolean,
	isEndDate?: boolean,
	dateRangeEnd?: Date | moment.Moment,
	dateRangeStart?: Date | moment.Moment,

	id?: string,
	className?: string,
	style?: Object,
	innerRef?: (el: HTMLElement) => any,
}

interface state {
	currentValue?: any;
}


export default class FormInput extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			currentValue: this.getValidValue(props.value, props),
		};

		this.handleInputValueChange = this.handleInputValueChange.bind(this);
		this.handleDateValueChange = this.handleDateValueChange.bind(this);
		this.handleTimeHoursValueChange = this.handleTimeHoursValueChange.bind(this);
		this.handleTimeMinutesValueChange = this.handleTimeMinutesValueChange.bind(this);
		this.handleFocus = this.handleFocus.bind(this);
		this.handleBlur = this.handleBlur.bind(this);
		this.handleConfirmValue = this.handleConfirmValue.bind(this);
		this.handleRevertValue = this.handleRevertValue.bind(this);
	}

	_element: any;

	componentWillReceiveProps(newProps: props) {
		// the input is not controlled: do not interfere with state
		if (!newProps.isControlled) { return; }

		let newValue = this.getValidValue(newProps.value, newProps);

		// new value different from current one: change state
		if(newValue !== this.state.currentValue) {
			this.setState({ currentValue: newValue });
		}
	}

	handleInputValueChange(event) {
		let newVal = event.target.value;

		// special treatment for selects
		if (this.props.inputType == 'select') {
			let index = event.target.selectedIndex;
			if (this.props.placeholder) { index--; }
			let newVal = index >= 0 ? this.props.valuesList[index] : null;
			if (newVal && newVal.value !== undefined) { newVal = newVal.value; }
		}

		// send back a number
		if (this.props.inputType == 'number') {
			newVal = event.target.valueAsNumber;
		}

		// send back a Date object
		else if (this.props.inputType == 'date') {
			newVal = event.target.valueAsDate;
		}

		// input is not controlled: change our state
		if (!this.props.isControlled || this.props.confirmNewValue) {
			this.setState({ currentValue: newVal });
		}

		// send back new value
		if(this.props.receiveNewValue && !this.props.confirmNewValue) {
			this.props.receiveNewValue(newVal, this.props.name);
		}
	}

	handleDateValueChange(moment: moment.Moment) {
		let newDate = moment !== null ? moment.toDate() : null;

		// input is not controlled: change our state
		if (!this.props.isControlled || this.props.confirmNewValue) {
			this.setState({ currentValue: newDate });
		}

		// send back new value
		if(this.props.receiveNewValue && !this.props.confirmNewValue) {
			this.props.receiveNewValue(newDate, this.props.name);
		}
	}

	handleTimeHoursValueChange(event) {
		let newVal = event.target.valueAsNumber;
		let newTime = (this.state.currentValue % 1) + newVal;

		// input is not controlled: change our state
		if (!this.props.isControlled || this.props.confirmNewValue) {
			this.setState({ currentValue: newTime });
		}

		// send back new value
		if(this.props.receiveNewValue && !this.props.confirmNewValue) {
			this.props.receiveNewValue(newTime, this.props.name);
		}
	}

	handleTimeMinutesValueChange(event) {
		let newVal = event.target.valueAsNumber;
		let newTime = Math.floor(this.state.currentValue) + newVal / 60;

		// input is not controlled: change our state
		if (!this.props.isControlled || this.props.confirmNewValue) {
			this.setState({ currentValue: newTime });
		}
		
		// send back new value
		if(this.props.receiveNewValue && !this.props.confirmNewValue) {
			this.props.receiveNewValue(newTime, this.props.name);
		}
	}

	handleBlur(event) {
		// not used yet
	}

	handleFocus(event) {
		// not used yet
	}

	handleConfirmValue() {
		if(this.props.receiveNewValue) {
			this.props.receiveNewValue(this.state.currentValue, this.props.name);
		}
	}

	handleRevertValue() {
		this.setState({ currentValue: this.props.value || null });
	}

	// for select inputs
	renderOption(entry, index) {
		let value = entry.value === undefined ? entry : entry.value;
		let label = entry.label === undefined ? entry : entry.label;
		let classname = value === this.state.currentValue ? "selected" : "";

		return (<option className={classname} value={value} key={index}>{label}</option>);
	}

	// will return a correct value for the current type and output an error if required
	getValidValue(rawValue: any, props: props): any {
		let newValue = rawValue;

		// if we're a select: look for a valid value
		if (props.inputType == 'select') {
			newValue = this.getSelectValidValue(newValue, props.valuesList)
		}

		// if null or empty compute default value according to type
		if (newValue === null || newValue === undefined) {
			switch (props.inputType) {
				case 'text':
				case 'password':
					newValue = ''; break;
				case 'number':
				case 'time':
					newValue = null; break;
				case 'date':
					newValue = null; break;
			}
		}

		// number : make sure we have a number
		if (props.inputType == 'number' || props.inputType == 'time') {
			if (newValue !== undefined && newValue !== null && !(typeof newValue === 'number')) {
				console.error('The value given to a FormInput of type \'number\' or \'time\' is not a number.');
			}
		}

		// date : convert to moment if necessary & make sure we have a valid datez
		if (props.inputType == 'date' && newValue !== undefined && newValue !== null) {
			if (moment.isMoment(newValue) && newValue.isValid()) {
				newValue = newValue.toDate();
			}
			if (!(newValue instanceof Date)) {
				console.error('The value given to a FormInput of type \'date\' is not a valid date.');
			}
		}

		return newValue;
	}

	// for select inputs; to make sure our current value is valid
	getSelectValidValue(value: any, valuesList: any[]) {
		// values validity check
		if (valuesList.filter(v => v === null || v === undefined || v === '' || (v.label && v.value === null) || (v.label && v.value === undefined) || (v.label && v.value === '')).length > 0) {
			console.error('A null or undefined or empty string value has been given as props to a FormInput of type \'select\'.');
		}

		let validValue: any = value;
		let found = valuesList.find(v => (v === validValue || v.value === validValue));

		// invalid value! return empty string (=> placeholder)
		if (!found) {
			return '';
		}

		if (validValue.value !== undefined) {
			validValue = validValue.value;
		} else {
			return validValue;
		}
	}

	render() {
		let currentValue = this.state.currentValue;
		let inputFilled = currentValue !== null && currentValue !== '';

		let className = classnames('form-input', 'flex-col', {
			editable: this.props.editable,
			'see-through': this.props.seeThrough,
			'elastic-height': this.props.multiline && this.props.autoHeightAdjust,
			'required-ok': this.props.required && inputFilled,
			'required-notok': this.props.required && !inputFilled,
		}, this.props.className, 'type-' + this.props.inputType);

		let lineCount = Math.floor(this.props.baseLineCount);
		if(!lineCount || lineCount <= 1) { lineCount = 1; }

		let refAssignment = (el: HTMLElement) => {
			this._element = el;
			if (this.props.innerRef) { this.props.innerRef(el); }
		};

		let displayConfirm = currentValue !== this.props.value;

		let overlayLeft = this.props.overlayLeft;
		let overlayRight = this.props.overlayRight;

		// default overlay for date
		if (this.props.inputType == 'date' && !overlayRight) {
			overlayRight = '📅';
		}
		// hide overlay if date was selected
		if (this.props.inputType == 'date' && currentValue !== null && this.props.editable && !this.props.required) {
			overlayRight = null;
		}

		// start/end dates
		let startDate = null;
		if (this.props.dateRangeStart) {
			startDate = this.props.dateRangeStart instanceof Date ? moment(this.props.dateRangeStart) : this.props.dateRangeStart;
			if (!moment.isMoment(startDate)) {
				console.error('An invalid start date was supplied to a FormInput element.');
			}
		}
		let endDate = null;
		if (this.props.dateRangeEnd) {
			endDate = moment(this.props.dateRangeEnd);
			if (!moment.isMoment(endDate) || !endDate.isValid()) {
				console.error('An invalid end date was supplied to a FormInput element.');
			}
		}
		let highlightDates = [];
		if (this.props.isStartDate) { highlightDates.push(endDate); }
		else if (this.props.isEndDate) { highlightDates.push(startDate); }

		return (
			<div
				className={className}
				style={this.props.style}
			>

			{
				this.props.label &&
				<span className="input-label">{ this.props.label }</span>
			}

			{		
				// TEXT (MULTILINE)	
				this.props.inputType == 'text' && this.props.multiline &&
				<textarea
					id={this.props.id}
					name={this.props.name}
					ref={refAssignment}
					value={this.state.currentValue}
					onFocus={this.handleFocus}
					onBlur={this.handleBlur}
					onChange={this.handleInputValueChange}
					disabled={!this.props.editable}
					placeholder={this.props.placeholder}
					rows={lineCount}
				/>
			}
			{
				// TEXT (SINGLE LINE) AND PASSWORD
				((this.props.inputType == 'text' && !this.props.multiline) || this.props.inputType == 'password') &&
				<input
					id={this.props.id}
					name={this.props.name}
					ref={refAssignment}
					type={this.props.inputType}
					value={currentValue}
					onFocus={this.handleFocus}
					onBlur={this.handleBlur}
					onChange={this.handleInputValueChange}
					disabled={!this.props.editable}
					placeholder={this.props.placeholder}
					min={this.props.min as number}
					max={this.props.max as number}
					step={this.props.step}
				/>
			}

			{			
				// DATE
				this.props.inputType == 'date' &&
				<DatePicker
					onChange={this.handleDateValueChange}
					disabled={!this.props.editable}
					placeholderText={this.props.placeholder}
					selected={this.state.currentValue !== null ? moment(this.state.currentValue) : null}
					showMonthDropdown
					showYearDropdown
					minDate={this.props.min instanceof Date ? moment(this.props.min as Date) : undefined}
					maxDate={this.props.max instanceof Date ? moment(this.props.min as Date) : undefined}
					selectsStart={this.props.isStartDate}
					selectsEnd={this.props.isEndDate}
					startDate={startDate}
					endDate={endDate}
					isClearable={!this.props.required && this.props.editable}
					highlightDates={highlightDates}
				/>
			}

			{
				// NUMBER
				this.props.inputType == 'number' &&
				<input
					id={this.props.id}
					name={this.props.name}
					ref={refAssignment}
					type={this.props.inputType}
					value={currentValue}
					onFocus={this.handleFocus}
					onBlur={this.handleBlur}
					onChange={this.handleInputValueChange}
					disabled={!this.props.editable}
					placeholder={this.props.placeholder}
					min={this.props.min as number}
					max={this.props.max as number}
					step={this.props.step}
				/>
			}

			{
				// TIME
				this.props.inputType == 'time' &&
				<div ref={refAssignment} id={this.props.id} className="flex-row flex-center flex-start">
					<input
						name={this.props.name + '-hours'}
						type="number"
						value={Math.floor(currentValue)}
						onFocus={this.handleFocus}
						onBlur={this.handleBlur}
						onChange={this.handleTimeHoursValueChange}
						disabled={!this.props.editable}
						placeholder={this.props.placeholder}
						min={0}
						max={23}
						step={1}
					/>
					<span className="secondary">&nbsp;:&nbsp;</span>
					<input
						name={this.props.name + '-minutes'}
						type="number"
						value={Math.round((currentValue % 1) * 60)}
						onFocus={this.handleFocus}
						onBlur={this.handleBlur}
						onChange={this.handleTimeMinutesValueChange}
						disabled={!this.props.editable}
						step={this.props.step || 1}
					/>
				</div>
			}

			{
				// SELECT
				this.props.inputType == 'select' &&
				<select
					size={this.props.showAllValues && this.props.valuesList.length}
					id={this.props.id}
					name={this.props.name}
					ref={refAssignment}
					onFocus={this.handleFocus}
					onBlur={this.handleBlur}
					onChange={this.handleInputValueChange}
					disabled={!this.props.editable}
					value={this.state.currentValue}
				>
				{
					this.props.placeholder && <option value="">{this.props.placeholder}</option>
				}
				{
					this.props.valuesList.map((entry, index) => this.renderOption(entry, index))
				}
				</select>
			}

			{
				// OVERLAYS
				overlayLeft &&
				<div className="overlay left">{overlayLeft}</div>
			}
			{
				overlayRight &&
				<div className="overlay right">{overlayRight}</div>
			}
			{
				// CONFIRM MODE
				this.props.confirmNewValue && displayConfirm &&
				<div className="confirm-overlay">
					<div className="content">
						<div className="button small action-dostuff" onClick={this.handleConfirmValue}>save</div>
						<div className="button small action-cancel" onClick={this.handleRevertValue}>revert</div>
					</div>
				</div>
			}
			</div>
		);
	}

}

(FormInput as any).defaultProps = {
	inputType: 'text',
	valuesList: [],
	fieldName: null,
	editable: false,
	style: {},
	isControlled: true,
};