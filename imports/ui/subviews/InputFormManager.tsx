import * as React from 'react';
import { Component } from 'react';

import FormInput from '../controls/FormInput';
import ToggleIcon from '../controls/ToggleIcon';
import ItemBlockList from '../controls/ItemBlockList';

import { TAPi18n as i18n } from 'meteor/tap:i18n';
import {showInformationMessage, showTemporaryErrorMessage} from "./MessagesDisplay";


export interface PropertyInfo {
    propName: string,
    label?: string,
    inputType?: 'text' | 'combo' | 'date' | 'number' | 'percentage' | 'password' | 'objectlist' | 'toggle' | 'togglelist' | 'option' | Object | 'time',        // default: text
    inputSize?: 'x-small' | 'small' | 'medium' | 'full',     // default: full
    required?: boolean,     // if true, can't save without it
    lineCount?: number,     // allow the use of multiline text fields
    hidden?: ((values: any) => boolean) | boolean,
    editable?: ((values: any) => boolean) | boolean,        // if a function: evaluates based on other values
    seeThrough?: boolean,
    transform?: (value: any) => any,        // if set, will change how the value is displayed
    placeholder?: string,
    excludeFromCallbacks?: boolean,         // if true, this prop will not be sent back when saving

    // combo only
    showAllOptions?: boolean,   // display all options instead of just one

    // object list only
    objectFields?: PropertyInfo[],
    objectPreventAdd?: boolean,
    objectPreventDelete?: boolean,

    // toggle list & combo & option
    valueList?: (any | { value: any, label: string })[],

    // number only
    numberMin?: number,
    numberMax?: number,
    numberStep?: number,

    className?: string,     // class name to apply to the field container
}

interface inputFormProps {
    originalValues: Object,             // an object holding properties that will be read/modified
    propertiesInfo: PropertyInfo[],     // info regarding the properties (input type, size, etc.); only these objectCardProps will be renderd

    showSaveButton?: boolean | string,        // if a string is specified, it will be used as butten label
    showRevertButton?: boolean | string,
    showArchiveButton?: boolean | string,
    showDeleteButton?: boolean | string,
    showCancelButton?: boolean |string,

    allowSave?: boolean,        // if unallowed, button will be greyed out
    allowArchive?: boolean,
    allowDelete?: boolean,

    onSave?: (id: string, modifiedValues: Object) => any,
    onArchive?: (id: string) => any,
    onDelete?: (id: string) => any,
    onCancel?: (id: string) => any,
    onAfterRevert?: (id: string) => any,

    idPropName?: string,             // name of the property that will be used as id when sending back data
    resetFieldsOnSave?: boolean,
    readOnly?: boolean,     // sets all fields as not editable; show only a "close" button
    onClose?: (id: string) => any,      // close button is only visible in read only mode

    id?: string,
    className?: string,
    style?: Object,
}

interface inputFormState {
    currentValues?: Object,
    valuesChanged?: boolean,     // true if new values were input by the user
}

export default class InputFormManager extends Component<inputFormProps, inputFormState> {

    constructor(props: inputFormProps) {
        super(props);

        this.state = {
            currentValues: props.originalValues,
            valuesChanged: false,
        };

        this.renderProp = this.renderProp.bind(this);
        this.editValue = this.editValue.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleArchive = this.handleArchive.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleRevert = this.handleRevert.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }

    _needsRefresh = false;
    _firstElement: HTMLElement;

    // LIFECYCLE

    // when new objectCardProps are received: if the object changed (based on id), reload
    componentWillReceiveProps(newProps: inputFormProps) {
        let currentId = this.props.originalValues[this.props.idPropName];
        let newId = newProps.originalValues[newProps.idPropName];

        // id changed; load new object and reset state
        if (currentId != newId || this._needsRefresh) {
            this.setState({
                currentValues: newProps.originalValues,
                valuesChanged: false,
            });
        }
    }

    // util
    getFilteredValues() {
        // let values = Object.assign({}, this.state.currentValues);
        let values = {};
        for (let i = 0; i < this.props.propertiesInfo.length; i++) {
            let prop = this.props.propertiesInfo[i];
            if (prop.excludeFromCallbacks) { continue; }
            values[prop.propName] = this.state.currentValues[prop.propName];
        }
        return values;
    }

