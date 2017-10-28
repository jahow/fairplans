import * as React from 'react';
import * as Collections from '../data/collections';
import * as sanitizeHTML from 'sanitize-html';
import * as moment from 'moment';

export class Tools {

	static printHTMLText(text) {
        if (!text) { return ''; }
		return text.split("\n").map((item, index) => <span key={"text" + index}>{item}<br/></span>);
	}

	static shortenPersonName(firstName: string, lastName: string) {
		if (!firstName || !lastName) { return ''; }

		// TODO: use a setting for this
		return firstName.substr(0, 1) + lastName.substr(0, 1) + lastName.substr(lastName.length-1, 1);
	}

	static getSortFunctionByProp(prop, reverse?: boolean, toNumber?: boolean, caseSensitive?: boolean) {
		if (toNumber) {
			return (item1, item2) => (reverse ? -1 : 1) *
				(parseFloat(item1[prop]) < parseFloat(item2[prop]) ? -1 :
					(parseFloat(item1[prop]) == parseFloat(item2[prop]) ? 0 : 1));
		}

		if (caseSensitive) {
			return (item1, item2) => (reverse ? -1 : 1) *
				(item1[prop].toLowerCase() < item2[prop].toLowerCase() ? -1 :
					(item1[prop].toLowerCase() == item2[prop].toLowerCase() ? 0 : 1));
		}

		return (item1, item2) => (reverse ? -1 : 1) *
			(item1[prop] < item2[prop] ? -1 : (item1[prop] == item2[prop] ? 0 : 1));
	}

	static capitalize(s: string) {
		return s && (s.substr(0, 1).toUpperCase() + s.substr(1));
	}

	// return a {__html: '...'} to be used as a dangerouslySetInnerHTML prop
	static sanitizeHTML(s: string): { __html: string } {
		return {
			__html: sanitizeHTML(s)
		};
	}

	// statit handler to prevent event propagation
	static PropagationPreventor(event) {
		event.stopPropagation();
	}
}

export class DateTools {

	static getMonthName(month_index) {
		return moment().month(month_index).format("MMMM");
	}

	static getMonthShortName(month_index) {
		return moment().month(month_index).format("MMM");
	}

	// returns an object { start, end, mid, length }
	// positions are expressed in time units (days) relative to the present day
	static getMonthCoordinatesInTimeline(year, month/*, month_gap_size*/) {
		var reference = moment();
		var reference_month = moment([reference.year(), reference.month(), 1]);
		var current_month = moment([year, month, 1]);
		var next_month = moment(current_month).add(1, 'months');

		// amount of days
		var start_position = Math.ceil(current_month.diff(reference, 'days', true));
		var end_position = Math.ceil(next_month.diff(reference, 'days', true));

		// if(start_position > 0) { start_position++; }
		// if(end_position > 0) { end_position++; }

		return {
			start: start_position,
			end: end_position,
			mid: (start_position+end_position)/2,
			length: end_position-start_position
		};
	}

	// returns an object { start, end, mid, length }
	// positions are expressed in time units (days) relative to the present day
	static getWeekCoordinatesInTimeline(year, week) {
		var reference = moment();
		var current_week = moment([year]).week(week).day(0);
		var next_week = moment(current_week).add(1, 'weeks');

		// amount of days
		var start_position = Math.ceil(current_week.diff(reference, 'days', true));
		var end_position = Math.ceil(next_week.diff(reference, 'days', true));
		// var start_position = current_week.diff(reference, 'days');
		// var end_position = next_week.diff(reference, 'days');

		// if(start_position > 0) { start_position++; }
		// if(end_position > 0) { end_position++; }

		return {
			start: start_position,
			end: end_position,
			mid: (start_position+end_position)/2,
			length: end_position-start_position
		};
	}

	// returns an object {year, month, day} from time unit (days) coordinate, floored
	// DO NOT USE THIS ANYMORE: DEPRECATED
	static getDateFromTimeLineCoordinates(coord/*, month_gap_size*/) {
		var reference = moment();
		var reference_month = moment([reference.year(), reference.month(), 1]);
		var current = moment(reference).add(Math.round(coord), 'days');
		var current_month = moment([current.year(), current.month(), 1]);

		return {
			year: current.year(),
			month: current.month(),
			day: current.date(),
			remaining: coord - Math.floor(coord)
		};
	}

	static getDateFromTimelinePosition(timelinePosition: number): Date {
		var reference = moment();
		var current = moment(reference).add(Math.round(timelinePosition), 'days');

		return current.toDate();
	}

	static getMomentFromTimelinePosition(timelinePosition: number): moment.Moment {
		var reference = moment();
		var current = moment(reference).add(Math.round(timelinePosition), 'days');

		return current;
	}

