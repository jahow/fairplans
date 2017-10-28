import * as React from 'react';
import { Component } from 'react';


interface props {
	position?: string,
	bright?: boolean,
	onClick: () => any,
	id?: string,
	className?: string,
	style?: Object
}

interface state {
}


export default class CloseButton extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
		};
	}

	handleClick(event) {
	}

	render() {
		return (
			<div className={'close-button ' + this.props.position + ' ' + this.props.className} style={this.props.style}>
				<span
					className={'overlay-button ' + (this.props.bright ? 'bright' : '')}
					aria-hidden="true"
					onClick={this.props.onClick}>×</span>
			</div>
		);
	}

}

(CloseButton as any).defaultProps = {
	position: "topright",
	bright: false,
	className: "",
	style: {}
};