    // ACTION HANDLERS
    handleSave(e) {
        e.preventDefault();

        // check if required fields are set
        let missingFields = [];
        for (let i = 0; i < this.props.propertiesInfo.length; i++) {
            if (!this.props.propertiesInfo[i].required) { continue; }
            let value = this.state.currentValues[this.props.propertiesInfo[i].propName];
            if (!value) {
                missingFields.push(this.props.propertiesInfo[i].label);
            }
        }
        if (missingFields.length > 0) {
            showTemporaryErrorMessage(`${i18n.__('The following fields are required')}: ${missingFields.join(', ')}`);
            return;
        }

        if (this.props.onSave) {
            this.props.onSave(
                this.props.originalValues[this.props.idPropName],
                this.getFilteredValues());
            this._needsRefresh = true;

            if (this.props.resetFieldsOnSave) {
                this.handleRevert();
            }
        }
    }
    handleRevert() {
        this.setState({
            currentValues: this.props.originalValues,
            valuesChanged: false,
        });

        // set focus on first element
        if (this._firstElement) {
            this._firstElement.focus();
        }

        if (this.props.onAfterRevert) {
            this.props.onAfterRevert(this.props.originalValues[this.props.idPropName]);
        }
    }
    handleArchive() {
        if (this.props.onArchive) {
            this.props.onArchive(this.props.originalValues[this.props.idPropName]);
        }
    }
    handleDelete() {
        if (this.props.onDelete) {
            this.props.onDelete(this.props.originalValues[this.props.idPropName]);
        }
    }
    handleCancel() {
        if (this.props.onCancel) {
            this.props.onCancel(this.props.originalValues[this.props.idPropName]);
        }
    }
    handleClose() {
        if (this.props.onClose) {
            this.props.onClose(this.props.originalValues[this.props.idPropName]);
        }
    }

    // VALUE CHANGE HANDLERS
    editValue(propName: string, newValue: any) {
        let currentValues = Object.assign({}, this.state.currentValues);
        if (currentValues[propName] == newValue) { return; }

        currentValues[propName] = newValue;
        this.setState({
            currentValues,
            valuesChanged: true,
        });
    }

    renderProp(propInfo: PropertyInfo, index: number) {
        let hidden = typeof propInfo.hidden === "function" ? propInfo.hidden(this.state.currentValues) : propInfo.hidden;
        if (hidden) { return ''; }

        return (
            <div key={'prop-'+propInfo.propName+'-'+index.toString()}>
                <div className="flex-row flex-center flex-start">

                    <div className="width-25 font09 flex-row no-select flex-no-grow flex-no-shrink">
                        <div className="light-text text-right flex-grow">{
                            propInfo.label || propInfo.propName
                        }</div>
                        {/*<div className="spacer-col small" />
                        <div className="light-text flex-no-shrink">➤</div>*/}
                        {
                            propInfo.required &&
                            <span className="">&nbsp;*</span>
                        }
                        <div className="spacer-col small" />
                    </div>

                    {
                        this.renderPropField(propInfo)
                    }

                </div>

                { index < this.props.propertiesInfo.length -1 && <div className="spacer-row small" /> }
            </div>
        );
    }

    renderPropField(propInfo: PropertyInfo) {
        // object list
        if (propInfo.inputType == 'objectlist') {
            return this.renderObjectList(propInfo);
        }

        // an element was specified
        if (propInfo.inputType && typeof propInfo.inputType != 'string') {
            return propInfo.inputType;
        }

        let value = this.state.currentValues[propInfo.propName];
        if (propInfo.transform && value !== null && value !== undefined) { value = propInfo.transform(value); }
        
        let assignFirstElement = (el: HTMLElement) => this._firstElement = this._firstElement || el;

        let sizeClass = 'flex-grow';
        switch (propInfo.inputSize) {
            case 'medium': sizeClass = 'width-60'; break;
            case 'small': sizeClass = 'width-40'; break;
            case 'x-small': sizeClass = 'width-20'; break;
        }

        let editable = typeof propInfo.editable === "function" ? propInfo.editable(this.state.currentValues) : propInfo.editable;

        switch(propInfo.inputType) {

            case 'combo':
                return <FormInput
                    innerRef={assignFirstElement}
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    valuesList={ propInfo.valueList }
                    value={ value }
                    inputType="select"
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, newVal) }
                    placeholder={ propInfo.placeholder }
                    required={propInfo.required}
                    editable={ !this.props.readOnly && editable } />;

