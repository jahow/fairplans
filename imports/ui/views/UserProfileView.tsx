import * as React from 'react';
import { Component } from 'react';
import { Tools, DateTools } from '../../utils/tools';
import ReactModal2 from 'react-modal2';
import { Gateway } from 'react-gateway';
import { createContainer } from 'meteor/react-meteor-data';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import CloseButton from '../controls/CloseButton';
import InputFormManager, { PropertyInfo } from '../subviews/InputFormManager';
import Toolbar from '../subviews/Toolbar';
import {showInformationMessage, showErrorMessage, showTemporaryErrorMessage, showWarningMessage} from '../subviews/MessagesDisplay';

import { Employees, Employee, EmployeeGroups, EmployeeGroup } from '../../data/collections';


interface userProfileProps {
    // reactive
    currentUser: Meteor.User,
    currentEmployee: Employee,
}

interface userProfileState {
    showEditPasswordModal?: boolean,
}

class UserProfileView extends Component<userProfileProps, userProfileState> {

    constructor(props: userProfileProps) {
        super(props);

        this.state = {
            showEditPasswordModal: false
        };

        this.showEditPasswordModal = this.showEditPasswordModal.bind(this);
        this.hideEditPasswordModal = this.hideEditPasswordModal.bind(this);
        this.handleEmployeeSave = this.handleEmployeeSave.bind(this);
        this.handlePasswordChange = this.handlePasswordChange.bind(this);
    }

    showEditPasswordModal() {
        this.setState({ showEditPasswordModal: true });
    }
    hideEditPasswordModal() {
        this.setState({ showEditPasswordModal: false });
    }

    handleEmployeeSave(employeeId: string, newValues: Object) {
        Meteor.call('employee.update', { employeeId, newValues }, (err, res) => {
            if (err) {
                showErrorMessage(err.reason || i18n.__('Profile save failed (unknown reason).'));
                return;
            }
            showInformationMessage(i18n.__('Your profile has been successfully saved.'));
        });
    }

    handlePasswordChange(id: string, newValues: any) {
        if (newValues.newPassword != newValues.newPassword2) {
            showTemporaryErrorMessage(i18n.__('Passwords do not match.'));
            return;
        }

        Accounts.changePassword(newValues.oldPassword, newValues.newPassword, (err) => {
            if (err) {
                showTemporaryErrorMessage(err.reason);
                return;
            }
            // console.log('success!');
            showInformationMessage(i18n.__('Password successfully changed.'));
            this.hideEditPasswordModal();
        });
    }

    render() {
        let formProps: PropertyInfo[] = [
            {
                propName: 'userName',
                label: i18n.__('Login'),
                seeThrough: true,
                editable: false,
            },
            {
                propName: '',
                label: i18n.__('Password'),
                inputType: <div className="button small" onClick={this.showEditPasswordModal}>
                    { i18n.__('CHANGE MY PASSWORD') }
                </div>
            },
            {
                propName: 'lastName',
                label: i18n.__('Last Name'),
                editable: true,
                inputSize: 'small',
            },
            {
                propName: 'firstName',
                label: i18n.__('First Name'),
                editable: true,
                inputSize: 'small',
            },
        ];

        let passwordFormProps: PropertyInfo[] = [
            {
                propName: 'oldPassword',
                label: i18n.__('Previous Password'),
                editable: true,
                inputType: 'password',
                inputSize: 'small'
            },
            {
                propName: 'newPassword',
                label: i18n.__('New Password'),
                editable: true,
                inputType: 'password',
                inputSize: 'small'
            },
            {
                propName: 'newPassword2',
                label: i18n.__('Repeat New Password'),
                editable: true,
                inputType: 'password',
                inputSize: 'small'
            },
        ];
        let passwordFormObject = {};

        return (
            <div className="user-profile-view width-100 with-toolbar">
                <div className="flex-col management-page-container">

                    <div className="page-title">
                        { i18n.__('My Profile') }
                    </div>
                    <div className="spacer-row" />

                    <div className="flex-row flex-grow">
                        {
                            this.props.currentEmployee &&
                            <div className="flex-col width-50">

                                <div className="section-title">
                                    { i18n.__('My Settings') }
                                </div>
                                <InputFormManager
                                    originalValues={this.props.currentEmployee}
                                    propertiesInfo={formProps}
                                    idPropName="_id"
                                    showSaveButton={true}
                                    allowSave={ true }
                                    showRevertButton={true}
                                    onSave={this.handleEmployeeSave}
                                />

                            </div>
                        }
                        {
                            !this.props.currentEmployee &&
                            <div className="flex-col width-50">

                                { i18n.__('This user account is not linked to an employee.')}

                            </div>
                        }
                        {/*<div className="button-bar">*/}
                        {/*<button className="" onClick={() => showInformationMessage('test info', 'test titre')}>*/}
                            {/*test info*/}
                        {/*</button>*/}
                        {/*<button className="" onClick={() => showWarningMessage('test warning', 'test titre')}>*/}
                            {/*test warning*/}
                        {/*</button>*/}
                        {/*<button className="" onClick={() => showTemporaryErrorMessage('test error', 'test titre')}>*/}
                            {/*test error*/}
                        {/*</button>*/}
                            {/*</div>*/}
                    </div>
                </div>

                {
                    this.state.showEditPasswordModal &&
                    <Gateway into="modal">
                        <ReactModal2
                            onClose={this.hideEditPasswordModal}
                            closeOnEsc={true}
                            closeOnBackdropClick={true}
                            backdropClassName='overlay-pane-background'
                            modalClassName='overlay-pane centered forward-pane padding-outer-gutter flex-col section width-50'
                        >
                            <CloseButton onClick={this.hideEditPasswordModal} bright={true} />
                            <div className="section-title">{ i18n.__('Change Password') }</div>

                            <InputFormManager
                                originalValues={passwordFormObject}
                                propertiesInfo={passwordFormProps}
                                idPropName="_id"
                                showSaveButton={ i18n.__('SAVE NEW PASSWORD') }
                                showCancelButton={ true }
                                allowSave={ true }
                                onSave={ this.handlePasswordChange }
                                onCancel={ this.hideEditPasswordModal }
                            />
                        </ReactModal2>
                    </Gateway>
                }

                <Toolbar />
            </div>
        );
    }
}

export default createContainer<userProfileProps>((props: userProfileProps) => {
    Meteor.subscribe('current.employee');
    let currentUser = Meteor.user() || {};
    return {
        currentUser,
        currentEmployee: Employees.findOne({ userId: currentUser._id }),
    };
}, UserProfileView);