import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Employee, Employees, EmployeeGroup, EmployeeGroups } from '../../../data/collections'
import { DateTools } from '../../../utils/tools'
import DraggableFrame from '../../controls/DraggableFrame';
import { CalendarSpanType } from '../CalendarView';
import { Utils as EmployeeUtils } from '../../subviews/EmployeeManagementLists';
import ProjectsOverviewLine from './ProjectsOverviewLine';
import Spinner from '../../widgets/Spinner';


const ONE_SPAN_WIDTH = 80;		// %

interface props {
	setTimelinePosition: (newPos: number, held?: boolean) => any,
	setSpanType: (newSpanSize: number) => any,
	timelinePosition: number,
	spanType: CalendarSpanType,

	// reactive data
	employees?: Employee[],
	employeeGroups?: EmployeeGroup[],
	subReady?: boolean,
}

interface state {
	selectedGroupId?: string,
}

class ProjectsOverview extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
		};

		this.handleBackdropDrag = this.handleBackdropDrag.bind(this);
		this.handleBackdropDragEnd = this.handleBackdropDragEnd.bind(this);
		this.handleBackdropWheel = this.handleBackdropWheel.bind(this);
		this.handleGroupSelect = this.handleGroupSelect.bind(this);
	}

	shouldComponentUpdate(nextProps: props, nextState: state) {
		// TODO
		return true;
	}

	// group selection
	handleGroupSelect(groupId: string) {
		this.setState({
			selectedGroupId: groupId
		})
	}

	// drag&wheel handlers
	handleBackdropDrag(dX: number, dY: number, newX: number, newY: number, startX: number, startY: number, rect: ClientRect, element: HTMLElement) {
		let unitPerPx = 100 / rect.width / ONE_SPAN_WIDTH;

		if (typeof this.props.spanType == 'number') {
			unitPerPx *= (this.props.spanType as number) * 0.5;
		}

		this.props.setTimelinePosition(this.props.timelinePosition - dX * unitPerPx, true);

		// scroll element based on dY
		element.scrollTop -= dY;
	}
	handleBackdropDragEnd() {
		this.props.setTimelinePosition(this.props.timelinePosition, false);
	}
	handleBackdropWheel(dY: number, rect: ClientRect, element: HTMLElement) {
		this.props.setSpanType((this.props.spanType as number) * (1 + dY * 0.001));
	}


	// RENDERING

	render() {
		if (typeof this.props.spanType != 'number') {
			throw new Meteor.Error("span type is not a number");
		}

		if(!this.props.subReady) {
			return <div className="width-100 flex-col flex-center">
				<Spinner />
			</div>;
		}

		// filter by group
		let filteredEmployees = this.props.employees;
		if (this.state.selectedGroupId) {
			let currentGroup = this.props.employeeGroups.find(g => g._id == this.state.selectedGroupId);
			if (currentGroup) {
				filteredEmployees = this.props.employees.filter(e => currentGroup.assignedMembers.indexOf(e._id) > -1);
			}
		}

		return (
			<DraggableFrame className="projects-overview width-100 flex-col scroll-y-only" cursor="move"
				onDrag={this.handleBackdropDrag}
				onDragEnd={this.handleBackdropDragEnd}
				onWheel={this.handleBackdropWheel}
				allowBubbledEvents={true}>
				<div className="margin-center-v">
					{
						filteredEmployees.map(e => {
							const groups = EmployeeUtils.getGroups(e, this.props.employeeGroups);

							return <div className="width-100" key={e._id}>
								<div className="flex-row flex-center flex-start no-select no-events">
									<div className="spacer-col large" />
									{ e.lastName }, { e.firstName }
									<div className="spacer-col" />
									{
										groups.map(g =>
											<pre className="inline" key={g._id}>
												{g.name}
											</pre>
										)
									}
								</div>
								<ProjectsOverviewLine
									employeeId={e._id}
									timelinePosition={this.props.timelinePosition}
									spanSize={this.props.spanType as number}
								/>
								<div className="spacer-row" />
							</div>
						})
					}

					<div className="group-filter button-bar">
						<span>{ i18n.__('Select which group to show') }:</span>
						<div className={'button ' + (this.state.selectedGroupId == null ? 'selected' : '')}
							key={'all'} onClick={() => this.handleGroupSelect(null)}>
							{ i18n.__('ALL') }
						</div>
						{
							this.props.employeeGroups.map(group =>
								<div className={'button ' + (this.state.selectedGroupId == group._id ? 'selected' : '')}
									key={group._id} onClick={() => this.handleGroupSelect(group._id)}>
									{ group.name.toUpperCase() }
								</div>)
						}
					</div>

				</div>
			</DraggableFrame>
		);
	}

}

export default createContainer<props>((props: props) => {
	let sub = Meteor.subscribe('employees.management');
	let employees = Employees.find().fetch();
	let employeeGroups = EmployeeGroups.find().fetch();

	// filter employees to only contain ours (not managers!)
	employees = employees.filter(e => {
		for (let i = 0; i < employeeGroups.length; i++) {
			if (employeeGroups[i].assignedMembers.indexOf(e._id) > -1) {
				return true;
			}
		}
		return false;
	});

	return {
		employees,
		employeeGroups,
		subReady: sub.ready(),
	};

}, ProjectsOverview);