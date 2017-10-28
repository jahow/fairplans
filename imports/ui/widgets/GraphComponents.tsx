import * as React from 'react';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import * as d3 from 'd3';
import * as moment from 'moment';


// TIME GRAPH COMPONENT

interface timeGraphProps {
	children?: Object,

	// view
	viewCoord?: number,			// relative to current time
	viewDaysRange?: number,
	maxValue?: number,
	onViewChange?: (newViewCoord: number, newViewDaysRange: number) => any,

	// layout
	heightPixels?: number,		// outer height

	// misc
	id?: string,
	className?: string,
	style?: Object,
}
interface timeGraphState {

}

const PADDING = 4;		// pixels

interface TimeGraphData {
	x: string,		// this is a date in ISO string
	y: number,
	yMin: number,
	yMax: number,
}

export class TimeGraphComponent extends Component<timeGraphProps, timeGraphState> {

	constructor(props: timeGraphProps) {
		super(props);

		this._graphElementCoord = props.viewCoord;
		this._graphElementRange = props.viewDaysRange;

		// this.handleRangeChange = this.handleRangeChange.bind(this);
	}

	_containerElement: any;
	_graphElement: any;
	_graphElementCoord: number;
	_graphElementRange: number;
	_graphShapeLine: d3.Line<TimeGraphData>;
	_graphShapeArea: d3.Area<TimeGraphData>;
	_graphTimeAxis: d3.Axis<Date>;
	_graphDataAxis: d3.Axis<number>;
	_graphZoomBehavior: any;
	_graphTooltip: any;

	shouldComponentUpdate(nextProps: timeGraphProps, nextState: timeGraphProps) {
		// if display params have not changed: skip render
		if (nextProps.children == this.props.children &&
			nextProps.onViewChange == this.props.onViewChange &&
			nextProps.heightPixels == this.props.heightPixels &&
			// nextProps.solidCurvePoints == this.objectCardProps.solidCurvePoints &&
			Math.abs(nextProps.viewCoord - this._graphElementCoord) < 0.01 &&
			Math.abs(nextProps.viewDaysRange - this._graphElementRange) < 0.01) {
			return false;
		}

		return true;
	}

