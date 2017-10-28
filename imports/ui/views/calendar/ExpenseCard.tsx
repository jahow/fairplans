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


interface props {
	expenseId: string,

	renderHorizontal?: boolean,

	expenseTypeName?: string,
	partnerName?: string,
	projectName?: string,
	projectId?: string,
	note?: string,
	status?: number,
	isFuture?: boolean,
	placeholder?: boolean,

	onNewProject?: (expenseId: string, projectId: string) => any,

	onSubmit?: (expenseId: string) => any,
	onApprove?: (expenseId: string) => any,
	onEdit?: (expenseId: string) => any,
	onDelete?: (expenseId: string) => any,

	canSubmit?: boolean,
	canApprove?: boolean,
	canEdit?: boolean,
	canDelete?: boolean,

	//drag n drop
	isDragging?: boolean,
	isHovered?: boolean,
	connectDragSource?: (element: any) => any,
	connectDropTarget?: (element: any) => any,
}
interface state {
	showActions?: boolean,

	// async computation
	cardColor?: string,		// CSS color
}

class ExpenseCard extends Component<props, state> {

	constructor(props: props) {
		super(props);

		this.state = {
		};

		this.computeCardColor(props.projectId);

		this.handleMouseOver = this.handleMouseOver.bind(this);
		this.handleMouseOut = this.handleMouseOut.bind(this);
		this.handleMouseDown = this.handleMouseDown.bind(this);
		this.handleMouseClick = this.handleMouseClick.bind(this);

		this.handleActionsMouseOver = this.handleActionsMouseOver.bind(this);
		this.handleActionsMouseOut = this.handleActionsMouseOut.bind(this);

		this.handleActionSubmit = this.handleActionSubmit.bind(this);
		this.handleActionApprove = this.handleActionApprove.bind(this);
		this.handleActionEdit = this.handleActionEdit.bind(this);
		this.handleActionDelete = this.handleActionDelete.bind(this);
	}

	_card: HTMLElement;
	_isMounted: boolean;

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// if display params have not changed: skip render
		if (nextProps.renderHorizontal == this.props.renderHorizontal &&
			nextProps.expenseTypeName == this.props.expenseTypeName &&
			nextProps.partnerName == this.props.partnerName &&
			nextProps.projectName == this.props.projectName &&
			nextProps.projectId == this.props.projectId &&
			nextProps.note == this.props.note &&
			nextProps.status == this.props.status &&
			nextProps.isFuture == this.props.isFuture &&
			nextProps.isDragging == this.props.isDragging &&
			nextProps.isHovered == this.props.isHovered &&
			nextState.cardColor == this.state.cardColor &&
			nextState.showActions == this.state.showActions) {
			return false;
		}

		return true;
	}

	// on objectCardProps receive: recompute color of ExpenseCard
	componentWillReceiveProps(nextProps: props) {
		if (nextProps.projectId != this.props.projectId) {
			this.computeCardColor(nextProps.projectId);
		}
	}

	componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}


	// HELPERS

	computeCardColor(projectId: string) {
		if (!projectId) { return; }
		// if (this.objectCardProps.projectId == projectId) { return; }	// already set

		Meteor.call('color.generate', projectId, (err, res) => {
			if (err) { console.error(err); return; }
			if (!this._isMounted) { return; }

			this.setState({
				cardColor: `#${res.r.toString(16)}${res.g.toString(16)}${res.b.toString(16)}`,
			});
		});
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

	handleActionsMouseOver(event) {
		// console.log('mouse over');
		this.setState({
			showActions: true,
		});
	}
	handleActionsMouseOut(event) {
		// console.log('mouse out');
		// console.dir(event.nativeEvent);
		// check if we went on a child element
        if (event.relatedTarget.parentNode == event.currentTarget) {
           return;
        }

		this.setState({
			showActions: false,
		});
	}


	// ACTIONS
	handleActionSubmit() {
		this.props.onSubmit && this.props.onSubmit(this.props.expenseId);
	}
	handleActionApprove() {
		this.props.onApprove && this.props.onApprove(this.props.expenseId);
	}
	handleActionEdit() {
		this.props.onEdit && this.props.onEdit(this.props.expenseId);
	}
	handleActionDelete() {
		this.props.onDelete && this.props.onDelete(this.props.expenseId);
	}


	// GLOBAL MOUSE EVENTS

	// unused


	// RENDERING

	render() {
		var containerStyles: any;

		if (this.props.renderHorizontal) {
			containerStyles = {
			};
		} else {
			containerStyles = {
			};
		}

		// only render a placeholder (card is being moved elsewhere)
		if(this.props.isDragging) {
			return (
				<div></div>
			);
		}
		else if(this.props.placeholder) {
			return (
				<div className="expense-card-container placeholder" style={containerStyles}></div>
			);
		}

		// has any actions
		let hasActions = this.props.canDelete || this.props.canApprove || this.props.canEdit || this.props.canSubmit;

		var containerClasses = classnames('expense-card-container', {
			'future': this.props.isFuture,
			'locked': !hasActions,
		});
		var cardClasses = classnames('expense-card', {
			'active': this.props.isHovered,
		});

		// card status
		let status = this.props.isFuture ? i18n.__('planned') :
			(UserEntryStatusList.find(s => s.value == (this.props.status || 0)) || {} as any).label;

		return this.props.connectDragSource(this.props.connectDropTarget(
			<div
				className={containerClasses}
				style={containerStyles}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			>

				<svg className="background" viewBox="0, 0, 100, 1000" preserveAspectRatio="xMinYMax slice">
					<rect
						x="0"
						y="0"
						width="1000"
						height="1000"
						transform="rotate(15 0 1000) translate(20 0)"
						fill={this.state.cardColor || 'transparent'}
					/>
				</svg>

				<div
					className={cardClasses}
					onMouseDown={this.handleMouseDown}
					onClick={this.handleMouseClick}
					// style={cardStyles}
					ref={el => this._card = el}
				>

					<div className="body">
						<div className="task font12">
							{Tools.capitalize(this.props.expenseTypeName) || i18n.__('Undefined')}
						</div>
						<div className="customer">
							<span className="small secondary">❭ </span>{this.props.partnerName}
							<span className="small secondary"> ❭ </span>{this.props.projectName}
						</div>
						<div className="note">{Tools.printHTMLText(this.props.note)}</div>
					</div>

					<div className="footer">
						<div className="state">{status}</div>
						{/*<div className="billable">X</div>*/}
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
					
				</div>

			</div>
		));
	}

}

// ExpenseCards are draggable! and a drop target for projects

// specification for the drag source
// this component is 'stupid': it does not interact with the data structure
// the day span container will take care of handling the drop consequences
const dragEvents = {
	beginDrag(props) {
		return {
			expenseId: props.expenseId
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

	drop(props: props, monitor, component: ExpenseCard) {
		if (monitor.didDrop()) {
			return;
		}

		// new task assignment
		if (props.onNewProject) {
			props.onNewProject(props.expenseId, monitor.getItem().projectId);
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
export default DropTarget<props>('project-card', dropEvents, dropCollect)(
	DragSource<props>('expense-card', dragEvents, dragCollect)(ExpenseCard)
) as React.ComponentClass<props>;