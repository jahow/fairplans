import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { TAPi18n as i18n } from 'meteor/tap:i18n';
import * as moment from 'moment';

import { Employees, Employee } from '../../data/collections';
import { LogEntries, LogEntry, LogActions } from '../../data/collections';
import { PartnerTypeList } from '../../data/choicelists';
import { Tools, DateTools } from '../../utils/tools';



interface logEntriesListProps {
	// reactive data
	employees: Employee[],
	logEntries: LogEntry[],
	currentUserId: string,
	maxCount?: number,

	id?: string,
	className?: string,
	style?: Object,
}

class LogEntriesList extends Component<logEntriesListProps, any> {

	constructor(props: logEntriesListProps) {
		super(props);

		this.state = {

		};
	}

	generateDescription(entry: LogEntry) {
		let who = entry.ownerLabel + ' ' + i18n.__('has');

		let what = i18n.__('done something with');
		switch (entry.action) {
			case LogActions.ENTRY_APPROVED: what = i18n.__('approved {0}'); break;
			case LogActions.ENTRY_REJECTED: what = i18n.__('rejected {0}'); break;
			case LogActions.ENTRY_SUBMITTED: what = i18n.__('submitted {0}'); break;
			case LogActions.OBJECT_ASSIGNED: what = i18n.__('assigned {0} to {1}'); break;
			case LogActions.OBJECT_UNASSIGNED: what = i18n.__('unassigned {0} from {1}'); break;
			case LogActions.OBJECT_CREATED: what = i18n.__('created {0}'); break;
			case LogActions.OBJECT_REMOVED: what = i18n.__('removed {0}'); break;
			case LogActions.OBJECT_UPDATED: what = i18n.__('updated {0}'); break;
		}

		let objLabels = [i18n.__('an object'), i18n.__('an object')];

		for (let i = 0; i < entry.relatedObjects.length; i++) {
			let objInfo = entry.relatedObjects[i];
			let label = '(invalid object)';

			switch (objInfo.collectionName) {
				case 'Companies':
					label = `${i18n.__('company')} [[${objInfo.label}]]`;
					break;
				case 'Partners':
					let type = PartnerTypeList.find(t => t.value == objInfo.type);
					label = `${type.label.toLowerCase()} [[${objInfo.label}]]`;
					break;
				case 'Products':
					label = `${i18n.__('product')} [[${objInfo.label}]]]]`;
					break;
				case 'Projects':
					label = `${i18n.__('project')} [[${objInfo.label}]]`;
					break;
				case 'Tasks':
					label = `${i18n.__('task')} [[${objInfo.label}]] ${i18n.__('from project')} [[${objInfo.ownerLabel}]]`;
					break;
				case 'SalesOrders':
					label = `${i18n.__('sales order')} [[${objInfo.label}]]`;
					break;
				case 'SalesOrderLines':
					label = `${i18n.__('billing section')} [[${objInfo.label}]]`;
					break;
				case 'Employees':
					label = `${i18n.__('employee')} [[${objInfo.label}]]`;
					break;
				case 'EmployeeGroups':
					label = `${i18n.__('group')} [[${objInfo.label}]]`;
					break;
				case 'EmployeeRoles':
					label = `${i18n.__('employee role')} [[${objInfo.label}]]`;
					break;
				case 'EmployeeSkills':
					label = `${i18n.__('employee skill')} [[${objInfo.label}]]`;
					break;
				case 'Timecards':
					if (entry.action == LogActions.ENTRY_SUBMITTED) {
						label = `${i18n.__('a timesheet')}`;
						break;
					}
					label = `${i18n.__('a timesheet of')} [[${objInfo.ownerLabel}]]`;
					break;
				case 'Expenses':
					if (entry.action == LogActions.ENTRY_SUBMITTED) {
						label = `${i18n.__('an expense')}`;
						break;
					}
					label = `${i18n.__('an expense of')} [[${objInfo.ownerLabel}]]`;
					break;
				case 'ExpenseTypes':
					label = `${i18n.__('expense type')} [[${objInfo.label}]]`;
					break;
			}

			objLabels[i] = label;
		}

		what = what.replace('{0}', objLabels[0]).replace('{1}', objLabels[1]);

		// new description done!
		return `${who} ${what}.`;
	}

	renderLogEntry(entry: LogEntry, isLast: boolean) {
		let time = moment(entry.creationTime);
		let description = (entry.description || this.generateDescription(entry))
			.replace(/\[\[/g, '<strong>').replace(/\]\]/g, '</strong>');

		return <div key={entry._id}>
			<div className="log-entry widget-box">
				<div className="title">
					{ time.format('ll').toUpperCase() } - { time.format('LT').toUpperCase() }
					</div>
				<div dangerouslySetInnerHTML={Tools.sanitizeHTML(description)} />
			</div>
			{
				!isLast && <div className="spacer-row small" style={{height: 6}} />
			}
		</div>;
	}

	render() {

		return (
		    <div className={'log-entries-list flex-col '+(this.props.className || '')} id={this.props.id} style={this.props.style}>
			{
				this.props.logEntries.map((e, index) => this.renderLogEntry(e, index == this.props.logEntries.length - 1))
			}
		    </div>
        );
	}
}

export default createContainer<logEntriesListProps>((props: logEntriesListProps) => {
	Meteor.subscribe('logs');

	return {
		employees: Employees.find().fetch(),
		logEntries: LogEntries.find({}, {sort: {creationTime: -1}, limit: props.maxCount || 10}).fetch(),
		currentUserId: Meteor.userId(),
	};

}, LogEntriesList);