	// d3 graph creation goes here
	componentDidMount() {
		var items = [];

		// params
		let width = this._containerElement.offsetWidth;
		let height = this.props.heightPixels;
		let margin = 4;
		let dataAxisWidth = 28;
		let timeAxisHeight = 16;

		// graph creation
		this._graphElement = d3.select(this._containerElement).append('svg')
			.attr('width', '100%')
			.attr('height', height - margin * 2);

		// define scale
		let start = moment().add((this.props.viewCoord - this.props.viewDaysRange) * 1440, 'minutes');
		let end = moment().add((this.props.viewCoord + this.props.viewDaysRange) * 1440, 'minutes');
		let timeScale = d3.scaleTime()
			.domain([start.toDate(), end.toDate()])
			.range([dataAxisWidth, width]);
		let dataScale = d3.scaleLinear()
			.domain([this.props.maxValue || 1, 0])
			.range([0, height - margin * 2 - timeAxisHeight]);

		// define axis
		this._graphTimeAxis = d3.axisBottom(timeScale)
			.ticks(width / 80)
		    .tickSizeInner(-(height - margin * 2 - timeAxisHeight))
		    .tickSizeOuter(0) as d3.Axis<Date>;
		this._graphDataAxis = d3.axisLeft<number>(dataScale)
			.ticks(height / 25)
		    .tickSizeInner(-(width - dataAxisWidth))
		    .tickSizeOuter(0);

		// define shape constructors
		this._graphShapeLine = d3.line<TimeGraphData>()
			.x(data => { return this._graphTimeAxis.scale()(new Date(data.x)); })
			.y(data => { return this._graphDataAxis.scale()(data.yMax || data.y || 0); });
		this._graphShapeArea = d3.area<TimeGraphData>()
			.x(data => { return this._graphTimeAxis.scale()(new Date(data.x)); })
			.y1(data => { return this._graphDataAxis.scale()(data.yMax || data.y || 0); })
			.y0(data => { return this._graphDataAxis.scale()(data.yMin || 0); });

		let shapes = this._graphElement.append('g').attr('class', 'shapes-root');

		// add axis bg
		this._graphElement.append('rect')
			.attr('class', 'axis-bg')
			.attr('width', dataAxisWidth)
			.attr('height', height - margin * 2 - timeAxisHeight);
		this._graphElement.append('rect')
			.attr('class', 'axis-bg')
			.attr('width', width - margin * 2 - dataAxisWidth)
			.attr('height', timeAxisHeight)
			.attr('transform', `translate(0, ${height - margin * 2 - timeAxisHeight})`);

		// add axis shapes
		this._graphElement.append('g')
			.attr('class', 'time-axis')
			.call(this._graphTimeAxis)
			.attr('height', timeAxisHeight)
			.attr('transform', `translate(0, ${height - margin * 2 - timeAxisHeight})`);
		this._graphElement.append('g')
			.attr('class', 'data-axis')
			.call(this._graphDataAxis)
			.attr('width', dataAxisWidth)
			.attr('transform', `translate(${dataAxisWidth}, 0)`);

		// add tooltip
		this._graphTooltip = d3.select(this._containerElement).append('div')
			.attr('class', 'graph-tooltip')
			.style('visibility', 'hidden');
		this._graphElement.on('mouseout', () => {
			this.hideTooltip();
		});

		// zoom behavior
		this._graphZoomBehavior = d3.zoom()
			.on('zoom', () => {
				// console.log('new zoom event');
				let transform = d3.event.transform;
				// let currentTransform = d3.zoomTransform(this._graphZoomBehavior);
				// transform.k /= currentTransform.k;
				// transform.x -= currentTransform.x;

				// transform scale
				let newScale = transform.rescaleX(timeScale);
				this._graphTimeAxis.scale(newScale);
				this._graphElement.select('.time-axis').transition().call(this._graphTimeAxis);
				// this._graphDataAxis.scale(transform.rescaleY(dataScale));
				// this._graphElement.select('.data-axis').transition().call(this._graphDataAxis);

				// redraw shapes
				this._graphElement.selectAll('.timecards-graph')
					.transition()
					.attr('d', this._graphShapeLine);
				this._graphElement.selectAll('.timecards-graph-fill')
					.transition()
					.attr('d', this._graphShapeArea);

				// send back event to parent
				let now = moment();
				let middle = moment(newScale.invert(dataAxisWidth / 2 + width / 2));
				let start = moment(newScale.invert(dataAxisWidth));
				this._graphElementCoord = middle.diff(now, 'minutes') / 1440;
				this._graphElementRange = middle.diff(start, 'minutes') / 1440;
				this.props.onViewChange(this._graphElementCoord, this._graphElementRange);
			});
		d3.select(this._containerElement).call(this._graphZoomBehavior);

		//this.redrawGraph(this.objectCardProps.viewCoord, this.objectCardProps.viewDaysRange, this.objectCardProps.solidCurvePoints);
		this.redrawGraph(this.props);
	}

	// nothing to do here, the d3 graph is automatically released as a DOM node
	componentWillUnmount() {

	}

	// redraw graph
	componentWillUpdate(nextProps: timeGraphProps, nextState: timeGraphState) {
		// console.log('view changed, coord='+nextProps.viewCoord+' range='+nextProps.viewDaysRange);
		this.redrawGraph(nextProps);
	}