	static getTimelinePositionFromDate(date: Date): number {
		var reference = moment();
		var current = moment(date);
		var coord = current.diff(reference, 'minutes') / 1440;
		return coord;
	}

	static getTimelinePositionFromMoment(m: moment.Moment): number {
		var reference = moment();
		var coord = m.diff(reference, 'minutes') / 1440;
		return coord;
	}



	// returns a coord in time unit (days) scale
	// DEPRECATED: DO NOT USE
	static getTimeLineCoordinateFromDate(year, month, day/*, month_gap_size*/) {
		var reference = moment();
		var current = moment([year, month, day]);

		var coord = current.diff(reference, 'hours') / 24;

		coord = Math.ceil(coord);

		return coord;
	}


	// handles snapping to timeline coordinates
	// snapping is done differently depending on the current span type :
	//- day: snaps to time units (days)
	//- week: snaps to week center ie thursday
	//- month: snaps to 50% of month
	static getNearestSnapPoint(coord, span_type) {
		var current_date = this.getDateFromTimeLineCoordinates(coord);
		var current = moment([current_date.year, current_date.month, current_date.day]);
		var snapped_coord = coord;

		switch(span_type) {

			case 'day': snapped_coord = Math.round(snapped_coord); break;

			case 'week':
			case 'week_alt':
				var week_mid = moment(current).day(3);
				snapped_coord = this.getTimeLineCoordinateFromDate(week_mid.year(), week_mid.month(), week_mid.date());
			break;

			case 'month':
				var days_count = moment(current).daysInMonth();
				var month_mid = moment(current).date(0);
				month_mid.add(Math.round(days_count/2), 'days');
				snapped_coord = this.getTimeLineCoordinateFromDate(month_mid.year(), month_mid.month(), month_mid.date());
			break;
		}

		// span is a free numeric range: simply round its center
		// if (typeof span_type == 'number') {
		// 	snapped_coord = Math.round(snapped_coord);
		// }

		//console.log("snapped coord = "+snapped_coord);
		return snapped_coord;
	}

	// input is "8:15", output is 8.25
	static convertTimeStringToNumber(string_time) {
		return parseInt(string_time.substr(0, 2)) + parseInt(string_time.substr(3, 2)) / 60;
	}

	// input is 8.25, output is "8:15"
	static convertTimeNumberToString(number_time) {
		var decimals = Math.round(60 * (number_time - Math.floor(number_time)));
		if (decimals == 60) { decimals = 0; number_time += 1; }
		return (number_time < 10 ? "0" : "") + Math.floor(number_time) + ":"
			+ (decimals < 10 ? "0" : "") + decimals;
	}

	// input is 3.10, output is "3 hours dans 6 minutes"
	static convertDurationNumberToString(number_time) {
		var decimals = Math.round(60 * (number_time - Math.floor(number_time)));
		return (number_time < 10 ? "0" : "") + Math.floor(number_time) + ":"
			+ (decimals < 10 ? "0" : "") + decimals;
	}

	// print date from timestamp
	static printDateFromTimestamp(timestamp: number): string {
		if (!timestamp) {
			return '---';
		}
		return moment(timestamp).format('lll');
	}

	static toISODate(year: number, month: number, day: number): string {
		return `${year}-${month < 9 ? '0' : ''}${month+1}-${day < 10 ? '0' : ''}${day}`;
	}

};


// HELPERS FOR TIMECARD AND EXPENSE MANIPULATION

export class UserEntryTools {

	// returns a {start, end} object with the times fitting the best available interval
	// if allowShift is true, an interval which requires shifting can be returned
	// if allowShrink is true, the returned interval may have a width lower than the requested time span
	// returns null if nothing found
	static attemptTimecardPosition(existingCards: Collections.Timecard[],start: number, end: number,
		allowShift?: boolean, allowShrink?: boolean, dayStart?: number, dayEnd?: number): { start: number, end: number } {
		let intervals = [{start: dayStart || 0, end: dayEnd || 24}];			// array of {start,end} objects
		let width = end - start;
		let middle = start + width/2;

		// looping through the cards of the day to build the list of intervals
		existingCards.forEach(card => {
			let start = card.start;
			let end = card.end;

			// find interval holding this block
			let interval_index = intervals.findIndex(obj => obj.start <= start && obj.end >= end);
			if(interval_index == -1) {
				console.error('card position invalid');
				return null;	// ERROR : should not happen
			}

			// we split the interval in which this block is
			let interval = intervals[interval_index];
			intervals.push({start: end, end: interval.end});
			interval.end = start;
		});

		// we now have a list of intervals; let's loop through it to find a good spot
		var selected = null;
		var minDist = 1000;	// distance from requested position
		//console.log(`start: ${start} / end: ${end}`);
		for(var i = 0; i < intervals.length; i++) {
			let interval = intervals[i];

			// this interval is too far
			if(interval.end < start || interval.start > end) { continue; }

			// this interval works out of the box
			if(interval.start <= start && interval.end >= end) {
				return { start, end };
			}

			// skip if we don't allow shrink or shift
			else if(!allowShrink && !allowShift) {
				continue;
			}

			let temp = { start: interval.start, end: interval.end };

			// SHIFT MODE
			// this interval has the right size
			if(allowShift && (interval.end - interval.start) >= width) {
				// let's adjust the interval to the requested width
				if(interval.end < end) { temp.start = interval.end - width; }
				else if(interval.start > start) { temp.end = interval.start + width; }
				else {
					temp.end = end;
					temp.start = start;
				}
			}

			// SHRINK MODE
			if(allowShrink) {
				// let's adjust the interval to the requested width
				temp.start = Math.max(interval.start, start);
				temp.end = Math.min(interval.end, end);
			}

			let dist = Math.abs(middle - (temp.start + (temp.end - temp.start) / 2));
			if(dist < minDist) {
				minDist = dist;
				selected = temp;
			}
		}

		// return selected interval or nothing
		return selected;
	}

