import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { Projects, Project, ProjectStatus } from '../../data/collections';
import { ProjectStatusList } from '../../data/choicelists';

import FormInput from '../controls/FormInput';
import ObjectInfoCard from '../widgets/ObjectInfoCard';
import Spinner from '../widgets/Spinner';
import { QueryTools } from '../../utils/tools';

import { TAPi18n as i18n } from 'meteor/tap:i18n';


interface props {
	compactMode?: boolean,
	enableDrag?: boolean,
	enableDrop?: boolean,
	onDrop?: (project: Project, type: string, object: any) => any,
	enableLinks?: boolean,

	projects: Project[],
	projectIds: string[],
	subReady?: boolean,

	// filters
	companyCodeFilter?: string,
	partnerCodeFilter?: string,
	productCodeFilter?: string,
	memberIdFilter?: string,
	groupIdFilter?: string,
	activeProjectsOnly?: string,

	columnCount?: number,
	displayGroupButtons?: boolean,
	displaySearchBar?: boolean,

	id?: string,
	className?: string,
	style?: Object,
}
interface state {
	searchText?: string,
	groupByProp?: string,

	// reactive
	projectColors?: { color: { r: number, g: number, b: number }, id: string }[],
}


class ProjectList extends Component<props, state> {

	constructor(props) {
		super(props);

		this.state = {
			searchText: '',
			groupByProp: '',
			projectColors: [],
		};

		this.computeColors(props.projectIds);

		this.setSearchText = this.setSearchText.bind(this);
		this.groupBy = this.groupBy.bind(this);
	}

	_element: HTMLInputElement;
	_isMounted: boolean;

	componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

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

	setSearchText(new_val: string) {
		this.setState({
			searchText: new_val
		});
	}

	groupBy(prop_name?: string) {
		if(this.state.groupByProp == prop_name || !prop_name) {
			this.setState({
				groupByProp: ''
			});
		} else {
			this.setState({
				groupByProp: prop_name
			});
		}
	}

	getSeparatorLabel(project: Project): string {
		switch(this.state.groupByProp) {

			case 'companyCode':
				// let company = this.objectCardProps.companies.find(c => c.code == project.companyCode) || {} as any;
				return i18n.__('Company') + ': '+ (project.companyName || i18n.__('none'));

			case 'partnerCode':
				// let partner = this.objectCardProps.partners.find(p => p.code == project.partnerCode
					// && p.companyCode == project.companyCode) || {} as any;
				return i18n.__('Customer' )+ ': ' + (project.partnerName || i18n.__('none'));

			case 'projectStatus':
				return i18n.__('Status') + ': ' + (this.getProjectStatusLabel(project.projectStatus) || i18n.__('none'));

			default: return '';
		}
	}

	getProjectStatusLabel(value): string {
		return (ProjectStatusList.find(s => s.value == value) || {} as any).label;
	}