	redrawGraph(props: timeGraphProps) {
		// console.log('component updated');
		this._graphElementCoord = props.viewCoord;
		this._graphElementRange = props.viewDaysRange;

		// axis
		let timeAxis = this._graphTimeAxis;
		let dataAxis = this._graphDataAxis;

		// time scale adjustment
		let timeScale: any = timeAxis.scale();
		let start = moment().add((props.viewCoord - props.viewDaysRange) * 1440, 'minutes');
		let end = moment().add((props.viewCoord + props.viewDaysRange) * 1440, 'minutes');
		timeAxis.scale(timeScale.domain([start.toDate(), end.toDate()]));
		this._graphElement.select('.time-axis')
			.transition()
			.call(timeAxis);

		// apply new data and create curves
		let maxValue = props.maxValue || 1;
		React.Children.forEach(props.children, (children: any) => {

			// Data curve
			if (children.type == DataCurve && children.props.points) {
				children.props.points.forEach(p => { if (p.y > maxValue) { maxValue = p.y; } });
				this.drawCurve(children.props.dataKey,
					children.props.points,
					children.props.curveColor,
					children.props.curveOpacity,
					children.props.fillCurve,
					children.props.tooltip,
					children.props.overflowValue,
					children.props.overflowColor);
			}

			// stacked data curves
			// no max value computation is done here!
			else if (children.type == StackedDataCurves && children.props.curves) {
				// children.props.curves.forEach(curve => {
				// 	curve.points.forEach(p => { if (p.y > maxValue) { maxValue = p.y; } });
				// })
				this.drawStackedCurves(children.props.dataKey,
					children.props.curves,
					children.props.tooltip);
			}

			// Time marker
			else if (children.type == TimeMarker) {
				this.drawMarker(children.props.dataKey,
					children.props.date,
					children.props.color,
					children.props.tooltip);
			}

			// Bar Chart
			else if (children.type == BarChart && children.props.points) {
				children.props.points.forEach(p => { if (p.y > maxValue) { maxValue = p.y; } });
				this.drawBars(children.props.dataKey,
					children.props.points,
					children.props.barColor,
					children.props.barOpacity,
					children.props.tooltip);
			}

			// Stacked Bar Chart
			else if (children.type == StackedBarChart && children.props.points) {
				children.props.points.forEach(p => { if (p.sum > maxValue) { maxValue = p.sum; } });
				this.drawStackedBars(children.props.dataKey,
					children.props.points,
					children.props.tooltip);
			}
		});

		// data scale adjustment
		let dataScale: any = dataAxis.scale();
		dataAxis.scale(dataScale.domain([maxValue * 1.2, 0]));
		this._graphElement.select('.data-axis')
			.transition()
			.call(dataAxis);

		let shapesRoot = this._graphElement.select('.shapes-root');

		// curves
		shapesRoot.selectAll('.data-curve-line')
			.transition()
			.attr('d', this._graphShapeLine);
		shapesRoot.selectAll('.data-curve-fill')
			.transition()
			.attr('d', this._graphShapeArea);

		// stacked curves
		shapesRoot.selectAll('.data-stacked-curve-line')
			.transition()
			.attr('d', d => this._graphShapeLine(d.points));
		shapesRoot.selectAll('.data-stacked-curve-fill')
			.transition()
			.attr('d', d => this._graphShapeArea(d.points));

		// markers
		shapesRoot.selectAll('.data-marker')
			.transition()
			.attr('transform', (d) => {
				let x = timeAxis.scale()(new Date(d));
				let y = dataAxis.scale()(0);
				return `translate(${x}, ${y})`;
			});

		// bar charts
		shapesRoot.selectAll('.data-bar')
			.transition()
			.attr('x', (d, i) => {
				let start = moment(d.x);
				return timeAxis.scale()(start.toDate());
			})
			.attr('y', (d, i) => {
				let scale = dataAxis.scale();
				return scale(d.y);
			})
			.attr('width', (d, i) => {
				let start = moment(d.x).subtract(d.width * 24 / 2, 'hours');
				let end = moment(d.x).add(d.width * 24 / 2, 'hours');
				let scale = timeAxis.scale();
				return scale(end.toDate()) - scale(start.toDate());
			})
			.attr('height', (d, i) => {
				let scale = dataAxis.scale();
				return Math.max(0, scale(0) - scale(d.y));
			});

		// stacked bar charts
		shapesRoot.selectAll('.data-stackedbar rect')
			.transition()
			.attr('x', (d, i) => {
				let start = moment(d.x);
				return timeAxis.scale()(start.toDate());
			})
			.attr('y', (d, i) => {
				let scale = dataAxis.scale();
				return scale(d.baseY + d.height);
			})
			.attr('width', (d, i) => {
				let start = moment(d.x).subtract(d.width * 24 / 2, 'hours');
				let end = moment(d.x).add(d.width * 24 / 2, 'hours');
				let scale = timeAxis.scale();
				return scale(end.toDate()) - scale(start.toDate());
			})
			.attr('height', (d, i) => {
				let yScale = dataAxis.scale();
				return Math.max(0, yScale(0) - yScale(d.height));
			})
			.attr('fill', (d) => { return d.color })
			.attr('fill-opacity',  (d) => { return d.opacity });;
	}

