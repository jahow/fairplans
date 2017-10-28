import * as React from 'react';
import { Component } from 'react';


import ProductsListContainer from './ProductsListContainer';
import Toolbar from '../subviews/Toolbar';


interface props {
	routeParams: any
}
interface state {
}


export default class ProductsListView extends Component<props, state> {

	render() {
		return (
			<div className="width-100 with-toolbar">
				<ProductsListContainer selectedId={this.props.routeParams.productId} />
				<Toolbar />
			</div>
		);
	}

}