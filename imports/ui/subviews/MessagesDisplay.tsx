import * as React from 'react';
import * as ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import CloseButton from '../controls/CloseButton';


interface messagesDisplayProps {
    messages: Message[],
}

interface messagesDisplayState {

}

class MessagesDisplay extends Component<messagesDisplayProps, messagesDisplayState> {
    constructor(props: messagesDisplayProps) {
        super(props);
        this.state = {

        };
    }

    render() {
        let containerStyle = {
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translate(-50%, 0)',
            width: 400,
            maxWidth: '80%',
            zIndex: 1000,
        };

        let messageTypeLabels = [
            i18n.__('Information'),
            i18n.__('Warning'),
            i18n.__('Error'),
        ];
        let messageClasses = [
            'info',
            'warning',
            'error'
        ];

        return (
            <div className="messages-display flex-col-inv" style={containerStyle}>
                <ReactCSSTransitionGroup
                    transitionName="uimessage"
                    transitionEnter={false}
                    transitionLeaveTimeout={300}>
                    {
                        this.props.messages.map(msg =>
                            <div key={msg._id}>
                                <div className={'padding-inner-gutter pos-relative message-pane '+messageClasses[msg.type]}>
                                    <CloseButton onClick={() => Messages.remove(msg._id)} bright={true} />
                                    <div className="section-title small">{msg.title || messageTypeLabels[msg.type]}</div>
                                    <span>{msg.message}</span>
                                </div>
                                <div className="spacer-row" />
                            </div>
                        )
                    }
                </ReactCSSTransitionGroup>
            </div>
        );
    }
}

export default createContainer((props: messagesDisplayProps) => {
    return {
        messages: Messages.find().fetch(),
    };
}, MessagesDisplay);

// local collection
interface Message {
    _id?: string,
    type: MESSAGE_TYPE,
    message: string,
    title?: string,
}
const Messages = new Mongo.Collection<Message>(null);
enum MESSAGE_TYPE {
    INFO,
    WARNING,
    ERROR,
}

const DEFAULT_HIDE_DELAY = 1600;
const DEFAULT_ERROR_HIDE_DELAY = 3000;

export function showInformationMessage(message: string, title?: string, hideTimeout?: number) {
    let id = Messages.insert({
        type: MESSAGE_TYPE.INFO,
        message,
        title
    });
    setTimeout(() => Messages.remove(id), hideTimeout || DEFAULT_HIDE_DELAY);
    console.info(`${title || i18n.__('Info')}: ${message}`);
}

export function showWarningMessage(message: string, title?: string, hideTimeout?: number) {
    let id = Messages.insert({
        type: MESSAGE_TYPE.WARNING,
        message,
        title
    });
    setTimeout(() => Messages.remove(id), hideTimeout || DEFAULT_HIDE_DELAY);
    console.warn(`${title || i18n.__('Warning')}: ${message}`);
}

export function showTemporaryErrorMessage(message: string, title?: string, hideTimeout?: number) {
    let id = Messages.insert({
        type: MESSAGE_TYPE.ERROR,
        message,
        title
    });
    setTimeout(() => Messages.remove(id), hideTimeout || DEFAULT_HIDE_DELAY);
    console.error(`${title || i18n.__('Error')}: ${message}`);
}

export function showErrorMessage(message: string, title?: string, hideTimeout?: number) {
    let id = Messages.insert({
        type: MESSAGE_TYPE.ERROR,
        message,
        title
    });
    setTimeout(() => Messages.remove(id), hideTimeout || DEFAULT_ERROR_HIDE_DELAY);
    console.error(`${title || i18n.__('Error')}: ${message}`);
}