            case 'date':
                return <FormInput
                    innerRef={assignFirstElement}
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    inputType="date"
                    value={ value }
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, newVal) }
                    placeholder={ propInfo.placeholder }
                    required={propInfo.required}
                    editable={ !this.props.readOnly && editable } />;

            case 'number':
                return <FormInput
                    innerRef={assignFirstElement}
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    inputType="number"
                    min={propInfo.numberMin}
                    max={propInfo.numberMax}
                    step={propInfo.numberStep || 1}
                    value={ value }
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, newVal) }
                    placeholder={ propInfo.placeholder }
                    required={propInfo.required}
                    editable={ !this.props.readOnly && editable } />;

            case 'time':
                return <FormInput
                    innerRef={assignFirstElement}
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    inputType="time"
                    value={ value }
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, newVal) }
                    placeholder={ propInfo.placeholder }
                    required={propInfo.required}
                    step={propInfo.numberStep || 1}
                    editable={ !this.props.readOnly && editable } />;

            case 'password':
                return <FormInput
                    innerRef={assignFirstElement}
                    inputType="password"
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    value={ value }
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, newVal) }
                    placeholder={ propInfo.placeholder }
                    required={propInfo.required}
                    editable={ !this.props.readOnly && editable } />;

            case 'percentage':
                return <FormInput
                    innerRef={assignFirstElement}
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    inputType="number"
                    min={0}
                    max={100}
                    step={propInfo.numberStep || 1}
                    value={ Math.round(value * 100).toString() }
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, Math.round(newVal) / 100) }
                    placeholder={ propInfo.placeholder }
                    editable={ !this.props.readOnly && editable }
                    required={propInfo.required}
                    overlayRight="%     " />;

            case 'toggle':
                return <ToggleIcon
                    value={value}
                    className="flex-no-grow"
                    locked={this.props.readOnly || !editable}
                    onChange={ newVal => this.editValue(propInfo.propName, newVal) }
                 />;

            case 'togglelist':
                return <div className="flex-row flex-start flex-wrap">
                    {
                        propInfo.valueList.map((toggle, index) => {
                            let v = toggle.value !== undefined ? toggle.value : toggle;
                            return <div key={index} className="flex-row padding-m">
                                <ToggleIcon
                                    value={value.indexOf(v) > -1}
                                    className="flex-no-grow"
                                    locked={this.props.readOnly || !editable}
                                    onChange={ newVal => {
                                        let array: any[] = (value || []).slice();
                                        let v = toggle.value !== undefined ? toggle.value : toggle;
                                        let index = array.indexOf(v);
                                        if (index > -1) { array.splice(index, 1); }
                                        else { array.push(v); }
                                        this.editValue(propInfo.propName, array)
                                    }}
                                    label={ toggle.label ? toggle.label : toggle }
                                    labelOnRight={true}
                                />
                                <div className="spacer-col" />
                            </div>;
                        })
                    }
                </div>;

            case 'option':
                return <div className="flex-row flex-start">
                    {
                        propInfo.valueList.map((toggle, index) => {
                            let v = toggle.value !== undefined ? toggle.value : toggle;
                            return <div className="flex-row" key={index}>
                                <div
                                    className={`button small ${value == v ? 'selected' : ''} ${editable && !this.props.readOnly ? '' : 'disabled'}`}
                                    onClick={() => this.editValue(propInfo.propName, v)}>
                                    { toggle.label ? toggle.label : toggle }
                                </div>
                                <div className="spacer-col small" />
                            </div>;
                        })
                    }
                </div>;

            case 'text':
            default:
                return <FormInput
                    innerRef={assignFirstElement}
                    className={sizeClass}
                    seeThrough={ propInfo.seeThrough }
                    multiline={ propInfo.lineCount > 1 } baseLineCount={ propInfo.lineCount }
                    value={ value }
                    receiveNewValue={ newVal => this.editValue(propInfo.propName, newVal) }
                    placeholder={ propInfo.placeholder }
                    required={propInfo.required}
                    editable={ !this.props.readOnly && editable } />;

        }
    }

    renderObjectList(propInfo: PropertyInfo) {
        let currentItems = (this.state.currentValues[propInfo.propName] || []).slice();
        let displayedItems = currentItems.map((item, index) => {
            if (!propInfo.objectFields) { return {}; }

            return <div className="flex-row flex-center flex-start">
                {
                    propInfo.objectFields.map(field => {
                        return <div className={'flex-row ' + (field.className || '')}>
                            <FormInput
                                value={ item[field.propName] }
                                receiveNewValue={ newVal => {
                                    currentItems[index][field.propName] = newVal;
                                    this.editValue(propInfo.propName, currentItems);
                                }}
                                editable={propInfo.editable && !this.props.readOnly}
                                inputType={field.inputType == 'date' ? 'date' : (field.inputType == 'number' ? 'number' : 'text')}
                                placeholder={ field.placeholder } />
                            <div className="spacer-col" />
                        </div>
                    })
                }
                {
                    !propInfo.objectPreventDelete && !this.props.readOnly &&
                    <div className="button small action-danger"
                        onClick={() => {
                            currentItems.splice(index, 1);
                            this.editValue(propInfo.propName, currentItems);
                        }}
                    >{i18n.__('DELETE')}</div>
                }
            </div>
        });

        // add line button if editable
        if (propInfo.editable && !this.props.readOnly) {
            displayedItems.push(
                <div className="flex-row flex-start">
                    <div
                        className="button small action-dostuff"
                        onClick={() => {
                            currentItems.push({});
                            this.editValue(propInfo.propName, currentItems)
                        }}
                    >
                        {i18n.__('ADD LINE')}
                    </div>
                </div>
            );
        }

        return <ItemBlockList
            items={displayedItems}
            className="flex-grow"
        />;
    }

    render() {
        // check if required fields are set
        let isSaveAllowed = true;
        for (let i = 0; i < this.props.propertiesInfo.length; i++) {
            if (!this.props.propertiesInfo[i].required) { continue; }
            let value = this.state.currentValues[this.props.propertiesInfo[i].propName];
            if (!value) {
                isSaveAllowed = false;
                break;
            }
        }

        return (
            <form
                onSubmit={this.handleSave}
                className={'input-form flex-col '+(this.props.className || '')}
                id={this.props.id}
                style={this.props.style}>

                <button style={{display: 'none'}} type="submit" />

                <div className="flex-col flex-shrink scroll-y">
                {
                    this.props.propertiesInfo.map(this.renderProp)
                }
                </div>

                <div className="spacer-row small" />

                <div className="button-bar flex-no-shrink">
                    {
                        !this.props.readOnly && this.props.showSaveButton && //isSaveAllowed &&
                        <div onClick={this.handleSave}
                            className={'button action-dostuff' + ((this.props.allowSave && this.state.valuesChanged) ? '' : ' disabled')}>
                            { typeof this.props.showSaveButton == 'string' ?
                                this.props.showSaveButton : i18n.__('SAVE')}
                        </div>
                    }
                    {
                        !this.props.readOnly && this.props.showRevertButton &&
                        <div className={'button action-cancel'}
                             onClick={this.handleRevert}>
                            { typeof this.props.showRevertButton == 'string' ?
                                this.props.showRevertButton : i18n.__('REVERT')}
                        </div>
                    }
                    <div className="separator" />
                    {
                        !this.props.readOnly && this.props.showCancelButton &&
                        <div className={'button action-cancel'}
                             onClick={this.handleCancel}>
                            { typeof this.props.showCancelButton == 'string' ?
                                this.props.showCancelButton : i18n.__('CANCEL')}
                        </div>
                    }
                    {
                        !this.props.readOnly && this.props.showArchiveButton &&
                        <div className={'button action-warning' + (this.props.allowArchive ? '' : ' disabled')}
                             onClick={this.handleArchive}>
                            { typeof this.props.showArchiveButton == 'string' ?
                                this.props.showArchiveButton : i18n.__('ARCHIVE')}
                        </div>
                    }
                    {
                        !this.props.readOnly && this.props.showDeleteButton &&
                        <div className={'button action-danger' + (this.props.allowDelete ? '' : ' disabled')}
                             onClick={this.handleDelete}>
                            { typeof this.props.showDeleteButton == 'string' ?
                                this.props.showDeleteButton : i18n.__('DELETE')}
                        </div>
                    }
                    {
                        this.props.readOnly &&
                        <div className={'button action-cancel'}
                             onClick={this.handleClose}>
                            { typeof this.props.showCancelButton == 'string' ?
                                this.props.showCancelButton : i18n.__('CLOSE')}
                        </div>
                    }
                </div>

            </form>
        );
    }
}

(InputFormManager as any).defaultProps = {
    idPropName: '_id'
};