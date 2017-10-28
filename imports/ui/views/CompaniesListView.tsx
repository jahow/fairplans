import * as React from 'react';
import { Component } from 'react';


import CompaniesListContainer from './CompaniesListContainer';
import Toolbar from '../subviews/Toolbar';


interface props {
	routeParams: any
}
interface state {
}


export default class CompaniesListView extends Component<props, state> {

	render() {
		return (
			<div className="width-100 with-toolbar">
				<CompaniesListContainer selectedId={this.props.routeParams.companyId} />
				<Toolbar />
			</div>
		);
	}

}