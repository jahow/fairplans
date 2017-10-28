import * as React from 'react';
import { Component } from 'react';

interface ExpandableSectionProps {
    expanded?: boolean,
    title: string | any,
}

export default class ExpandableSection extends Component<ExpandableSectionProps, any> {

    constructor(props) {
        super(props);
        this.state = { expanded: this.props.expanded };
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() { this.setState({ expanded: !this.state.expanded }); }

    render() {
        let isTitleSimple = typeof this.props.title == "string";

        return (
            <section className={"expandable-section " + (this.state.expanded ? "expanded" : "") }>
                <div className="expand-border"></div>
                <svg className="expand-icon" viewBox="-6 -6 20 12" onClick={this.handleClick}>
                    <rect width="8" height="8" x="1" y="-4" strokeWidth="1" />
                    <line x1="2.5" y1="0" x2="7.5" y2="0" strokeWidth="1" />
                    {
                        !this.state.expanded &&
                        <line y1="-2.5" x1="5" y2="2.5" x2="5" strokeWidth="1" />
                    }
                </svg>
                {
                    isTitleSimple &&
                    <div className="section-title" onClick={this.handleClick}>{ this.props.title }</div>
                }
                {
                    !isTitleSimple &&
                    <div className="section-title-container" onClick={this.handleClick}>{ this.props.title }</div>
                }
                <div className="expandable-content">
                    { this.props.children }
                </div>
                <div className="spacer-row small" />
            </section>
        );
    }
}
