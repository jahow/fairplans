import * as React from 'react';
import { Component } from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import * as classnames from 'classnames';

import { Link } from 'react-router';


interface objectCardProps {
	onClick?: (any) => any,
	selected?: boolean,
	className?: string,
	style?: any,
	typeIcon?: string,
	linkTo?: string,
	seeThrough?: boolean,
	overlayOnHover?: boolean,		// if true, hover will not change background color but will add an overlay

	// drag source params
	draggable?: boolean,
	draggableType?: string,
	draggableObject?: any,

	// drop target params
	droppable?: boolean,
	droppableTypes?: string[],
	onDrop?: (draggedType: string, draggedObject: any) => any,

	// collected from drag'n'drop HOC
	isDragging?: boolean,
	connectDragSource?: (element: any) => any,
	isHovered?: boolean,
	isDropTarget?: boolean,
	connectDropTarget?: (element: any) => any,
}

interface state {

}

class ObjectInfoCard extends Component<objectCardProps, state> {

	renderCard() {
		let classes = classnames(
			'object-card',
			this.props.className,
			{
				'selected': this.props.selected,
				'interactable': this.props.linkTo != null || this.props.onClick != null || this.props.draggable || this.props.droppable,
				'droppable': this.props.isHovered,
				'clickable': this.props.onClick != null || this.props.draggable || this.props.linkTo != null,
				'with-icon': this.props.typeIcon ? true : false,
				'drop-target': this.props.droppable && this.props.isDropTarget,
				'see-through': this.props.seeThrough,
				'overlay-hover': this.props.overlayOnHover,
			});

		let contents = [
			this.props.typeIcon && <div key="1" className={'type-icon icon-'+this.props.typeIcon}></div>,
			this.props.children,
			<svg
				preserveAspectRatio="none"
				className="contour"
				key="2"
			>
				<rect
					x="2" y="2"
					strokeDasharray="10 20"
					fill="transparent"
					stroke="white"
					strokeWidth="4"
					rx="4" ry="4"
				/>
			</svg>,
			this.props.overlayOnHover && <div key="3" className="overlay" />
		];

		if (this.props.linkTo) {
			return (
				<Link
					to={this.props.linkTo}
					onClick={this.props.onClick}
					className={classes}
					style={this.props.style}
				>
					{ contents }
				</Link>
			);
		}

		return (
			<div
				className={classes}
				onClick={this.props.onClick}
				style={this.props.style}
			>
				{ contents }
			</div>
		);
	}

	renderDragSource() {
		if(this.props.draggable) {
			return this.props.connectDragSource(this.renderCard());
		}
		return this.renderCard();
	}

	render() {
		if(this.props.droppable) {
			return this.props.connectDropTarget(this.renderDragSource());
		}
		return this.renderDragSource();
	}
}


// drag and drop handlers

const dragEvents = {

	beginDrag(props: objectCardProps) {
		return props.draggableObject;
	},

	endDrag: function(props, monitor, component) {
		if (!monitor.didDrop()) {
			return;
		}

		let item = monitor.getItem();
		let dropResult = monitor.getDropResult();
	},

}

function dragCollect(connect, monitor) {
	return {
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging()
	};
}

const dropEvents = {

	hover(props, monitor, component) {

	},

	drop(props: objectCardProps, monitor, component: ObjectInfoCard) {
		if (monitor.didDrop()) {
			return;
		}

		props.onDrop(monitor.getItemType(), monitor.getItem());
	},
};


function dropCollect(connect, monitor) {
	return {
		connectDropTarget: connect.dropTarget(),
		isHovered: monitor.isOver(),
		isDropTarget: monitor.canDrop(),
	};
}

// using DragSource and DropTarget HOC
export default DragSource<objectCardProps>((props: objectCardProps) => (props.draggable && props.draggableType) || '', dragEvents, dragCollect)(
	DropTarget<objectCardProps>((props: objectCardProps) => (props.droppable && props.droppableTypes) || '', dropEvents, dropCollect)(
		ObjectInfoCard
	)
) as React.ComponentClass<objectCardProps>;