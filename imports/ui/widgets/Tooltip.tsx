import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Gateway } from 'react-gateway';
import * as classnames from 'classnames';

import { Tools } from '../../utils/tools';


interface props {
	text: string,
	// target: HTMLElement,
	// verticalAnchor?: 'top' | 'center' | 'bottom',
	// horizontalAnchor?: 'left' | 'center' | 'right',
	placement?: 'left' | 'right' | 'top' | 'bottom',

	id?: string,
	className?: string,
	style?: Object,

	containerId?: string,
	containerClassName?: string,
	containerStyle?: Object,
}
interface state {
	hovered?: boolean,
	targetElement?: HTMLElement,
}

export default class Tooltip extends Component<props, state> {
	constructor(props: props) {
		super(props);
		this.state = {

		};

		this.handleMouseOver = this.handleMouseOver.bind(this);
		this.handleMouseOut = this.handleMouseOut.bind(this);
		this.assignContainerRef = this.assignContainerRef.bind(this);
		this._container = null;
	}

	_container: HTMLElement;

	handleMouseOver(event) {
		this.setState({
			hovered: true,
			targetElement: this._container
		});
	}
	handleMouseOut(event) {
		this.setState({
			hovered: false,
			targetElement: null
		});
	}

	assignContainerRef(el) {
		this._container = el;
	}

	getPositionObject(props: props, targetRect: ClientRect): { placement: string, left?: number, top?: number } {
		let result: any = {
			placement: props.placement
		};

		// handle border cases
		/*
		if (targetRect.left < 140) {
			result.placement = 'right';
		}
		else if (targetRect.right > window.outerWidth - 140) {
			result.placement = 'left';
		}
		else if (targetRect.top < 140) {
			result.placement = 'bottom';
		}
		else if (targetRect.bottom > window.outerHeight - 140) {
			result.placement = 'top';
		}
		*/

		if (result.placement == 'left') {
			result.left = targetRect.left;
			result.top = (targetRect.top + targetRect.bottom) / 2;
		}
		else if (result.placement == 'right') {
			result.left = targetRect.right;
			result.top = (targetRect.top + targetRect.bottom) / 2;
		}
		else if (result.placement == 'top') {
			result.left = (targetRect.left + targetRect.right) / 2;
			result.top = targetRect.top;
		}
		else if (result.placement == 'bottom') {
			result.left = (targetRect.left + targetRect.right) / 2;
			result.top = targetRect.bottom;
		}

		return result;
	}

	render() {
		let tooltipStyle = null;
		let placement = this.props.placement;

		if (this.state.targetElement) {
			let rect = this.state.targetElement.getBoundingClientRect();
			tooltipStyle = Object.assign(this.props.style || {},
				this.getPositionObject(this.props, rect));
			placement = tooltipStyle.placement;
		}

		let containerClassName = classnames('tooltip-container', this.props.containerClassName);
		let tooltipClassName = classnames('tooltip-widget', this.props.className,
			'placement-' + placement,
			// 'anchor-v-' + this.props.verticalAnchor,
			// 'anchor-h-' + this.props.horizontalAnchor
		);

		let tooltipText = Tools.sanitizeHTML(
			this.props.text.replace(/\n/g, '<br/>')
				.replace(/{{/g, '<em>')
				.replace(/}}/g, '</em>')
			);

		return (
			<div
				id={this.props.containerId}
				className={containerClassName}
				style={this.props.containerStyle}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
				ref={this.assignContainerRef}
			>
				{ this.props.children }
				{
					this.state.hovered &&
					<Gateway into="tooltip">
						<div
							id={this.props.id}
							className={tooltipClassName}
							style={tooltipStyle}
							dangerouslySetInnerHTML={tooltipText}
						>
						</div>
					</Gateway>
				}
			</div>
		);
	}
}

(Tooltip as any).defaultProps = {
	className: '',
	// verticalAnchor: 'top',
	// horizontalAnchor: 'center',
	placement: 'top'
};