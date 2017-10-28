import * as React from 'react';
import { Component } from 'react';
import { createContainer } from 'meteor/react-meteor-data';
import * as classnames from 'classnames';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Tasks, Task, Projects, Project } from '../../../data/collections';
import { Employees, Employee } from '../../../data/collections';
import { QueryTools } from '../../../utils/tools';

import CloseButton from '../../controls/CloseButton';
import ItemBlockList from '../../controls/ItemBlockList';
import ObjectInfoCard from '../../widgets/ObjectInfoCard';
import TimeBudgetWidget from '../../widgets/TimeBudgetWidget';
import BillableStatus from '../../widgets/BillableStatus';
import ProjectList from '../../subviews/ProjectList';



interface props {
	opened: boolean,
	onOpen: () => any,
	onClose: () => any,

	// for expenses: assignment on projects
	showProjectsOnly?: boolean,

	currentUserId?: string,

	// from meteor
	tasks?: Task[],
	// projects?: Project[],
	projectIds?: string[],		// array of project ids
	// currentUserId?: string,
	employeeId?: string,
}

interface state {
	projectColors?: { color: string, id: string }[],
}

class TaskCatalog extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			projectColors: [],
		};

		this.computeColors(props.projectIds);

		this.renderTaskCard = this.renderTaskCard.bind(this);
		// this.renderProjectCard = this.renderProjectCard.bind(this);
	}
	
	_isMounted: boolean;

	componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	// on objectCardProps receive: recompute color of timecard
	componentWillReceiveProps(nextProps: props) {
		this.computeColors(nextProps.projectIds);
	}

	// compute colors for project ids 
	computeColors(projectIds: string[]) {
		if (!projectIds) { return; }

		// check if project ids are the same
		let sameProjects = true;
		for (let i = 0; i < projectIds.length; i++) {
			if (this.state.projectColors.findIndex(c => c.id == projectIds[i]) == -1) {
				sameProjects = false;
				break;
			}
		}
		if (sameProjects) { return; }

		Meteor.call('color.generate.batch', projectIds, (err, res) => {
			if (err) { console.error(err); return; }
			if (!this._isMounted) { return; }

			if (res.length == 0) { return; }

			this.setState({
				projectColors: res.map(c => {
					return {
						id: c.id,
						color: `#${c.color.r.toString(16)}${c.color.g.toString(16)}${c.color.b.toString(16)}`,
					};
				}),
			});
		});
	}

	renderTaskCard(task: Task) {
		let projectColor = this.state.projectColors.find(c => c.id == task.projectId);
		let usedHours = task.hoursApproved + task.hoursPlanned + task.hoursSubmitted + task.hoursAsDraft;
		let duration =task.baseDuration;
		if (task.hoursBudgetConstrained)
		{
			duration = Math.min(task.baseDuration, task.totalTime - usedHours);
		}
		
		return (
			<ObjectInfoCard
				typeIcon="task"
				key={task._id}
				className="flex-row flex-center flex-no-shrink"
				draggableType="task-card"
				draggable={true}
				draggableObject={{taskId: task._id, duration: duration}}
			>
				<svg className="background" viewBox="0, 0, 100, 1000" preserveAspectRatio="xMinYMax slice">
					<rect
						x="0"
						y="0"
						width="1000"
						height="1000"
						transform="rotate(15 0 1000) translate(60 0)"
						fill={(projectColor && projectColor.color) || 'transparent'}
					/>
				</svg>

				<div className="flex-col flex-grow pos-relative">
					<div className="nowrap">{task.name}</div>
					<div className="nowrap">
						<span className="light-text">Project: </span>
						{task.projectName}
					</div>
					<div className="nowrap small light-text">{task.partnerName} / {task.companyName}</div>
					<div className="nowrap small">
						<span className="light-text">{ i18n.__('Remaining hours') }: </span>
						{((task.totalTime - usedHours) || 0).toFixed(2)}
					</div>
				</div>

				<TimeBudgetWidget
					totalTime={task.totalTime}
					consumedTime={usedHours}
					size={50}
					billableStatus={true}
					className="flex-no-shrink pos-relative"
					showOvertime={true}
				/>

			</ObjectInfoCard>
		);
	}

	renderClosed() {
		return (
			<div className="task-catalog closed flex-col flex-start" onClick={this.props.onOpen}>
				<div className="font14">«</div>
				{
					!this.props.showProjectsOnly &&
					<div className="tab-label">{ i18n.__('Task Catalog').toUpperCase() }</div>
				}
				{
					this.props.showProjectsOnly &&
					<div className="tab-label">{ i18n.__('Project Catalog').toUpperCase() }</div>
				}
			</div>
		);
	}

	renderOpened() {
		return (
			<div className="task-catalog opened section padding-inner-gutter flex-col">
				<CloseButton onClick={this.props.onClose} bright={true} />

				{
					!this.props.showProjectsOnly &&
					<div className="title">{ i18n.__('Task Catalog') }</div>
				}
				{
					this.props.showProjectsOnly &&
					<div className="title">{ i18n.__('Project Catalog') }</div>
				}

				{
					!this.props.showProjectsOnly &&
					<ItemBlockList
						items={this.props.tasks}
						showSearchBar={true}
						searchProps={['name', 'projectName', 'partnerName']}
						itemTransform={this.renderTaskCard}
					/>
				}
				{
					this.props.showProjectsOnly &&
					<ProjectList
						enableDrag={true}
						columnCount={1}
						displayGroupButtons={false}
						displaySearchBar={true}
						compactMode={true}
						activeProjectsOnly={true}
					/>
				}
			</div>
		);
	}

	render() {
		if (this.props.opened) { return this.renderOpened(); }
		return this.renderClosed();
	}

}

export default createContainer((props: props) => {

	let userId = props.currentUserId || Meteor.userId();

	Meteor.subscribe('tasks.list', userId);
	Meteor.subscribe('projects.list', userId);
	Meteor.subscribe('employees.list');

	let tasks = Tasks.find(QueryTools.getTaskRestrictionQuery(userId)).fetch();
	// let projects = Projects.find().fetch();
	let projectIds = [];
	tasks.forEach(t => {
		if (projectIds.indexOf(t.projectId) == -1) {
			projectIds.push(t.projectId);
		}
	});
	let me = Employees.findOne({ userId }) || {} as Employee;

	return {
		tasks,
		// projects,
		projectIds,
		// currentUserId: Meteor.userId(),
		employeeId: me._id,
	};

}, TaskCatalog);