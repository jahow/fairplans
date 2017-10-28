import * as React from 'react';
import { Component } from 'react';


interface props {
	label?: string,
	progress: number,
	id?: string,
	className?: string,
	style?: Object
}

interface state {
}


export default class ProgressBar extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
		};
	}

	handleClick(event) {
	}

	render() {
		let bar_style = {
			width: (this.props.progress * 100).toFixed(2)+"%"
		};

		return (
			<div className="progressbar">
				<div className="bar" style={bar_style} />
				<div className="text">{this.props.label}</div>
			</div>
		);
	}

}

(ProgressBar as any).defaultProps = {
	className: "",
	style: {}
};
