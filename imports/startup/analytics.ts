import * as moment from 'moment';
import * as Collections from '../data/collections';

import { UserEntryTools, DateTools, Tools } from '../utils/tools';
import ColorTools from '../utils/color';


Meteor.methods({

	// ANALYTICS QUERIES

	// returns an array of type { x: 'YYYY-MM-DD', y: hours approved as timecards }
	'analytics.task.hours.approved'(taskId: string) {
		// console.log('computing hours for task '+taskId);
		let timecards = Collections.Timecards.find({
			taskId,
			status: Collections.UserEntryStatus.APPROVED,
			repeating: false,
		}).fetch()
		.sort(Tools.getSortFunctionByProp('date'));

		let results = [];
		let sum = 0;
		timecards.forEach((timecard, index) => {
			// add value when on a new date
			if (index == 0 || timecard.day != timecards[index-1].day) {
				results.push({
					x: moment(timecard.date).format('YYYY-MM-DD'),
					y: 0,
				});
			}

			// get current date and add hours
			let date = results[results.length - 1];
			sum += timecard.end - timecard.start;
			date.y = sum;
		});

		if (results.length > 0) {
			// add an initial value of zero for good measure
			let firstDate = moment(results[0].x);
			results.unshift({
				x: firstDate.subtract(1, 'day').format('YYYY-MM-DD'),
				y: 0,
			});
		}

		return results;
	},

	// returns an array of entries like
	// {
	// 		projectId: string,
	//		projectColor: string,
	//		totalHours: number,
	//		approvedHours: number,
	//		submittedHours: number,
	//		draftHours: number,
	//		plannedHours: number,
	// 		totalHoursByDay: [
	// 			{ x: 'YYYY-MM-DD', y: hours as timecards }
	// 		],
	// 		approvedHoursByDay: [
	// 			{ x: 'YYYY-MM-DD', y: hours as timecards }
	// 		],
	// 		submittedHoursByDay: [
	// 			{ x: 'YYYY-MM-DD', y: hours as timecards }
	// 		],
	// 		draftHoursByDay: [
	// 			{ x: 'YYYY-MM-DD', y: hours as timecards }
	// 		],
	// 		plannedHoursByDay: [
	// 			{ x: 'YYYY-MM-DD', y: hours as timecards }
	// 		],
	// }
	// exclude* params are used to exclude timecards with certain status
	// hours are summed if 'sumHours' is true
	'analytics.employee.hours.bystatus'({
		employeeId,
		sumHours,
		excludeApproved,
		excludeSubmitted,
		excludeDraft,
		excludePlanned })
	{
		let employee = Collections.Employees.findOne(employeeId);
		if (!employee) { return; }

		let now = moment();

		let timecardQuery: any = {
			userId: employee.userId,
			status: { $in: [] },
		};
		if (!excludeApproved) { timecardQuery.status.$in.push(Collections.UserEntryStatus.APPROVED); }
		if (!excludeSubmitted) { timecardQuery.status.$in.push(Collections.UserEntryStatus.SUBMITTED); }
		if (!excludeDraft) {
			timecardQuery.status.$in.push(Collections.UserEntryStatus.DRAFT);
			timecardQuery.status.$in.push(Collections.UserEntryStatus.CONFLICTING);
		}

		// exclude future entries
		if (excludePlanned) {
			timecardQuery = {
				$and: [
					timecardQuery,
					{
						date: { $lte: now.toDate() },
						end: { $lte: now.hour() + now.minute() * 1.667 }
					},
				]
			};
		} else {
			timecardQuery = {
				$or: [
					timecardQuery,
					{
						date: { $gte: now.toDate() },
						end: { $gt: now.hour() + now.minute() * 1.667 }
					},
				]
			};
		}

		let timecards = Collections.Timecards.find(timecardQuery).fetch();

		// sort by date (not necessary if we're not summing!)
		if (sumHours) {
			timecards = timecards.sort(Tools.getSortFunctionByProp('date'));
		}

		let results = [];
		let task: Collections.Task;

		// compute on each timecards
		timecards.forEach((timecard, index) => {
			// look for existing date
			task = Collections.Tasks.findOne(timecard.taskId);
			if (!task) { return; }

			// timecard details
			let duration = timecard.end - timecard.start;
			let isPlanned = UserEntryTools.isFutureEntry('timecard', timecard.year, timecard.month, timecard.day, timecard.end);
			let isApproved = !isPlanned && timecard.status == Collections.UserEntryStatus.APPROVED;
			let isSubmitted = !isPlanned && timecard.status == Collections.UserEntryStatus.SUBMITTED;
			let isDraft = !isPlanned && (timecard.status == Collections.UserEntryStatus.DRAFT || timecard.status == Collections.UserEntryStatus.CONFLICTING);

			// project entry
			let projectEntry = results.find(d => d.projectId == task.projectId);

			if (!projectEntry) {
				let color = Meteor.call('color.generate', task.projectId);

				projectEntry = {
					projectId: task.projectId,
					projectColor: ColorTools.formatColorCSS(color),
					totalHours: 0,
					approvedHours: 0,
					submittedHours: 0,
					draftHours: 0,
					plannedHours: 0,
					totalHoursByDay: [],
					approvedHoursByDay: [],
					submittedHoursByDay: [],
					draftHoursByDay: [],
					plannedHoursByDay: [],
				};
				results.push(projectEntry);
			}

			// hours arrays for project
			let dateIso = moment(timecard.date).format('YYYY-MM-DD');

			function getHoursEntry(array: {x: string, y: number}[]): {x: string, y: number}  {
				let entry = array.find(d => d.x == dateIso);
				if (!entry) {
					entry = { x: dateIso, y: 0 };
					array.push(entry);
				}
				return entry;
			}

			// increment global sums
			projectEntry.totalHours += duration;
			if (isApproved) { projectEntry.approvedHours += duration; }
			if (isSubmitted) { projectEntry.submittedHours += duration; }
			if (isDraft) { projectEntry.draftHours += duration; }
			if (isPlanned) { projectEntry.plannedHours += duration; }

			// handle day entries
			let totalHoursEntry = getHoursEntry(projectEntry.totalHoursByDay);
			let approvedHoursEntry = getHoursEntry(projectEntry.approvedHoursByDay);
			let submittedHoursEntry = getHoursEntry(projectEntry.submittedHoursByDay);
			let draftHoursEntry = getHoursEntry(projectEntry.draftHoursByDay);
			let plannedHoursEntry = getHoursEntry(projectEntry.plannedHoursByDay);

			// no value summing: increment day by day
			if (!sumHours) {
				totalHoursEntry.y += duration;
				if (isApproved) { approvedHoursEntry.y += duration; }
				if (isSubmitted) { submittedHoursEntry.y += duration; }
				if (isDraft) { draftHoursEntry.y += duration; }
				if (isPlanned) { plannedHoursEntry.y += duration; }
			}

			// value summing: use last sum value
			else {
				totalHoursEntry.y = projectEntry.totalHours;
				if (isApproved) { approvedHoursEntry.y = projectEntry.approvedHours; }
				if (isSubmitted) { submittedHoursEntry.y = projectEntry.submittedHours; }
				if (isDraft) { draftHoursEntry.y = projectEntry.draftHours; }
				if (isPlanned) { plannedHoursEntry.y = projectEntry.plannedHours; }
			}
		});

		// no value summing: we're done!
		if (!sumHours) { return results; }

		// if we sum values, let's add an initial value of 0 for each project...
		function addInitialZero(hoursArray: {x: string, y: number}[]) {
			if (!hoursArray.length) { return; }

			// add an initial value of zero for good measure
			let firstDate = moment(hoursArray[0].x);
			hoursArray.unshift({
				x: firstDate.subtract(1, 'day').format('YYYY-MM-DD'),
				y: 0,
			});
		}

		for (let i = 0; i < results.length; i++) {
			let proj = results[i];
			addInitialZero(proj.totalHoursByDay);
			addInitialZero(proj.approvedHoursByDay);
			addInitialZero(proj.submittedHoursByDay);
			addInitialZero(proj.draftHoursByDay);
			addInitialZero(proj.plannedHoursByDay);
		}

		return results;
	},

	// returns a series of points like
	// {
	// 		x: 'YYYY-MM-DD',
	//		y: ratio of planned occupation (0 to 1+)
	//		directHours: amount of planned hours per day
	//		indirectHours: amount of work deduced from projet/task assignments
	// }
	// starting at current day
	'analytics.employee.occupation'({ employeeId })
	{
		let employee = Collections.Employees.findOne(employeeId);
		if (!employee) { return; }

		let results = [];
		let date = moment();
		let timecards = Collections.Timecards.find({ userId: employee.userId, repeating: false }).fetch()
		.sort(Tools.getSortFunctionByProp('date'));

		if (timecards.length == 0) { return []; }

		date = moment(timecards[0].date);
		let lastDate = moment(timecards[timecards.length-1].date);
		let hoursPerDay = 7.5;

		while (!date.isSameOrAfter(lastDate, 'day')) {
			let currentTimecards = timecards.filter(c => c.year == date.year() &&
				c.month == date.month() && c.day == date.date());
			let hours = 0;
			currentTimecards.forEach(c => hours += c.end - c.start);

			results.push({
				x: date.format('YYYY-MM-DD'),
				y: hours/hoursPerDay,
				directHours: hours,
				indirectHours: 0
			});
			date.add(1, 'day');
		}

		return results;
	},

	// returns a series of points like
	// {
	// 		x: 'YYYY-MM-DD',
	//		billableHours: number,
	//		nonBillableHours: number,
	//		totalHours: number,
	// }
	// starting at current day
	'analytics.employee.billable'({ employeeId })
	{
		let employee = Collections.Employees.findOne(employeeId);
		if (!employee) { return; }

		let results = [];
		// let date = moment();
		let timecards = Collections.Timecards.find({ userId: employee.userId, repeating: false }).fetch()
			.sort(Tools.getSortFunctionByProp('date'));

		if (timecards.length == 0) { return []; }

		let date = moment(timecards[0].date);
		let lastDate = moment(timecards[timecards.length-1].date);

		while (!date.isSameOrAfter(lastDate, 'day')) {
			let currentTimecards = timecards.filter(c => c.year == date.year() &&
			c.month == date.month() && c.day == date.date());
			let hours = 0;
			let billableHours = 0;
			currentTimecards.forEach(c => {
				hours += c.end - c.start;

				// check if task is billable
				let task = Collections.Tasks.findOne(c.taskId);
				if (task && task.salesOrderLineId) {
					billableHours += c.end - c.start;
				}
			});

			results.push({
				x: date.format('YYYY-MM-DD'),
				totalHours: hours,
				billableHours,
				nonBillableHours: hours - billableHours,
			});
			date.add(1, 'day');
		}

		return results;
	}

});