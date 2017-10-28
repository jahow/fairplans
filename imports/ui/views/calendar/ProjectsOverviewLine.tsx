import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Project, Projects, Timecard, Timecards, Tasks, Task, Employees, Employee } from '../../../data/collections';
import { DateTools } from '../../../utils/tools';
import Tooltip from '../../widgets/Tooltip';


type SpanType = 'days' | 'weeks' | 'months';

// TODO: put this somewhere else!!!
const ONE_SPAN_WIDTH = 80;		// %

// css constant
const PROJECT_BOX_HEIGHT = 18;


interface props {
	employeeId: string,
	timelinePosition: number,
	spanSize: number,		// in days

	// reactive data
	timecards?: Timecard[],
	projects?: Project[],
	tasks?: Task[],
	subReady?: boolean,
}

interface state {
	// project colors
	projectColors?: { [id: string]: string };	// CSS color
}

class ProjectsOverviewLine extends Component<props, state> {

	constructor(props: props) {
		super(props);
		this.state = {
			projectColors: {},
		};

		this.computeColors(props);
	}

	_isMounted: boolean;

	componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	componentWillReceiveProps(nextProps: props) {
		this.computeColors(nextProps);
	}

	// compute colors for project ids 
	computeColors(props: props) {
		if (!props.projects.length) { return; }

		// check if project ids are the same
		let sameProjects = true;
		for (let i = 0; i < props.projects.length; i++) {
			if (!this.state.projectColors[props.projects[i]._id]) {
				sameProjects = false;
				break;
			}
		}
		if (sameProjects) { return; }

		let projectIds = props.projects.map(p => p._id);

		Meteor.call('color.generate.batch', projectIds, (err, res) => {
			if (err) { console.error(err); return; }
			if (!this._isMounted) { return; }
			if (res.length == 0) { return; }

			let projectColors = {};
			res.forEach(c => projectColors[c.id] = `#${c.color.r.toString(16)}${c.color.g.toString(16)}${c.color.b.toString(16)}`);

			this.setState({
				projectColors,
			});
		});
	}

	getSpanType(): SpanType {
		let type: SpanType = 'days';
		if (this.props.spanSize > 150) { type = 'months'; }
		else if (this.props.spanSize > 30) { type = 'weeks'; }
		return type;
	}

	getMarkLabelBySpanType(currentMoment: moment.Moment, spanType: SpanType): string {
		let label = '';
		switch (spanType) {

			case 'days': label = currentMoment.format('ddd DD');
			break;

			case 'weeks':
			let firstDay = moment(currentMoment).startOf('week');
			// label = `${i18n.__('week')} ${currentMoment.format('W')} (${firstDay.format('ddd DD')})`;
			label = `${i18n.__('week')} ${currentMoment.format('ww')}`;
			break;
			
			case 'months': label = currentMoment.format('MMMM YYYY');
			break;
		}
		return label;
	}