	drawCurve(key: string, points: { x: string, y: number} [], curveColor: string, curveOpacity: number, fillCurve?: boolean, tooltip?: string, overflowValue?: number, overflowColor?: string) {
		if (!points || !points.length) { return; }

		let shapesRoot = this._graphElement.select('.shapes-root');

		// create element if necessary
		if (shapesRoot.select('.curve-' + key).empty()) {

			// adding curve elements
			let curvePath = shapesRoot.append('path')
				.attr('class', 'data-curve-line curve-'+key)
				.attr('fill', 'none')
				.attr('stroke', curveColor)
				.attr('stroke-opacity', curveOpacity)
				.attr('stroke-width', 4);

			if (fillCurve) {
				curvePath = shapesRoot.append('path')
					.attr('class', 'data-curve-fill curve-'+key)
					.attr('stroke', 'none')
					.attr('fill', curveColor)
					.attr('fill-opacity', curveOpacity * 0.75);
			}

			if (tooltip) {
				let me = this;
				let cursor = shapesRoot.append('g')
					.attr('class', 'curve-cursor-'+key)
					.attr('pointer-events', 'none')
					.attr('opacity', 0);
				cursor.append('circle')
					.attr('cx', 0)
					.attr('cy', 0)
					.attr('r', 4)
					.attr('fill', 'white');
				cursor.append('line')
					.attr('x1', 0)
					.attr('y1', 0)
					.attr('x2', 0)
					.attr('y2', 1000)
					.attr('stroke', 'white')
					.attr('stroke-width', 2);

				curvePath.on('mouseover mousemove', function (datum) {
						let mouseCoords = d3.mouse(me._graphElement.node());
						let xPos: Date = (me._graphTimeAxis.scale() as any).invert(mouseCoords[0]);
						let bisector = d3.bisector((d: TimeGraphData) => { return new Date(d.x); }).left;
						let i = bisector(datum, xPos, 1);

						let date1 = new Date(datum[i].x);
						let date0 = new Date(datum[i-1].x);
						let ratio = (xPos.getTime() - date0.getTime()) / (date1.getTime() - date0.getTime());
						let value = datum[i-1].y * (1 - ratio) + datum[i].y * ratio;

						let content = tooltip.replace('{y}', `<em>${value.toFixed(1)}</em`)
							.replace('{x}', `<em>${moment(xPos).format('L')}</em>`);

						let yScale = me._graphDataAxis.scale();

						me.showTooltip(mouseCoords[0], mouseCoords[1], content);

						shapesRoot.select('.curve-cursor-'+key)
							.attr('opacity', 1)
							.attr('transform', `translate(${mouseCoords[0]}, ${yScale(value)})`)
							.select('line')
							.attr('y2', yScale(0) - yScale(value));
					})
					.on('mouseout', function () {
						me.hideTooltip();
						shapesRoot.select('.curve-cursor-'+key)
							.transition()
							.attr('opacity', 0);
					});
			}

		}

		// apply new data
		shapesRoot.selectAll('.curve-' + key).datum(points);
	}

