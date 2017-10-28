import * as React from 'react';
import { Component } from 'react';
import * as classnames from 'classnames';


interface props {
	onDrag?: (dX: number, dY: number, newX: number, newY: number, startX: number, startY: number, rect: ClientRect, element: HTMLElement) => any,
	onDragStart?: (x: number, y: number, rect: ClientRect) => any,
	onDragEnd?: (x: number, y: number, rect: ClientRect) => any,
	onWheel?: (dY: number, rect: ClientRect, element: HTMLElement) => any,
	cursor?: string,
	allowBubbledEvents?: boolean,

	id?: string,
	className?: string,
	style?: Object
}

interface state {
	dragged?: boolean,
}


export default class DraggableFrame extends Component<props, state> {

	constructor(props) {
		super(props);
		this.state = {
			dragged: false
		};

		this.handleMouseDown = this.handleMouseDown.bind(this);
		this.handleMouseMove = this.handleMouseMove.bind(this);
		this.handleMouseUp = this.handleMouseUp.bind(this);
		this.handleMouseWheel = this.handleMouseWheel.bind(this);
		this.handleEmptyEvent = this.handleEmptyEvent.bind(this);
	}

	_element: HTMLElement;
	_startX: number;
	_startY: number;
	_previousX: number;
	_previousY: number;

	// event handling
	handleMouseDown(event) {
		// the event is bubbling
		if (event.target != this._element && !this.props.allowBubbledEvents) {
			return;
		}

		this._startX = event.clientX;
		this._startY = event.clientY;
		this._previousX = event.clientX;
		this._previousY = event.clientY;

		this.setState({ dragged: true });

		// do something only if drag handlers defined
		if (this.props.onDragStart) {
			let rect = this._element.getBoundingClientRect();
			this.props.onDragStart(event.clientX, event.clientY, rect);
		}

		window.addEventListener("mousemove", this.handleMouseMove, true);
		window.addEventListener("mouseup", this.handleMouseUp, true);
	}
	handleMouseMove(event) {
		let rect = this._element.getBoundingClientRect();

		if (this.props.onDrag) {
			this.props.onDrag(
				event.clientX - this._previousX,
				event.clientY - this._previousY,
				event.clientX,
				event.clientY,
				this._startX,
				this._startY,
				rect, this._element);
		}

		this._previousX = event.clientX;
		this._previousY = event.clientY;

		event.preventDefault();
		event.stopPropagation();
	}
	handleMouseUp(event) {
		this.setState({ dragged: false });

		if (this.props.onDragEnd) {
			let rect = this._element.getBoundingClientRect();
			this.props.onDragEnd(event.clientX, event.clientY, rect);
		}

		window.removeEventListener("mousemove", this.handleMouseMove, true);
		window.removeEventListener("mouseup", this.handleMouseUp, true);

		event.preventDefault();
		event.stopPropagation();
	}

	handleMouseWheel(event) {
		// override event if handler defined
		if (this.props.onWheel) {
			let rect = this._element.getBoundingClientRect();

			this.props.onWheel(
				event.deltaY,
				rect, this._element);

			event.preventDefault();
			event.stopPropagation();
		}
	}

	handleEmptyEvent(event) {
		event.preventDefault();
		event.stopPropagation();
	}

	render() {
		let myStyle: any = {};
		if (this.props.cursor) {
			myStyle.cursor = this.props.cursor;
		}

		let className = classnames('draggable-frame', { dragged: this.state.dragged }, this.props.className);

		return (
			<div className={className}
				style={myStyle}
				onMouseDown={this.handleMouseDown}
				onWheel={this.handleMouseWheel}
				onClick={this.handleEmptyEvent}
				ref={el => this._element = el}>
				{ this.props.children }
			</div>
		);
	}

}
