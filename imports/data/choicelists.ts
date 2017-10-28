//import i18n from 'meteor/universe:i18n';
import { TAPi18n as i18n } from 'meteor/tap:i18n';


export let PartnerTypeList = [
	{ get label() { return i18n.__('Customer'); }, value: 0},
	{ get label() { return i18n.__('Supplier'); }, value: 1},
	{ get label() { return i18n.__('Lead'); }, value: 2}
];

export let ProductTypeList = [
	{ get label() { return i18n.__('Service'); }, value: 0},
	{ get label() { return i18n.__('Material'); }, value: 1}
];

export let ProductUnitList = [
    { get label() { return i18n.__('Hour'); }, value: 0},
    { get label() { return i18n.__('Piece'); }, value: 1}
];

export let ProjectStatusList = [
    { get label() { return i18n.__('Planned'); }, value: 0 },
    { get label() { return i18n.__('Scheduled'); }, value: 1 },
    { get label() { return i18n.__('In Progress'); }, value: 2 },
    { get label() { return i18n.__('Closed'); }, value: 3 },
    { get label() { return i18n.__('Canceled'); }, value: 4 }
];

export let ObjectStatusList = [
    { get label() { return i18n.__('Active'); }, value: 0 },
    { get label() { return i18n.__('Disabled'); }, value: 1 },
    { get label() { return i18n.__('Archived'); }, value: 2 }
];

export let AlertLevelList = [
    { get label() { return i18n.__('ALERTLEVEL_NONE'); }, value: 0 },
    { get label() { return i18n.__('ALERTLEVEL_LOW'); }, value: 1 },
    { get label() { return i18n.__('ALERTLEVEL_MEDIUM'); }, value: 2 },
    { get label() { return i18n.__('ALERTLEVEL_HIGH'); }, value: 3 },
    { get label() { return i18n.__('ALERTLEVEL_CRITICAL'); }, value: 4 }
];

export let LanguageList = [
	{ label: "Français", value: 'FR' },
	{ label: "Italiano", value: 'IT' },
	{ label: "English", value: 'EN' },
	{ label: "Español", value: 'ES' },
	{ label: "Deutsch", value: 'DE' }
];

export let CountryList = [
	{ get label() { return i18n.__("France"); }, value: 'FR' },
	{ get label() { return i18n.__("Switzerland"); }, value: 'CH' },
	{ get label() { return i18n.__("England"); }, value: 'GB' },
	{ get label() { return i18n.__("Germany"); }, value: 'DE' },
	{ get label() { return i18n.__("United States"); }, value: 'US' },
];

export let CurrencyList = [
	{ label: "EUR", value: "EUR" },
	{ label: "CHF", value: "CHF" },
	{ label: "GBP", value: "GBP" },
	{ label: "USD", value: "USD" },
];

export let EmployeePositionList = [
    { get label() { return i18n.__('N/A'); }, value: 'na' },
    { get label() { return i18n.__('ERP Consultant'); }, value: 'consultant' },
    { get label() { return i18n.__('HR manager'); }, value: 'hr' },
    { get label() { return i18n.__('Delivery Manager'); }, value: 'delivery' },
    { get label() { return i18n.__('Developer'); }, value: 'developer' },
    { get label() { return i18n.__('Lead Developer'); }, value: 'lead-developer' },
    { get label() { return i18n.__('Technician'); }, value: 'tech' },
    { get label() { return i18n.__('Lead Technician'); }, value: 'lead-tech' },
    { get label() { return i18n.__('Sales Person'); }, value: 'sales-person' },
];

export let EmployeeSkillLevel = [
    { get label() { return i18n.__('beginner'); }, value: 0 },
    { get label() { return i18n.__('medium'); }, value: 1 },
    { get label() { return i18n.__('high'); }, value: 2 },
    { get label() { return i18n.__('expert'); }, value: 3 },
];

export let UserEntryStatusList = [
    { get label() { return i18n.__('draft'); }, value: 100 },
    { get label() { return i18n.__('submitted'); }, value: 101 },
    { get label() { return i18n.__('approved'); }, value: 102 },
    { get label() { return i18n.__('conflicting'); }, value: 103 },
    { get label() { return i18n.__('temporary'); }, value: 104 },
];

export let ExpenseRefundTypeList = [
    { get label() { return i18n.__('forfait'); }, value: 0 },
    { get label() { return i18n.__('frais réel'); }, value: 1 },
    { get label() { return i18n.__('majoré'); }, value: 2 },
    { get label() { return i18n.__('non remboursable'); }, value: 3 },
];

export let MilestoneStatusList = [
    { get label() { return i18n.__('not reached'); }, value: 0 },
    { get label() { return i18n.__('reached'); }, value: 1 },
    { get label() { return i18n.__('invoiced'); }, value: 2 },
];

export let TaskLocationTypeList = [
    { get label() { return i18n.__('on site'); }, value: 0 },
    { get label() { return i18n.__('remote'); }, value: 1 },
];
