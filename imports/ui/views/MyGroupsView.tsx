import * as React from 'react';
import { Component } from 'react';
import ReactModal2 from 'react-modal2';
import { browserHistory } from 'react-router';
import { createContainer } from 'meteor/react-meteor-data';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

import Toolbar from '../subviews/Toolbar';

import { Employees, Employee, EmployeeGroups, EmployeeGroup } from '../../data/collections';
import { EmployeeList, EmployeeGroupList } from '../subviews/EmployeeManagementLists';
import ProjectsList from '../subviews/ProjectList';


interface myGroupsProps {
    // router
    routeParams: any,

    // reactive
    currentUserId: string,
    currentEmployee: Employee,
}

interface myGroupsState {

}

class MyGroupsView extends Component<myGroupsProps, myGroupsState> {

    constructor(props: myGroupsProps) {
        super(props);

        this.state = {};
    }

    render() {
        let selectedGroupId = this.props.routeParams.groupId;

        return (
            <div className="my-groups-view width-100 with-toolbar">
                <div className="flex-col management-page-container">

                    <div className="page-title">
                        { i18n.__('My Groups') }
                    </div>
                    <div className="spacer-row" />

                    <div className="">
                        <EmployeeGroupList
                            isSelected={(group, index) => group._id == selectedGroupId }
                            displayHorizontal={true}
                            showSearchBar={false}
                            onClick={group => browserHistory.replace('/mygroups/'+group._id)}
                            memberIdFilter={this.props.currentEmployee && this.props.currentEmployee._id}
                        />
                    </div>
                    <div className="spacer-row" />

                    {
                        selectedGroupId &&
                        <div className="scroll-y flex-row">

                            <div className="flex-col flex-grow width-50">

                                <div className="section-title">
                                    { i18n.__('Managers') }
                                </div>
                                <div className="">
                                    <EmployeeList
                                        showSearchBar={false}
                                        managerGroupIdFilter={selectedGroupId}
                                        showEmployeeGroups={false}
                                        showEmployeeContactInfo={true}
                                        showEmployeePosition={true}
                                    />
                                </div>

                                <div className="spacer-row" />

                                <div className="section-title">
                                    { i18n.__('Employees') }
                                </div>
                                <div className="">
                                    <EmployeeList
                                        showSearchBar={false}
                                        notManagerGroupIdFilter={selectedGroupId}
                                        showEmployeeGroups={false}
                                        showEmployeeContactInfo={true}
                                        showEmployeePosition={true}
                                    />
                                </div>
                            </div>

                            <div className="spacer-col" />

                            <div className="flex-col flex-grow width-50">
                                <div className="section-title">
                                    { i18n.__('Current Projects') }
                                </div>
                                <div className="padding-inner-gutter lowkey-pane">
                                    <ProjectsList
                                        columnCount={2}
                                        enableLinks={true}
                                        displayGroupButtons={false}
                                        displaySearchBar={false}
                                        activeProjectsOnly={true}
                                        groupIdFilter={selectedGroupId}
                                    />
                                </div>
                            </div>

                        </div>
                    }

                </div>

                <Toolbar />
            </div>
        );
    }
}

export default createContainer<myGroupsProps>((props: myGroupsProps) => {
    Meteor.subscribe('current.employee');
    let currentUserId = Meteor.userId();
    return {
        currentUserId,
        currentEmployee: Employees.findOne({ userId: currentUserId }),
    };
}, MyGroupsView);