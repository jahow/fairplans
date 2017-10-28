import * as React from 'react';
import { Component } from 'react';


interface props {
	value: boolean,
	onChange?: (newValue: boolean) => any,

	size?: string,		// s, m, l
	//icon?: string,		// add, update, delete...
	content?: string,	// content to display
	label?: string,		// this text will be rendered on top of the button
	locked?: boolean,
	labelOnRight?: boolean,

	id?: string,
	className?: string,
	style?: Object,
}

interface state {
}


export default class ToggleIcon extends Component<props, state> {

	constructor(props) {
		super(props);

		this.handleClick = this.handleClick.bind(this);
	}

	handleClick(event) {
		if (this.props.onChange) { this.props.onChange(!this.props.value); }
	}

	render() {
		var baseclass = "toggle-icon " + (this.props.value ? "enabled" : "")
			+ " size-" + this.props.size;

		return (
			<div
				className={'toggle-icon-container flex-row flex-center '+(this.props.locked ? 'locked ' : '') + this.props.className}
				onClick={this.handleClick}>
				<div className={baseclass}>{ this.props.value ? this.props.content || '✔' : ''}</div>
				{
					this.props.label &&
					<div className={'toggle-icon-label ' + (this.props.labelOnRight ? 'on-right' : '')}>{this.props.label.toUpperCase()}</div>
				}
			</div>
		);
	}

}

(ToggleIcon as any).defaultProps = {
	size: 'm',
};