	render() {
		// if (!this.props.subReady) {
		// 	return <div></div>;
		// }

		// first evaluate span type: day/week/month
		let spanType = this.getSpanType();

		// each box represents a project; length is expressed for span type (month, week, day...)
		// rank is vertical position (0, 1, 2...)
		// spanindex is for internal use (link between span & project box)
		let projectBoxes: { projectId: string, label: string, relativePosition: number, start: moment.Moment, length: number, rank: number, spanIndex: number, taskIds: string[] }[] = [];

		// time marks
		let primaryMarks: { relativePosition: number, label: string, isToday?: boolean, isoDate: string, }[] = [];
		let secondaryMarks: { relativePosition: number, label: string }[] = [];
		let beginMoment = DateTools.getMomentFromTimelinePosition(this.props.timelinePosition - this.props.spanSize * 50 / ONE_SPAN_WIDTH);
		let endMoment = DateTools.getMomentFromTimelinePosition(this.props.timelinePosition + this.props.spanSize * 50 / ONE_SPAN_WIDTH);
		let currentMoment = moment(beginMoment).startOf(spanType);

		// scan the whole span to set marks and generate project blocks
		let previousLabel = "";
		let nextMoment: moment.Moment;
		let previousProjectIds: string[] = [];
		let i = 0;
		let maxRank = 0;
		while(currentMoment.isBefore(endMoment)) {
			nextMoment = moment(currentMoment).add(1, spanType);

			// this position is used for project boxes & time marks
			let relativePosition =  DateTools.getTimelinePositionFromMoment(currentMoment) - this.props.timelinePosition;

			let currentTimecards = this.props.timecards
				.filter(card => card.projectId && currentMoment.isSameOrBefore(card.date) && nextMoment.isAfter(card.date));

			// project boxes: get cards for this step, get project ids & keep unique ids
			let currentProjectIds = currentTimecards
				.map(card => card.projectId)
				.filter((id, index, array) => array.indexOf(id) == index)
				.sort();

			let currentTasksIds = currentTimecards
				.map(card => card.taskId)
				.filter((id, index, array) => array.indexOf(id) == index)
				.sort();

			// occupation for this span
			let ranksOccupation = [];

			// if project id was present in previous span: increment length; otherwise add new box
			// first pass: extend previous boxes
			currentProjectIds.forEach(projectId => {
				let rank = 0;

				// a project box already exist: we'll mark its rank as still occupied here
				if (previousProjectIds.indexOf(projectId) > -1) {
					let prevBlock = projectBoxes.find(box => box.spanIndex == i - box.length && box.projectId == projectId);
					if (prevBlock) {
						prevBlock.length++;
						rank = prevBlock.rank;

						// add tasks & remove dupes
						prevBlock.taskIds = prevBlock.taskIds.concat(currentTasksIds).filter((id, index, array) => array.indexOf(id) == index);
					}

					maxRank = Math.max(rank, maxRank);
					ranksOccupation[rank] = true;
				} 
			});

			// second pass: add new boxes
			currentProjectIds.forEach(projectId => {
				let rank = 0;

				// add project box
				if (previousProjectIds.indexOf(projectId) == -1) {
					// look for a free rank
					while (ranksOccupation[rank]) { rank++; }

					projectBoxes.push({
						projectId,
						label: (this.props.projects.find(p => p._id == projectId) || { name: '(unknown)' } as any).name,
						start: moment(currentMoment),
						relativePosition,
						length: 1,
						rank: rank,
						spanIndex: i,
						taskIds: currentTasksIds
					});

					maxRank = Math.max(rank, maxRank);
					ranksOccupation[rank] = true;
				}
			});


			// save ids for later comparison
			previousProjectIds = currentProjectIds;

			// time marks
			primaryMarks.push({
				relativePosition,
				label: this.getMarkLabelBySpanType(currentMoment, spanType),
				isoDate: currentMoment.toISOString(),
				isToday: currentMoment.isSame(Date.now(), spanType),
			});

			// secondary mark (only if label changed)
			if (spanType != 'months') {
				let secondaryLabel = currentMoment.format('MMMM YYYY');
				if (secondaryLabel != previousLabel) {
					previousLabel = secondaryLabel;
					secondaryMarks.push({
						relativePosition,
						label: secondaryLabel,
					});
				}
			}

			// go to next span
			i++;
			currentMoment.add(1, spanType);
		}

		// the relative width of one span in %
		let spanWidth = ONE_SPAN_WIDTH / this.props.spanSize;

		return(
			<div className="calendar-overview-line flex-col flex-end">

				<div className="project-boxes-container" style={{ height: (maxRank + 1) * PROJECT_BOX_HEIGHT }}>
				{
					projectBoxes.map((box, index) => {
						let left = ONE_SPAN_WIDTH * 0.5 * box.relativePosition / (this.props.spanSize / 2);
						let startPos = DateTools.getTimelinePositionFromMoment(box.start);
						let endPos = DateTools.getTimelinePositionFromMoment(box.start.add(box.length, spanType));
						let width = ONE_SPAN_WIDTH * (endPos - startPos) / this.props.spanSize;
						let tasks = `{{${i18n.__('Tasks')}:}}`;
						box.taskIds.forEach(taskId => {
							let task = this.props.tasks.find(t => t._id == taskId);
							if (task) {
								tasks += '\n' + task.name;
							}
						})

						return <Tooltip
							text={tasks}
							containerClassName="project-box nowrap"
							key={'box' + box.projectId + 'start' + startPos.toFixed(2)}
							containerStyle={{ left: `${left}%`, bottom: `${box.rank}em`, width: `${width}%`,
								backgroundColor: this.state.projectColors[box.projectId] }}>
							<span>{ box.label.toUpperCase() }</span>
						</Tooltip>;
					})
				}
				</div>

				<div className="time-marks-container">
				{
					primaryMarks.map((mark, index) => 
						<div className={'time-mark ' + (mark.isToday ? 'today' : '')} key={'mark' + mark.isoDate}
							style={{ left: `${ONE_SPAN_WIDTH * 0.5 * mark.relativePosition / (this.props.spanSize / 2)}%` }}>
							{ mark.label.toUpperCase() }
						</div>
					)
				}
				{
					secondaryMarks.map((mark, index) => {
						let left = ONE_SPAN_WIDTH * 0.5 * mark.relativePosition / (this.props.spanSize / 2);
						left = Math.max(left, -50);
						return <div className="time-mark secondary" key={'secmark' + mark.label}
							style={{ left: `${left}%` }}>
							{ mark.label.toUpperCase() }
						</div>
					})
				}
				</div>

			</div>
		);
	}
}

export default createContainer<props>((props: props) => {
	// lookup employee
	let employee = Employees.findOne(props.employeeId);
	if (!employee) {
		return;
	}

	// sub to timecards by this employee
	let sub = Meteor.subscribe('timecards.user.overview', { userId: employee.userId });

	return {
		timecards: Timecards.find({ userId: employee.userId }).fetch(),
		projects: Projects.find().fetch(),
		tasks: Tasks.find().fetch(),
		subReady: sub.ready(),
	};

}, ProjectsOverviewLine);