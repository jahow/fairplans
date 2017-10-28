import * as React from 'react';
import { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { Meteor } from 'meteor/meteor';
import * as classnames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Tools, DateTools } from '../../../utils/tools';
import { DraggableTypes } from '../../../utils/constants';
import { UserEntryStatusList } from '../../../data/choicelists';
import { SynchronizationStatus } from '../../../data/collections';
import SyncStatus from '../../widgets/SyncStatus';


interface props {
	cardId: string,
	dayStart: number,
	dayEnd: number,
	start: number,
	end: number,

	renderHorizontal?: boolean,

	taskName?: string,
	partnerName?: string,
	projectName?: string,
	projectId?: string,
	note?: string,
	status?: number,
	isFuture?: boolean,
	cardColor?: string,		// CSS color

	repeating?: boolean,
	repeatingDays?: number[],
	isRepeatInstance?: boolean,

	// placeholder management
	placeholder?: boolean,
	placeholderMinDuration?: number,
	placeholderMaxDuration?: number,

	// user input
	onResize?: (timecardId: string, newStart: number, newEnd: number) => any,
	onResizePreview?: (timecardId: string, newStart: number, newEnd: number) => any,
	onResizePreviewEnd?: () => any,

	onNewTask?: (timecardId: string, taskId: string) => any,

	onSubmit?: (timecardId: string) => any,
	onApprove?: (timecardId: string) => any,
	onEdit?: (timecardId: string) => any,
	onDelete?: (timecardId: string) => any,
	onInstanceConfirm?: (timecardId: string) => any,

	canSubmit?: boolean,
	canApprove?: boolean,
	canEdit?: boolean,
	canDelete?: boolean,

	// sync status
	syncStatus?: SynchronizationStatus,
	syncComments?: string,

	//drag n drop
	isDragging?: boolean,
	isHovered?: boolean,
	connectDragSource?: (element: any) => any,
	connectDropTarget?: (element: any) => any,
}
interface state {
	isResizingStart?: boolean,
	isResizingEnd?: boolean,
	mouseRefX?: number,
	mouseRefY?: number,

	showActions?: boolean,

	// async computation
	//cardColor?: string,		// CSS color
}