	drawStackedCurves(key: string,
					curvesArray: { points: { x: any, y: number }[], color: string, opacity: number, label: string }[],
					tooltip?: string) {
		if (!curvesArray || !curvesArray.length) { return; }

		// for each curve, transform points to replace y with yMax and yMin
		let data = curvesArray as any;
		for (let i = 0; i < data.length; i++) {
			data[i].points = data[i].points.map((p, index) => {
				let previous = data[i-1] ? data[i-1].points : [];
				let previousPoint = previous[index] || {};
				return {
					x: p.x,
					yMax: p.y + (previousPoint.yMax || 0),
					yMin: previousPoint.yMax || 0,
				};
			});
		}
		data.reverse();

		let shapesRoot = this._graphElement.select('.shapes-root');

		// apply data and create elements
		let newcurves = shapesRoot.selectAll('.stackedcurves-' + key).data(data)
			.enter()
			.append('g')
			.attr('class', 'stackedcurves-'+key);

		// handle entering curves, create path and give parent datum
		newcurves.selectAll('path').data(d => d);

		newcurves.append('path')
			.attr('class', 'data-stacked-curve-line')
			.attr('fill', 'none')
			.attr('pointer-events', 'none')
			.attr('stroke', d => d.color)
			.attr('stroke-opacity', d => d.opacity)
			.attr('stroke-width', 4);

		let fillAreas = newcurves.append('path')
			.attr('class', 'data-stacked-curve-fill')
			.attr('stroke', 'none')
			.attr('fill', d => d.color)
			.attr('stroke', 'none')
			.attr('fill-opacity', d => d.opacity * 0.75);

		if (tooltip) {
			let me = this;
			newcurves.selectAll('g').data(d => d);
			let newCursors = newcurves.append('g')
				.attr('class', 'curve-cursor')
				.attr('pointer-events', 'none')
				.attr('opacity', 0);
			newCursors.append('circle')
				.attr('cx', 0)
				.attr('cy', 0)
				.attr('r', 4)
				.attr('fill', 'white');
			newCursors.append('line')
				.attr('x1', 0)
				.attr('y1', 0)
				.attr('x2', 0)
				.attr('y2', 1000)
				.attr('stroke', 'white')
				.attr('stroke-width', 2);

			newcurves.on('mouseover mousemove', function (datum) {
					let mouseCoords = d3.mouse(me._graphElement.node());
					let xPos: Date = (me._graphTimeAxis.scale() as any).invert(mouseCoords[0]);
					let bisector = d3.bisector((d: any) => { return new Date(d.x); }).left;
					let i = bisector(datum.points, xPos, 1);

					let date1 = new Date(datum.points[i].x);
					let date0 = new Date(datum.points[i-1].x);
					let ratio = (xPos.getTime() - date0.getTime()) / (date1.getTime() - date0.getTime());
					let valueMax = datum.points[i-1].yMax * (1 - ratio) + datum.points[i].yMax * ratio;
					let valueMin = datum.points[i-1].yMin * (1 - ratio) + datum.points[i].yMin * ratio;

					let content = tooltip.replace('{y}', `<em>${(valueMax - valueMin).toFixed(1)}</em`)
						.replace('{x}', `<em>${moment(xPos).format('L')}</em>`)
						.replace('{label}', `<em>${datum.label}</em>`);

					let yScale = me._graphDataAxis.scale();

					me.showTooltip(mouseCoords[0], mouseCoords[1], content);

					d3.select(this).select('.curve-cursor')
						.attr('opacity', 1)
						.attr('transform', `translate(${mouseCoords[0]}, ${yScale(valueMax)})`)
						.select('line')
						.attr('y2', yScale(valueMin) - yScale(valueMax));
				})
				.on('mouseout', function () {
					me.hideTooltip();
					d3.select(this).select('.curve-cursor')
						.transition()
						.attr('opacity', 0);
				});
		}

		// delete exiting
		shapesRoot.selectAll('.stackedcurves-' + key).exit().remove();
	}

