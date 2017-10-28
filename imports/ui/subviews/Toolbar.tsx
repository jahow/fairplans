import * as React from 'react';
import { Component } from 'react';
import { Link } from 'react-router';
import * as classnames from 'classnames';
import { createContainer } from 'meteor/react-meteor-data';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import { Employees, Employee, EmployeeRoles, EmployeeRole } from '../../data/collections';
import Spinner from '../widgets/Spinner';


interface props {
	user: Meteor.User,
	employee: Employee,
	role: EmployeeRole,
	subReady?: boolean,
	children?: any,
}

class Toolbar extends Component<props, any> {

	constructor(props) {
		super(props);

		this.state = {
		};

		this.logoutUser = this.logoutUser.bind(this);
	}

	// disabled as there is no simple way to guarantee children equality!
	// shouldComponentUpdate(nextProps: props) {
	// 	if ((nextProps.user == this.props.user || nextProps.user._id == this.props.user._id) &&
	// 		nextProps.subReady == this.props.subReady &&
	// 		(nextProps.children == this.props.children || nextProps.children.length == this.props.children.length)) {
	// 		return false;
	// 	}
	// 	return true;
	// }

	logoutUser(event) {
		Meteor.logout((err) => {
			if (err) {
				alert(err.reason || 'error on logout');
				return;
			}
			console.log('logged out.');
		});

		event.preventDefault();
	}

	render() {
		// not ready
		if (!this.props.user) {
			return (
				<div className="toolbar">
					<Spinner size={40} hideLabel={true} className="width-100" />
				</div>
			);
		}

		let name = this.props.employee ? `${this.props.employee.firstName} ${this.props.employee.lastName}` : this.props.user.username;
		let isAdmin = (this.props.user.profile && this.props.user.profile.isAdmin) ||
			(this.props.role && this.props.role.isAdmin);

		return (
			<div className="toolbar">
				<span>
					{ i18n.__('Logged in as') }:<br />{ name }
				</span>
				<div className="separator"></div>
				<Link to="/">{ i18n.__('home') }</Link>

				<div className="separator"></div>
				<Link to="/calendar">{ i18n.__('my calendar') }</Link>

				<div className="separator"></div>
				<SubMenu label={ i18n.__('my entries') }>
					<Link to="/timesheets">{ i18n.__('Timesheets') }</Link>
					<div className="spacer-row small"/>
					<Link to="/expenses">{ i18n.__('Expenses') }</Link>
				</SubMenu>

				<div className="separator"></div>
				<Link to="/projects-overview">{ i18n.__('projects planning') }</Link>

				<div className="separator"></div>
				<Link to="/myprofile">{ i18n.__('my profile') }</Link>

				{
					isAdmin &&
					<div className="separator"></div>
				}
				{
					isAdmin &&
					<SubMenu label={ i18n.__('admin menu') }>
						<Link to="/projects">{ i18n.__('Project Management') }</Link>
						<div className="spacer-row small"/>
						<Link to="/employees">{ i18n.__('Employee Management') }</Link>
						<div className="spacer-row small"/>
						<Link to="/companies">{ i18n.__('Company Management') }</Link>
						<div className="spacer-row small"/>
						<Link to="/products">{ i18n.__('Product Management') }</Link>
						<div className="spacer-row small"/>
						<Link to="/partners">{ i18n.__('Partner Management') }</Link>
						<div className="spacer-row small"/>
						<Link to="/agreements">{ i18n.__('Intercompany Agreements') }</Link>
					</SubMenu>
				}

				<div className="separator"></div>
				<a href="#" onClick={this.logoutUser}>logout</a>

				<div className="spacer-col flex-grow"/>

				{this.props.children}
			</div>
		);
	}

}

export default createContainer((params) => {

	Meteor.subscribe('current.employee');
	let user = Meteor.user();
	let employee = Employees.findOne({ userId: user._id });
	let role = null;

	if (employee) { role = EmployeeRoles.findOne(employee.roleId); }

	return {
		user,
		employee,
		role,
	};

}, Toolbar);


// TOOLBAR COMPONENTS

interface buttonProps {
	onClick?: () => any,
	label: string,
	active?: boolean,
	hidden?: boolean,
	disabled?: boolean,
	groupLeft?: boolean,
	groupRight?: boolean,
	groupMiddle?: boolean,
	subtitle?: string,

	id?: string,
	style?: Object,
	className?: string,
}

export class Button extends Component<buttonProps, {}> {
	render() {
		var classes = classnames('toolbar-button', this.props.className, {
			'active': this.props.active,
			'hidden': this.props.hidden,
			'disabled': this.props.disabled,
			'group-left': this.props.groupLeft,
			'group-middle': this.props.groupMiddle,
			'group-right': this.props.groupRight,
		});

		return <a
			className={classes}
			onClick={this.props.onClick}
			id={this.props.id}
			style={this.props.style}
		>
			{this.props.label}
			{
				this.props.subtitle &&
				<div className="subtitle">{this.props.subtitle}</div>
			}
		</a>
	}
}

export class SmallButton extends Component<buttonProps, {}> {
	render() {
		return <Button
			className={'small '+(this.props.className || '')}
			{...this.props}
		/>;
	}
}

export class Separator extends Component<{}, {}> {
	render() {
		return <div className="separator"></div>;
	}
}

interface submenuProps {
	label: string,
	disabled?: boolean,
	subtitle?: string,

	id?: string,
	style?: Object,
	className?: string,
}

export class SubMenu extends Component<submenuProps, {}> {
	render() {
		var classes = classnames('toolbar-submenu flex-col flex-center', this.props.className, {
			'disabled': this.props.disabled,
		});

		return <div
			className={classes}
			id={this.props.id}
			style={this.props.style}
		>
			<div className="menu-label">
				{this.props.label}
				{
					this.props.subtitle &&
					<div className="subtitle">{this.props.subtitle}</div>
				}
			</div>
			<div className="children flex-col">
			{
				this.props.children
			}
			</div>
		</div>
	}
}