class TimeCard extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
		};

		//this.computeCardColor(props.projectId);

		this.handleMouseOver = this.handleMouseOver.bind(this);
		this.handleMouseOut = this.handleMouseOut.bind(this);
		this.handleMouseDown = this.handleMouseDown.bind(this);
		this.handleMouseClick = this.handleMouseClick.bind(this);
		this.handleStartHandleMouseDown = this.handleStartHandleMouseDown.bind(this);
		this.handleEndHandleMouseDown = this.handleEndHandleMouseDown.bind(this);

		this.handleActionsMouseOver = this.handleActionsMouseOver.bind(this);
		this.handleActionsMouseOut = this.handleActionsMouseOut.bind(this);

		this.handleActionSubmit = this.handleActionSubmit.bind(this);
		this.handleActionApprove = this.handleActionApprove.bind(this);
		this.handleActionEdit = this.handleActionEdit.bind(this);
		this.handleActionDelete = this.handleActionDelete.bind(this);
		this.handleActionConfirm = this.handleActionConfirm.bind(this);

		this.handleGlobalMouseMove = this.handleGlobalMouseMove.bind(this);
		this.handleGlobalMouseUp = this.handleGlobalMouseUp.bind(this);
	}

	_card: HTMLElement;
	_isMounted: boolean;

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if display params have not changed: skip render
		if (nextProps.dayStart == this.props.dayStart &&
			nextProps.dayEnd == this.props.dayEnd &&
			nextProps.start == this.props.start &&
			nextProps.end == this.props.end &&
			nextProps.renderHorizontal == this.props.renderHorizontal &&
			nextProps.taskName == this.props.taskName &&
			nextProps.partnerName == this.props.partnerName &&
			nextProps.projectName == this.props.projectName &&
			nextProps.projectId == this.props.projectId &&
			nextProps.note == this.props.note &&
			nextProps.status == this.props.status &&
			nextProps.isFuture == this.props.isFuture &&
			nextProps.isDragging == this.props.isDragging &&
			nextProps.isHovered == this.props.isHovered &&
			nextProps.cardColor == this.props.cardColor &&
			nextProps.syncStatus == this.props.syncStatus &&
			nextProps.syncComments == this.props.syncComments &&
			nextProps.placeholderMinDuration == this.props.placeholderMinDuration &&
			nextProps.placeholderMaxDuration == this.props.placeholderMaxDuration &&
			nextState.isResizingStart == this.state.isResizingStart &&
			nextState.isResizingEnd == this.state.isResizingEnd &&
			nextState.showActions == this.state.showActions) {
			return false;
		}

		return true;
	}

	// on objectCardProps receive: recompute color of timecard
	componentWillReceiveProps(nextProps: props) {
		//if (nextProps.projectId != this.props.projectId) {
		//	this.computeCardColor(nextProps.projectId);
		//}
	}

	componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}


	// HELPERS

	// computes new times (not verified) from the mouse movement
	getResizedTimes(mouseDeltaX, mouseDeltaY, resizingEnd) {
		let rect = this._card.getBoundingClientRect();
		let size = this.props.renderHorizontal ? rect.width : rect.height;

		// new duration computation
		let sizeMod = (this.props.renderHorizontal ? mouseDeltaX : mouseDeltaY);
		if (!resizingEnd) { sizeMod = -sizeMod; }
		let newDuration = (this.props.end - this.props.start) * (1 + sizeMod / size);

		// start/end modification
		let newStart = this.props.start;
		let newEnd = this.props.end;

		if (resizingEnd) {
			newEnd = newStart + newDuration;
		} else {
			newStart = newEnd - newDuration;
		}

		return { start: newStart, end: newEnd };
	}


	// INPUT HANDLERS
	// user actions are given to the parent using callbacks in objectCardProps

	handleMouseOver(event) {
		// this.objectCardProps.handleMouseOver(event, this.objectCardProps.cardId);
	}
	handleMouseOut(event) {
		// this.objectCardProps.handleMouseOut(event, this.objectCardProps.cardId);
	}
	handleMouseDown(event) {
		// this.objectCardProps.handleMouseDown(event, this.objectCardProps.cardId);
	}
	handleMouseClick(event) {
		// this.objectCardProps.handleMouseClick(event, this.objectCardProps.cardId);
	}
	handleStartHandleMouseDown(event) {
		this.setState({
			isResizingStart: true,
			isResizingEnd: false,
			mouseRefX: event.clientX,
			mouseRefY: event.clientY,
		});

		window.addEventListener("mousemove", this.handleGlobalMouseMove);
		window.addEventListener("mouseup", this.handleGlobalMouseUp);

		event.preventDefault();
		return false;
	}
	handleEndHandleMouseDown(event) {
		this.setState({
			isResizingEnd: true,
			isResizingStart: false,
			mouseRefX: event.clientX,
			mouseRefY: event.clientY,
		});

		window.addEventListener("mousemove", this.handleGlobalMouseMove);
		window.addEventListener("mouseup", this.handleGlobalMouseUp);

		event.preventDefault();
		return false;
	}
	handleActionsMouseOver(event) {
		this.setState({
			showActions: true,
		});
	}
	handleActionsMouseOut(event) {
		// check if we went on a child element
        if (event.relatedTarget.parentNode == event.currentTarget) {
           return;
        }

		this.setState({
			showActions: false,
		});
	}


	// TIMECARD ACTIONS
	handleActionSubmit() {
		this.props.onSubmit && this.props.onSubmit(this.props.cardId);
	}
	handleActionApprove() {
		this.props.onApprove && this.props.onApprove(this.props.cardId);
	}
	handleActionEdit() {
		this.props.onEdit && this.props.onEdit(this.props.cardId);
	}
	handleActionDelete() {
		this.props.onDelete && this.props.onDelete(this.props.cardId);
	}
	handleActionConfirm() {
		this.props.onInstanceConfirm && this.props.onInstanceConfirm(this.props.cardId);
	}


	// GLOBAL MOUSE EVENTS

	handleGlobalMouseMove(event) {
		// compute the delta from initial click
		var diffX = event.clientX - this.state.mouseRefX;
		var diffY = event.clientY - this.state.mouseRefY;

		// send back resize info to the parent
		if (this.state.isResizingEnd || this.state.isResizingStart) {
			let newTimes = this.getResizedTimes(diffX, diffY, this.state.isResizingEnd);
			this.props.onResizePreview(this.props.cardId, newTimes.start, newTimes.end);
		}

		event.preventDefault();
		event.stopPropagation();
	}
	handleGlobalMouseUp(event) {
		// compute the delta from initial click
		var diffX = event.clientX - this.state.mouseRefX;
		var diffY = event.clientY - this.state.mouseRefY;

		// send back resize info to the parent
		if (this.state.isResizingEnd || this.state.isResizingStart) {
			let newTimes = this.getResizedTimes(diffX, diffY, this.state.isResizingEnd);
			this.props.onResizePreviewEnd();
			this.props.onResize(this.props.cardId, newTimes.start, newTimes.end);
		}

		this.setState({
			isResizingStart: false,
			isResizingEnd: false,
			mouseRefX: 0,
			mouseRefY: 0,
		});

		window.removeEventListener("mousemove", this.handleGlobalMouseMove);
		window.removeEventListener("mouseup", this.handleGlobalMouseUp);
	}


	// RENDERING

	renderInner() {
		var length = this.props.end - this.props.start;

		var startRatio = (this.props.start-this.props.dayStart)/(this.props.dayEnd-this.props.dayStart);
		var sizeRatio = (length)/(this.props.dayEnd-this.props.dayStart);
		var containerStyles: any;

		if (this.props.renderHorizontal) {
			containerStyles = {
				left: startRatio*100 + "%",
				width: sizeRatio*100 + "%",
				top: "",
				height: "",
			};
		} else {
			containerStyles = {
				top: startRatio*100 + "%",
				height: sizeRatio*100 + "%",
				left: "",
				width: "",
			};
		}

		// only render a placeholder (card is being moved elsewhere)
		if(this.props.isDragging) {
			return (
				<div></div>
			);
		}
		else if(this.props.placeholder) {
			let duration = this.props.end - this.props.start;
			let invalid = duration > this.props.placeholderMaxDuration || duration < this.props.placeholderMinDuration;

			return (
				<div className={'time-card-container placeholder ' + (invalid ? 'invalid' : '')} style={containerStyles}>
                    <div className="time-badge start">{ DateTools.convertTimeNumberToString(this.props.start) }</div>
                    <div className="time-badge end">{ DateTools.convertTimeNumberToString(this.props.end) }</div>
                </div>
			);
		}

		// has any actions
		let hasActions = this.props.canDelete || this.props.canApprove || this.props.canEdit || this.props.canSubmit;

		var containerClasses = classnames('time-card-container', {
			'future': this.props.isFuture,
			'locked': !hasActions,
            'resized': this.state.isResizingStart || this.state.isResizingEnd,
            'hovered': this.props.isHovered,
            'temporary': this.props.isRepeatInstance,
		});
		// var cardClasses = classnames('time-card', { 'active': isFocused });

		// card status
		let status = this.props.isFuture ? i18n.__('planned') :
			(UserEntryStatusList.find(s => s.value == (this.props.status || 0)) || {} as any).label;

		// list of repeat days
		let repeatDays = '';
		if (this.props.repeating) {
			this.props.repeatingDays.sort().forEach(d => {
				if (repeatDays != '') { repeatDays += ', '; }
				repeatDays += moment().day(d).format('ddd').toLowerCase();
			});
		}

		return (
			<div
				className={containerClasses}
				style={containerStyles}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>
                <div className="time-badge start">{ DateTools.convertTimeNumberToString(this.props.start) }</div>
                <div className="time-badge end">{ DateTools.convertTimeNumberToString(this.props.end) }</div>

				<svg className="background" viewBox="0, 0, 100, 1000" preserveAspectRatio="xMinYMax slice">
					<rect
						x="0"
						y="0"
						width="1000"
						height="1000"
						transform="rotate(15 0 1000) translate(20 0)"
						fill={this.props.cardColor || 'transparent'}
					/>
				</svg>

				<div
					className="time-card"
					onMouseDown={this.handleMouseDown}
					onClick={this.handleMouseClick}
					ref={el => this._card = el}
				>

					<div className="body">
					
						<div className="task font12">{this.props.taskName}</div>
						<div className="customer">
							<span className="small secondary">❭ </span>{this.props.partnerName}
							<span className="small secondary"> ❭ </span>{this.props.projectName}
						</div>
						{
							this.props.repeating && <div className="nowrap">
								<span className="secondary">Repeats on </span>{ repeatDays }
							</div>
						}
						{
							/*this.props.isRepeatInstance && <div className="nowrap">
								<span className="secondary">{ i18n.__('(temporary repeat instance)') }</span>
							</div>*/
						}
						<div className="note">{ Tools.printHTMLText(this.props.note) }</div>
					</div>

					<div className="footer">
						<div className="state">{status}</div>
						{/*<div className="billable">X</div>*/}
					</div>

					<div className="start handle" onMouseDown={this.handleStartHandleMouseDown}>
					</div>
					<div className="end handle" onMouseDown={this.handleEndHandleMouseDown}>
					</div> 

					{
						!this.state.showActions && hasActions &&
						<div className="actions">
							<div className="show" onMouseOver={this.handleActionsMouseOver}></div>
						</div>
					}

					{
						this.state.showActions &&
						<div className="actions" onMouseOut={this.handleActionsMouseOut}>

							{ this.props.isRepeatInstance &&
								<div
									className="submit"
									onMouseOut={Tools.PropagationPreventor}
									onClick={this.handleActionConfirm}>
									<span>{ i18n.__('create') }</span>
								</div>
							}

							{ this.props.canSubmit &&
								<div
									className="submit"
									onMouseOut={Tools.PropagationPreventor}
									onClick={this.handleActionSubmit}>
									<span>{ i18n.__('submit') }</span>
								</div>
							}
							{ this.props.canApprove &&
								<div
									className="approve"
									onMouseOut={Tools.PropagationPreventor}
									onClick={this.handleActionApprove}>
									<span>{ i18n.__('approve') }</span>
								</div>
							}
							{ this.props.canEdit &&
								<div
									className="edit"
									onMouseOut={Tools.PropagationPreventor}
									onClick={this.handleActionEdit}>
									<span>{ i18n.__('edit') }</span>
								</div>
							}
							{ this.props.canDelete &&
								<div
									className="delete"
									onMouseOut={Tools.PropagationPreventor}
									onClick={this.handleActionDelete}>
									<span>{ i18n.__('delete') }</span>
								</div>
							}
						</div>
					}

					{
						this.props.repeating && <i className="material-icons" style={{ position: 'absolute', top: 0, right: 0, opacity: 0.4}}>autorenew</i>
					}

				</div>

				{
					this.props.syncStatus !== undefined &&
					this.props.syncStatus != SynchronizationStatus.NOT_RELEVANT &&
					<SyncStatus
						status={this.props.syncStatus}
						tooltip={this.props.syncComments}
						size={16} />
				}
			</div>
		);
	}

	render() {
		// do not allow drag if 
		if (this.props.isRepeatInstance) {
			return this.props.connectDropTarget(this.renderInner());
		}

		return this.props.connectDragSource(this.props.connectDropTarget(this.renderInner()));
	}

}

