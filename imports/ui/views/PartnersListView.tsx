import * as React from 'react';
import { Component } from 'react';


import PartnersListContainer from './PartnersListContainer';
import Toolbar from '../subviews/Toolbar';


interface props {
	routeParams: any
}
interface state {
}


export default class PartnersListView extends Component<props, state> {

	render() {
		return (
			<div className="width-100 with-toolbar">
				<PartnersListContainer selectedId={this.props.routeParams.partnerId} />
				<Toolbar />
			</div>
		);
	}

}