	drawMarker(key: string, date: Date, color: string, tooltip?: string) {
		if (!date) { return; }

		let shapesRoot = this._graphElement.select('.shapes-root');

		// create element if necessary
		if (shapesRoot.select('.marker-' + key).empty()) {
			let shape = shapesRoot.append('g')
				.attr('class', 'data-marker marker-'+key);
			shape.append('circle')
				.attr('cx', 0)
				.attr('cy', 0)
				.attr('r', 4)
				.attr('fill', color);
			shape.append('line')
				.attr('x1', 0)
				.attr('y1', 0)
				.attr('x2', 0)
				.attr('y2', -1000)
				.attr('stroke', color)
				.attr('stroke-width', 2)
				.attr('stroke-dasharray', '4, 4');

			if (tooltip) {
				let me = this;
				shape.append('line')
					.attr('x1', 0)
					.attr('y1', 0)
					.attr('x2', 0)
					.attr('y2', -1000)
					.attr('stroke', 'white')
					.attr('stroke-width', 12)
					.attr('stroke-opacity', 0)
					.on('mouseover mousemove', function (datum) {
						let mouseCoords = d3.mouse(me._graphElement.node());

						let content = tooltip.replace('{date}', `<em>${moment(datum).format('LL')}</em>`);
						me.showTooltip(mouseCoords[0], mouseCoords[1], content);

						d3.select(this).attr('stroke-opacity', 0.2);
					})
					.on('mouseout', function () {
						me.hideTooltip();
						d3.select(this).attr('stroke-opacity', 0);
					});
			}
		}

		// apply new data
		shapesRoot.select('.marker-' + key)
			.datum(date)
			.selectAll('line')
			.datum(date);
	}

	drawBars(key: string, points: { x: string, width: number, y: number} [], barColor: string, barOpacity: number, tooltip?: string) {
		if (!points || !points.length) { return; }

		let shapesRoot = this._graphElement.select('.shapes-root');

		// apply data and create elements
		let entering = shapesRoot.selectAll('.bars-' + key).data(points)
			.enter()
			.append('rect')
			.attr('class', 'data-bar bars-' + key)
			.attr('fill', barColor)
			.attr('fill-opacity', barOpacity);

		// apply tooltip event
		if (tooltip) {
			let me = this;
			entering.on('mouseover mousemove', function (d) {
				let mouseCoords = d3.mouse(me._graphElement.node());

				let content = tooltip.replace('{y}', `<em>${d.y.toFixed(1)}</em>`)
					.replace('{x}', `<em>${moment(d.x).format('L')}</em>`);

                me.showTooltip(mouseCoords[0], mouseCoords[1], content);

				d3.select(this).attr('fill', 'white');
			})
			.on('mouseout', function () {
				me.hideTooltip();
				d3.select(this).attr('fill', barColor);
			});
		}

		// delete exiting
		shapesRoot.selectAll('.bars-' + key).exit().remove();
	}

	drawStackedBars(key: string,
					data: { x: any, width: number, sum: number, blocks:
						{ height: number, color: string, opacity: number, label: string }[] }[],
					tooltip?: string) {
		if (!data || !data.length) { return; }

		let shapesRoot = this._graphElement.select('.shapes-root');

		// apply data and create elements
		let newbars = shapesRoot.selectAll('.stackedbars-' + key).data(data)
			.enter()
			.append('g')
			.attr('class', 'data-stackedbar stackedbars-' + key);

		// handle nested rects, give them a an object like { x, width, color, opacity, baseY, height }
		let entering = newbars.selectAll('rect')
			.data(d => d.blocks.map((block, blockIndex) => {
				let previousValue = 0;
				if (blockIndex > 0) {
					previousValue = d3.sum(
						d.blocks.slice(0, blockIndex),
						(entry: any) => entry.height
					);
				}
				return {
					x: d.x,
					label: block.label,
					width: d.width,
					color: block.color,
					opacity: block.opacity,
					baseY: previousValue,
					height: block.height,
				};
			}))
			.enter()
			.append('rect');
		newbars.selectAll('rect').exit().remove();

		// delete exiting
		shapesRoot.selectAll('.stackedbars-' + key).exit().remove();

		// apply tooltip event
		if (tooltip) {
			let me = this;
			entering.on('mouseover mousemove', function (d) {
				let mouseCoords = d3.mouse(me._graphElement.node());

				let content = tooltip.replace('{y}', `<em>${d.height.toFixed(1)}</em>`)
					.replace('{x}', `<em>${moment(d.x).format('L')}</em>`)
					.replace('{label}', `<em>${d.label}</em>`);

				me.showTooltip(mouseCoords[0], mouseCoords[1], content);

				d3.select(this).attr('fill', 'white');
			})
			.on('mouseout', function (d) {
				me.hideTooltip();
				d3.select(this).transition().attr('fill', d.color);
			});
		}
	}

