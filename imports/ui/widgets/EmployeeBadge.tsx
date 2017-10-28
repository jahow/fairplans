import * as React from 'react';
import { Component } from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import { Meteor } from 'meteor/meteor';
import * as classnames from 'classnames';

import Tooltip from './Tooltip';


interface props {
	employeeName: string,
	additionalInfo?: string,
	size?: number,
	showStatus?: 'approved' | 'pending',

	// drag source params
	draggable?: boolean,
	draggableType?: string,
	draggableObject?: any,

	// collected from drag'n'drop HOC
	isDragging?: boolean,
	connectDragSource?: (element: any) => any,

	// TODO: employee picture

	id?: string,
	className?: string,
	style?: Object,
}
interface state {
}

// TODO: put in a better place
const WORKDAY_DURATION = 8;

class EmployeeBadge extends Component<props, state> {
	renderInner() {
		let style = {
			height: this.props.size,
			width: this.props.size,
		};
		let outerStyle = Object.assign(this.props.style || {}, style);

		let tooltip = '{{' + this.props.employeeName + '}}';
		if (this.props.additionalInfo) { tooltip += '\n' + this.props.additionalInfo; }

		let className = classnames('employee-badge',
			this.props.className || '',
			this.props.showStatus ? 'status-' + this.props.showStatus : '',
			{
				interactable: this.props.draggable,
			});

		return (
			<div className={className} id={this.props.id} style={outerStyle}>
				<Tooltip text={tooltip} containerStyle={style} />
			</div>
		);
	}

	render() {
		if(this.props.draggable) {
			return this.props.connectDragSource(this.renderInner());
		}

		return this.renderInner();
	}
}

(EmployeeBadge as any).defaultProps = {
	size: 24,
};


// DRAG & DROP HANDLING

const dragEvents = {

	beginDrag(props: props) {
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

export default DragSource<props>((props: props) => (props.draggable && props.draggableType) || '', dragEvents, dragCollect)(
	EmployeeBadge
) as React.ComponentClass<props>;