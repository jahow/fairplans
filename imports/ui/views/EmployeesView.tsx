import * as React from 'react';
import { Component } from 'react';

//import i18n from 'meteor/universe:i18n';
import { TAPi18n as i18n } from 'meteor/tap:i18n';

import EmployeesManagementContainer from './EmployeesManagementContainer';
import Toolbar from '../subviews/Toolbar';


interface props {
}
interface state {
}


export default class EmployeesView extends Component<props, state> {

	render() {

		return (
			<div className="width-100 with-toolbar">
				<EmployeesManagementContainer />
				<Toolbar />
			</div>
		);

	}
}