	showTooltip(x: number, y: number, text: string) {
		this._graphTooltip.style('visibility', 'visible')
			.classed('visible', true)
			.style('top', `${y}px`)
			.style('left', `${x}px`)
			.html(text);
	}

	hideTooltip() {
		this._graphTooltip.style('visibility', 'hidden')
			.classed('visible', false)
			.html('');
	}

	render() {
		let className = `time-graph ${this.props.className || ''}`;
		let containerStyle = Object.assign({
			height: this.props.heightPixels,
			padding: PADDING,
			paddingLeft: 0,
			paddingRight: 0,
			position: 'relative',
		}, this.props.style);

		let svgStyle = {
			position: 'absolute',
			top: 0, bottom: 0, left: 0, right: 0,
		};

		return (
			<div
				className={className} style={containerStyle} id={this.props.id}
				ref={(el) => this._containerElement = el}
			>
			</div>
		);
	}
}

(TimeGraphComponent as any).defaultProps = {
	viewCoord: 0,
	viewDaysRange: 10,
	heightPixels: 120,
};


// DATA CURVE
// component without render, only holding data for a graph ; a key is mandatory
// must be passed as a child to a GraphComponent
// x format is number or ISO Date string
// y is a number

interface dataCurveProps {
	dataKey: string,
	tooltip?: string,		// {y} and {x} will be replaced by their respective value
	points: { x: any, y: number }[],
	curveColor: string,		// CSS color
	curveOpacity: number,	// 0 to 1
	fillCurve?: boolean,
	overflowValue?: number,		// curve will change color above this value
	overflowColor?: string,
}
interface dataCurveState {

}

export class DataCurve extends Component<dataCurveProps, dataCurveState> {
}


// STACKED DATA CURVES
// component without render, only holding data for a graph ; a key is mandatory
// must be passed as a child to a GraphComponent
// x format is number or ISO Date string
// y is a number

interface stackedDataCurvesProps {
	dataKey: string,
	tooltip?: string,		// {y} and {x} will be replaced by their respective value
	curves: {
		points: { x: any, y: number }[],
		color: string,		// CSS color
		opacity: number,	// 0 to 1
		label: string,
	}[],
}
interface stackedDataCurvesState {

}

export class StackedDataCurves extends Component<stackedDataCurvesProps, stackedDataCurvesState> {
}


// TIME MARKER
// component without render, only holding data for a graph ; a key is mandatory
// must be passed as a child to a GraphComponent
// date is ISO Date string

interface timeMarkerProps {
	dataKey: string,
	tooltip?: string,		// {date} will be replaced by its value
	date: Date,
	color: string,	 	// CSS color
}
interface timeMarkerState {

}

export class TimeMarker extends Component<timeMarkerProps, timeMarkerState> {
}


// BAR CHART
// component without render, only holding data for a graph ; a key is mandatory
// must be passed as a child to a GraphComponent
// x format is number or ISO Date string (center of the bar)
// width is a number (if time graph, unit = day)
// y is a number

interface barChartProps {
	dataKey: string,
	tooltip?: string,		// {y} and {x} will be replaced by their respective value
	points: { x: any, width: number, y: number }[],
	barColor: string,		// CSS color
	barOpacity: number,		// 0 to 1
}
interface barChartState {

}

export class BarChart extends Component<barChartProps, barChartState> {
}


// STACKED BAR CHART
// same as bar chart, but each x coord can hold several blocks of data

interface stackedBarChartProps {
	dataKey: string,
	tooltip?: string,		// {y} and {x} will be replaced by their respective value
	points: { x: any, width: number, sum: number, blocks: { height: number, color: string, opacity: number, label: string }[] }[],
}
interface stackedBarChartState {

}

export class StackedBarChart extends Component<stackedBarChartProps, stackedBarChartState> {
}