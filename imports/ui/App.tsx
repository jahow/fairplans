import * as React from 'react';
import { Component } from 'react';
import { createContainer } from 'meteor/react-meteor-data';
import * as classnames from 'classnames';
import { Router, IndexRedirect, Route, browserHistory, IndexRoute } from 'react-router';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { GatewayDest, GatewayProvider } from 'react-gateway';
/*
import CalendarView from './CalendarView/CalendarView';
import CustomersView from './ManagementViews/CustomersView';
import ProjectManagementView from './ManagementViews/ProjectManagementView';
*/
import MessagesDisplay from './subviews/MessagesDisplay';

import ProductsListView from './views/ProductsListView';
import CompaniesListView from './views/CompaniesListView';
import PartnersListView from './views/PartnersListView';
import ProjectsView from './views/ProjectsView';
import EmployeesView from './views/EmployeesView';
import CalendarView from './views/CalendarView';
import UserEntriesListView from './views/UserEntriesListView';
import EntriesApprovalView from './views/EntriesApprovalView';
import MyGroupsView from './views/MyGroupsView';
import UserProfileView from './views/UserProfileView';
import AgreementsApprovalView from './views/AgreementsApprovalView';

import HomeView from './views/HomeView';
import * as AccountViews from './views/AccountViews';

import CloseButton from './controls/CloseButton';
import Spinner from './widgets/Spinner';


interface props {
	user: Meteor.User,
	loggedIn: boolean,
	subReady: boolean,
}
interface state {
}

// shortcut to views with objectCardProps
const ExpensesListView = ({ location }) => (
  <UserEntriesListView dataType="expenses" location={location} />
);

// shortcut to projects overview
const ProjectsOverview = ({ location }) => (
  <CalendarView projectsOverviewMode={true} />
);


// App component - represents the whole app
class App extends Component<props, state> {

	constructor(props) {
		super(props);
		this.state = {
		};
	}

	render() {

		// not ready
		if (!this.props.subReady) {
			return (
				<div className="app-container">
					<Spinner />
				</div>
			);
		}

		// not logged in
		if (!this.props.loggedIn) {
			return (
				<div className="app-container">
					<AccountViews.LoginView />
					<MessagesDisplay />
				</div>
			);
		}

		return (
			<GatewayProvider>
				<div className="app-container">
					<Router history={ browserHistory }>
						<Route path="/">
							{/*<Route path="enroll/:token" component={ AccountViews.EnrollView } />*/}
							<Route path="products(/:productId)" component={ ProductsListView } />
							<Route path="companies(/:companyId)" component={ CompaniesListView } />
							<Route path="partners(/:partnerId)" component={ PartnersListView } />
							<Route path="projects(/:projectId)" component={ ProjectsView } />
							<Route path="projects-overview" component={ ProjectsOverview } />
							<Route path="employees" component={ EmployeesView } />
							<Route path="calendar" component={ CalendarView } />
							<Route path="timesheets" component={ UserEntriesListView } />
							<Route path="expenses" component={ ExpensesListView }  />
							<Route path="approval" component={ EntriesApprovalView } />
							<Route path="mygroups(/:groupId)" component={ MyGroupsView } />
							<Route path="myprofile" component={ UserProfileView } />
							<Route path="agreements" component={ AgreementsApprovalView } />
							<IndexRoute component={ HomeView } />
						</Route>
					</Router>
					{/*
					<div id="overlay-container" className="overlay-pane centered forward-pane padding-outer-gutter">
						<CloseButton onClick={()=>{}} bright={true} />
						test
					</div>
					*/}
					<GatewayDest name="modal" className="modal-container"/>
					<GatewayDest name="tooltip" className="tooltip-modal-container"/>

					<MessagesDisplay />
				</div>
			</GatewayProvider>
		);
	}
}

// apply the drag&drop context to the top level component
export default DragDropContext(HTML5Backend)(
	createContainer((params) => {
		Meteor.subscribe('app.settings');

		// console.dir(Meteor.user());
		// console.dir(Meteor.userId());
		return {
			user: Meteor.user() || {},
			loggedIn: Meteor.userId() !== null,
			subReady: !Accounts.loggingIn(),
		};
	}, App)
) as React.ComponentClass<{}>;