	render() {

		// filter project list
		// TODO: move filter logic to CreateContainer
		let projectsList = this.props.projects.filter(project => {
			// filters
			if (this.props.companyCodeFilter && project.companyCode != this.props.companyCodeFilter) {
				return false;
			}
			if (this.props.partnerCodeFilter && project.partnerCode != this.props.partnerCodeFilter) {
				return false;
			}
			if (this.props.groupIdFilter && (!project.assignedGroups || project.assignedGroups.indexOf(this.props.groupIdFilter) == -1)) {
				return false;
			}
			// if (this.objectCardProps.memberIdFilter &&
			// 	!(
			// 		(project.assignedMembers && project.assignedMembers.indexOf(this.objectCardProps.memberIdFilter) > -1) ||
			// 		(project.assignedManagers && project.assignedManagers.indexOf(this.objectCardProps.memberIdFilter) > -1)
			// 	)) {
			// 	return false;
			// }
			if (this.props.activeProjectsOnly &&
				(project.projectStatus == ProjectStatus.CANCELED ||
				project.projectStatus == ProjectStatus.CLOSED)) {
				return false;
			}
			// TODO: product used in project

			if (this.state.searchText) {

				// filter by search text
				if((project.name || '').toUpperCase().indexOf(this.state.searchText.toUpperCase()) != -1) { return true; }
				if((project.partnerName || '').toUpperCase().indexOf(this.state.searchText.toUpperCase()) != -1) { return true; }

				return false;
			}

			return true;
		}) as any;

		// sort by name
		projectsList = projectsList.sort((p1, p2) => p1.name < p2.name ? -1 : (p1.name == p2.name ? 0 : 1));

		// group by
		if(this.state.groupByProp) {

			let projects_list_temp = [];
			let current_val = undefined;
			let prop_name = this.state.groupByProp;

			// sort with this prop first
			projectsList = projectsList.sort((p1, p2) => p1[prop_name] < p2[prop_name] ? -1 : (p1[prop_name] == p2[prop_name] ? 0 : 1));

			// add separators
			projectsList.forEach(project => {
				if(project[prop_name] != current_val) {
					current_val = project[prop_name];
					projects_list_temp.push({
						_separator: this.getSeparatorLabel(project)
					});
				}
				projects_list_temp.push(project);
			});

			projectsList = projects_list_temp;
		}

		// SPLIT PROJECT LIST IN ROWS FOR DISPLAY

		let projectRows = [];	// each element is a row
		let rowIndex = 0;
		let indexInRow = 0;
		projectsList.forEach((project, index) => {
			// let rowIndex = Math.floor(index / this.objectCardProps.columnCount);
			let row = projectRows[rowIndex];	// there is spacing on odd rows

			// add row
			if (row === undefined) {

				// spacing
				if (projectRows.length > 0) {
					projectRows.push(null);
					rowIndex++;
				}

				row = [];
				projectRows.push(row);
			}

			// we're on a separator row: add spacing and fill row
			if (project._separator) {
				// add spacing before separator (only if there was something in the row)
				let missingCount = this.props.columnCount - indexInRow;
				for (let i=0; i < missingCount && indexInRow > 0; i++ ) {
					if (row.length > 0) { row.push(null); }
					row.push('padding');
				}

				// add separator row
				projectRows.push(null);
				projectRows.push([ project ]);

				// skip 2 rows
				indexInRow = 0;
				rowIndex += 3;
				return;
			}

			// spacing
			if (row.length > 0) {
				row.push(null);
			}

			// add project
			row.push(project);
			indexInRow++;

			// if end of row OR separator row: go to next row
			if (indexInRow == this.props.columnCount) {
				indexInRow = 0;
				rowIndex++;
			}
		});

		// fill last row with padding if necessary
		if (projectRows.length > 0) {
			let lastRow = projectRows[projectRows.length - 1];
			let missingCount = this.props.columnCount - indexInRow;
			for (let i=0; i < missingCount && indexInRow > 0; i++ ) {
				if (lastRow.length > 0) { lastRow.push(null); }
				lastRow.push('padding');
			}
		}

		return (
			<div
				className={'project-list section-container flex-col '+(this.props.className || '')}
				id={this.props.id}
				style={this.props.style}
			>
				{
					this.props.displaySearchBar &&
					<div className="flex-row flex-no-shrink flex-center">
						<div className="flex-grow text-right light-text no-select">
							{ i18n.__('Search') }
						</div>
						<div className="spacer-col" />
						<FormInput
							overlayRight="🔎"
							className="width-40"
							receiveNewValue={this.setSearchText}
							editable={true}
						/>
					</div>
				}
				{
					this.props.displaySearchBar &&
					<div className="spacer-row" />
				}
				{
					this.props.displayGroupButtons &&
					<div className="flex-row button-bar flex-no-shrink flex-center">
						<div
							className={`button width-17 ${this.state.groupByProp == 'companyCode' ? 'selected' : ''}`}
							onClick={() => this.groupBy('companyCode')}
						>
							{ i18n.__('GROUP BY COMPANY') }
						</div>
						<div
							className={`button width-17 ${this.state.groupByProp == 'partnerCode' ? 'selected' : ''}`}
							onClick={() => this.groupBy('partnerCode')}
						>
							{ i18n.__('GROUP BY CUSTOMER') }
						</div>
						<div
							className={`button width-17 ${this.state.groupByProp == 'projectStatus' ? 'selected' : ''}`}
							onClick={() => this.groupBy('projectStatus')}
						>
							{ i18n.__('GROUP BY STATUS') }
						</div>
						<div className="button width-17 action-cancel" onClick={() => this.groupBy()}>
							{ i18n.__('REMOVE GROUPING') }
						</div>
					</div>
				}
				{
					this.props.displayGroupButtons &&
					<div className="spacer-row" />
				}
				<div className="flex-col scroll-y">
				{
					!this.props.subReady && <Spinner />
				}
				{
					this.props.subReady && projectRows.map((row, index) => {
						if (!row) {
							return <div className="spacer-row" key={index} />;
						}

						return (
							<div className="flex-row flex-no-shrink" key={index}>
							{
								row.map((project, index) => {
									if (!project) {
										return <div className="spacer-col" key={index} />;
									}

									if (project == 'padding') {
										return <div
											className="flex-grow"
											style={{padding: this.props.compactMode ? 14 : 6}}
											key={index} />;
									}

									if (project._separator) {
										return <div className="separator flex-row flex-center width-100" key={'sep'+index}>
											<span>{project._separator}</span>
										</div>;
									}
								
									return (
										<ProjectCard
											compactMode={this.props.compactMode}
											project={project}
											projectColor={(this.state.projectColors.find(c =>
												c.id == project._id) || {} as any).color}
											enableLink={this.props.enableLinks}
											enableDrag={this.props.enableDrag}
											enableDrop={this.props.enableDrop}
											onDrop={this.props.onDrop}
											key={index}
										/>
									);
								})
							}
							</div>
						);
					})
				}
				</div>
			</div>
		);
	}
}