	// returns a list of possible actions, according to data type and entry status
	// dataType can be 'timecard' or 'expense'
	// isManagerOf: true if the current user is the manager of the entry's owner
	// isAdmin: true if user is admin
	// isProjectManager: true if the user is a manager of the entry's associated project
	// isOwnEntry: true if the user is the owner of the entry
	// isFuture: true if the entry is set in the future
	// this has to be checked agains user roles
	static getPossibleActions(dataType: 'timecard' | 'expense', status: Collections.UserEntryStatus,
							  isManagerOf: boolean, isAdmin: boolean, isProjectManager: boolean,
							  isOwnEntry: boolean, isFuture: boolean): { canEdit: boolean, canDelete: boolean, canSubmit: boolean, canApprove: boolean } {
		return {
			canEdit: isAdmin || (status == Collections.UserEntryStatus.DRAFT),
			canDelete: isAdmin || (status == Collections.UserEntryStatus.DRAFT),
			canSubmit: isAdmin || (isOwnEntry && !isFuture && status == Collections.UserEntryStatus.DRAFT),
			canApprove: isAdmin || (isManagerOf && !isOwnEntry && status == Collections.UserEntryStatus.SUBMITTED),
		};
	}

	// returns true if the entry is a 'future' one (cannot be submitted)
	// endtime is an hour in numeric format (ex. 15.75)
	static isFutureEntry(dataType: 'timecard' | 'expense', year: number, month: number, day: number, endTime?: number) {
		let times = [year, month, day];
		let precision: moment.unitOfTime.StartOf = 'day';
		if (endTime !== undefined) {
			times = [year, month, day, endTime, (endTime - Math.floor(endTime)) * 60];
			precision = 'minute';
		}
		return !moment(times).isBefore(moment(), precision);
	}

}


// HELPERS FOR COMPLEX COLLECTION QUERIES

export class QueryTools {

	// tasks are restricted by this query to what the current user can see
	// this returns a Mongo query, or null if no task should be returned
	static getTaskRestrictionQuery(userId: string): any {
		const user = Meteor.users.findOne(userId);

		// no valid user
		// if (!user) { return null; }

		// admin user: see all
		if (user && user.profile && user.profile.isAdmin) {
			return {};
		}

		// no employee found: show nothing
		let employee = Collections.Employees.findOne({ userId });
		if (!employee) {
			return null;
		}

		// get projects that we're assigned to and where we have no spectific task assigned
		let projectQuery = {
			assignedWithoutTask: { $elemMatch: { $eq: employee._id } },
		};
		let projects = Collections.Projects.find(projectQuery, { fields: { _id: 1 } }).fetch();

		return {
			$and: [
				{				 
	 				$or: [
						{
							// if assigned to task: include
							assignedEmployees: {
								$elemMatch: { $eq: employee._id }
							},
						},
						{
							assignedExternalResources: {
								$elemMatch: { $eq: employee._id }
							},
						},
						{
							// if assigned to project with no specific task
							projectId: {
								$in: projects.map(p => p._id)
							},
						}
					]
				},
				{
					$or: [
						{
							hoursBudgetConstrained: false
						},
						{
							hoursRemaining: {
								$gt: 0
							}
						}
					]
				}
			]
		};
	}

