import * as React from 'react';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Component } from 'react';
import { Link } from 'react-router';
import CloseButton from '../controls/CloseButton';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';
import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';


export class LoginView extends Component<{}, {}> {

	constructor(props) {
		super(props);

		this.state = {
		};
		
		this.handleLogin = this.handleLogin.bind(this);
	}

	handleLogin(id: string, values: any) {
		if (!values.login || !values.password) {
			showTemporaryErrorMessage(i18n.__('Enter your login and password.'));
			return;
		}

		Meteor.loginWithPassword(values.login, values.password, (err) => {
			if (err) {
				showTemporaryErrorMessage(err.reason || i18n.__('Login failed.'));
				return;
			}
			showInformationMessage(i18n.__('Successfully logged in!'), null, 1000);
		});
	}

	render() {
		let loginFormProps: PropertyInfo[] = [
			{
				propName: 'login',
				label: i18n.__('Login'),
				editable: true,
				required: true,
			},
			{
				propName: 'password',
				label: i18n.__('Password'),
				editable: true,
				inputType: 'password',
				required: true,
			},
		];

		return (
			<div className="login-view">
				<div className="centered forward-pane padding-outer-gutter flex-col width-medium">
					<div className="section-title">{ i18n.__(`Hi!`) }</div>

					<div className="">
						{ i18n.__('Please enter your login and password.') }
					</div>
					<div className="secondary small">
						{ i18n.__('Your login is usually your e-mail address.') }
					</div>

					<div className="spacer-row"></div>

					<InputFormManager
						originalValues={ { login: '', password: '' } }
						idPropName="login"
						propertiesInfo={loginFormProps}
						showSaveButton={i18n.__('LOGIN')}
						allowSave={true}
						onSave={this.handleLogin}
						resetFieldsOnSave={true}
					/>
				</div>
			</div>
		);
	}

}

/*
export class EnrollView extends Component<any, any> {

	constructor(props) {
		super(props);
		
		this.enrollAccount = this.enrollAccount.bind(this);
	}

	enrollAccount() {
		let password = this.refs.password.value;

		if (password.length < 6) {
			// TODO: feedback
			console.error('password too short');
			return;
		}

		Accounts.resetPassword(
			this.props.routeParams.token,
			password,
			(err) => {
				if(err) {
					console.error(err.reason || "Unknown error");
					return
				}
				// Todo: feedback
				console.log('password reset');
			}
		);
	}

	render() {
		return (
			<div className="centered forward-pane padding-outer-gutter flex-col">
				<div className="title">{ i18n.__(`Hi!`) }</div>
				<div>{ i18n.__('Enter a password to confirm your account.') }</div>
				<div><input type="password" ref="password" /></div>
				<div className="button" onClick={this.enrollAccount}>{ i18n.__('OK') }</div>
			</div>
		);
	}

}
*/