(ProjectList as any).defaultProps = {
	columnCount: 2,
	displayGroupButtons: true,
	displaySearchBar: true,
};

export default createContainer((props: props) => {

	let sub = Meteor.subscribe('projects.list');
	let projects = Projects.find(QueryTools.getProjectRestrictionQuery(Meteor.userId())).fetch();
	let projectIds = projects.map(p => p._id);

	return {
		projects,
		projectIds,
		subReady: sub.ready(),
	};

}, ProjectList);


// PROJECT CARD

interface projectCardProps {
	project: Project,
	projectColor?: string,	// CSS color

	compactMode?: boolean,
	enableLink?: boolean,
	enableDrag?: boolean,
	enableDrop?: boolean,
	onDrop?: (project: Project, type: string, object: any) => any,
}
interface projectCardState {

}

class ProjectCard extends Component<projectCardProps, projectCardState> {

	getProjectStatusLabel(value): string {
		return (ProjectStatusList.find(s => s.value == value) || {} as any).label;
	}

	renderFull() {
		return (
			<ObjectInfoCard
				className="flex-col flex-center flex-grow project-box-full no-wrap"
				draggableType="project-card"
				linkTo={this.props.enableLink && `/projects/${this.props.project._id}`}
				draggable={this.props.enableDrag}
				draggableObject={{projectId: this.props.project._id}}
				droppable={this.props.enableDrop}
				droppableTypes={['employee-card', 'group-card']}
				onDrop={(type, obj) => this.props.onDrop(this.props.project, type, obj)}
				overlayOnHover={true}
				key={this.props.project._id}
			>
				<svg className="background" viewBox="0, 0, 100, 1000" preserveAspectRatio="xMinYMax slice">
					<rect
						x="0"
						y="0"
						width="1000"
						height="1000"
						transform="rotate(15 0 1000) translate(60 0)"
						fill={this.props.projectColor || 'transparent'}
					/>
				</svg>

				<div className={"project-status status"+this.props.project.projectStatus}>
					{this.getProjectStatusLabel(this.props.project.projectStatus)}
				</div>
				<div className={"alert-level level"+this.props.project.alertLevel} />
				<div className="code">{this.props.project.code}</div>

				<div className="spacer-row" />
				<div className="project-name title">{this.props.project.name}</div>
				<div className="partner-name flex-grow light-text">
					{i18n.__('for')+': '+(this.props.project.partnerName || '(unknown)')}
				</div>
				<div className="company-name front">{this.props.project.companyName}</div>

			</ObjectInfoCard>
		);
	}

	renderCompact() {
		return (
			<ObjectInfoCard
				typeIcon="project"
				className="flex-row flex-center flex-grow project-box-compact"
				draggableType="project-card"
				linkTo={this.props.enableLink && `/projects/${this.props.project._id}`}
				draggable={this.props.enableDrag}
				draggableObject={{projectId: this.props.project._id}}
				droppable={this.props.enableDrop}
				droppableTypes={['employee-card', 'group-card']}
				onDrop={(type, obj) => this.props.onDrop(this.props.project, type, obj)}
				overlayOnHover={true}
				key={this.props.project._id}
			>
				<svg className="background" viewBox="0, 0, 100, 1000" preserveAspectRatio="xMinYMax slice">
					<rect
						x="0"
						y="0"
						width="1000"
						height="1000"
						transform="rotate(15 0 1000) translate(60 0)"
						fill={this.props.projectColor || 'transparent'}
					/>
				</svg>

				<div className="flex-col flex-grow pos-relative">
					<div className="nowrap title">{this.props.project.name}</div>
					<div className="nowrap small light-text">{ i18n.__('Partner') }: { this.props.project.partnerName }</div>
				</div>

				<div className={`project-status top-right status${this.props.project.projectStatus}`}>
					{this.getProjectStatusLabel(this.props.project.projectStatus)}
				</div>

			</ObjectInfoCard>
		);
	}

	render() {
		if (this.props.compactMode) {
			return this.renderCompact();
		} else {
			return this.renderFull();
		}
	}

}