	// projects are restricted by this query to what the current user can see
	// this returns a Mongo query, or null if no project should be returned
	static getProjectRestrictionQuery(userId: string): any {
		const user = Meteor.users.findOne(userId);

		// admin user: see all
		if (user && user.profile && user.profile.isAdmin) {
			return {};
		}

		// no employee found: show nothing
		let employee = Collections.Employees.findOne({ userId });
		if (!employee) {
			return null;
		}

		// get tasks where I'm an external resource
		let intercoTasks = Collections.Tasks.find({
			assignedExternalResources: {
				$elemMatch: { $eq: employee._id }
			},
		});

		return {
			$or: [
				{
					assignedManagers: {
						$elemMatch: { $eq: employee._id }
					},
				},
				{
					assignedMembers: {
						$elemMatch: { $eq: employee._id }
					},
				},
				{
					_id: {
						$in: intercoTasks.map(t => t.projectId).filter((id, index, array) => array.indexOf(id) == index)
					}
				}
			]
		};
	}

	// employees are visible by their HR manager
	// this returns a Mongo query, or null if no employee should be returned
	static getEmployeeRestrictionQuery(userId: string): any {
		const user = Meteor.users.findOne(userId);

		// admin user: see all
		if (user && user.profile && user.profile.isAdmin) {
			return {};
		}

		// no current employee found: show nothing
		let currentEmployee = Collections.Employees.findOne({ userId });
		if (!currentEmployee) {
			return null;
		}

		// can the current employee see all employees?
		if (currentEmployee.roleId) {
			let role = Collections.EmployeeRoles.findOne(currentEmployee.roleId);
			if (role.canSeeAllEmployees) {
				return {};
			}
		}

		return {
			$or: [
				{
					_id: currentEmployee._id
				},
				{
					managerId: currentEmployee._id
				}
			]
		};
	}

	// gets a list of timesheets to approve, ie the timesheet is associated
	// with a project where we are the manager, and we are not the author
	static getTimesheetApprovalQuery(userId: string): any {
		const user = Meteor.users.findOne(userId);

		// admin user: filter on status only
		if (user.profile && user.profile.isAdmin) {
			return { status: Collections.UserEntryStatus.SUBMITTED };
		}

		// no employee found: show nothing
		let employee = Collections.Employees.findOne({ userId });
		if (!employee) {
			return null;
		}

		// look for my projects
		let projectsIds = Collections.Projects.find({
			assignedManagers: {
				$elemMatch: { $eq: employee._id }
			}
		}).fetch().map(p => p._id);

		// build list of tasks
		let availableTasksIds = Collections.Tasks.find({
			projectId: {
				$in: projectsIds
			}
		}).fetch().map(t => t._id);

		// select timesheets that are not created by me, with the status submitted, and
		// linked to a project that I am managing
		let query = {
			$and: [
				{
					userId: { $ne: userId },
				},
				{
					status: Collections.UserEntryStatus.SUBMITTED,
				},
				{
					taskId: {
						$in: availableTasksIds
					}
				},
				{
					repeating: false
				}
			]
		};
	}

	// gets a list of expenses to approve
	static getExpenseApprovalQuery(userId: string): any {
		const user = Meteor.users.findOne(userId);

		// admin user: filter on status only
		if (user.profile && user.profile.isAdmin) {
			return { status: Collections.UserEntryStatus.SUBMITTED };
		}

		// no employee found: show nothing
		let employee = Collections.Employees.findOne({ userId });
		if (!employee) {
			return null;
		}

		// look for my projects
		let projectsIds = Collections.Projects.find({
			assignedManagers: {
				$elemMatch: { $eq: employee._id }
			}
		}).fetch().map(p => p._id);

		// select expenses that are not created by me, with the status submitted, and
		// linked to a project that I am managing
		let query = {
			$and: [
				{
					userId: { $ne: userId },
				},
				{
					status: Collections.UserEntryStatus.SUBMITTED,
				},
				{
					projectId: {
						$in: projectsIds
					}
				}
			]
		};
	}

	// gets a list of repeating cards that should appear on this day
	static getRepeatingCardInstances(year: number, month: number, day: number, userId: string): any {
		let m = moment([year, month, day]).hour(12);

		return {
			repeating: true,
			repeatStart: {
				$lte: m.toDate()
			},
			repeatEnd: {
				$gte: moment(m).subtract(1, 'days').toDate()
			},
			repeatOn: {
				$elemMatch: { $eq: m.day() }
			}
		};
	}
}


// HELPERS FOR LOG ENTRY CREATION
// not used yet...

export class LogTools {

	static logObjectAction(userId: string, description: string, collectionName: string, objectId: string, action: Collections.LogActions, companyCode: string) {
		// Collections.LogEntries.insert({
		// 	userId,
		// 	action,
		// 	relatedObjects: [
		// 		{ collectionName, id: objectId }
		// 	],
		// 	description,
		// 	companyCode,
		// });
	}

	static logUserEntryAction(userId: string, description: string, collectionName: string, objectId: string, action: Collections.LogActions, projectId: string) {
		// Collections.LogEntries.insert({
		// 	userId,
		// 	action,
		// 	relatedObjects: [
		// 		{ collectionName, id: objectId }
		// 	],
		// 	description,
		// 	projectId,
		// });
	}

}