// timecards are a drag source (drag on different day) and drop target (receive new task)

// specification for the drag source
// this component is 'stupid': it does not interact with the data structure
// the day span container will take care of handling the drop consequences
const dragEvents = {
	beginDrag(props) {
		return {
			duration: props.end - props.start,
			timecardId: props.cardId
		};
	},
	endDrag: function(props, monitor, component) {
		if (!monitor.didDrop()) {
			return;
		}
		var item = monitor.getItem();
		var dropResult = monitor.getDropResult();
	}
};

function dragCollect(connect, monitor) {
	return {
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging()
	};
}

const dropEvents = {

	hover(props, monitor, component) {

	},

	drop(props: props, monitor, component: TimeCard) {
		if (monitor.didDrop()) {
			return;
		}

		// new task assignment
		if (props.onNewTask) {
			props.onNewTask(props.cardId, monitor.getItem().taskId);
		}
	},

	canDrop(props: props, monitor) {
		// cannot drop if we're not on our timetable
		if (!props.canEdit) { return false; }

		return true;
	},
};


function dropCollect(connect, monitor) {
	return {
		connectDropTarget: connect.dropTarget(),
		isHovered: monitor.isOver({ shallow: true }) && monitor.canDrop(),
		// isDropTarget: monitor.canDrop(),
	};
}

// using DragSource HOC
export default DropTarget<props>('task-card', dropEvents, dropCollect)(
	DragSource<props>('time-card', dragEvents, dragCollect)(TimeCard)
) as React.ComponentClass<props>;