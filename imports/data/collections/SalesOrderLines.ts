import { ObjectStatus, BaseSchema } from '../collections';

// SALES ORDER LINES
// these are the products and services that must be delivered to a customer
// and belong to a sales order
// AKA billing sections
export interface SalesOrderLine {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    code: string,                // will be the line index
    salesOrderCode: string,
    description: string,
    projectCode: string,
    companyCode: string,
    productCode: string,
    amountSold: number,
    amountPaid?: number,
    hoursBudgetConstrained: boolean,
    amountHours:number
}
export const SalesOrderLineSchema = new SimpleSchema(Object.assign({
    code: {
        type: String,
        denyUpdate: true,
    },
    salesOrderCode: {
        type: String,
        denyUpdate: true,
        optional: true,
    },
    description: {
        type: String,
    },
    projectCode: {
        type: String,
        denyUpdate: true,
    },
    companyCode: {
        type: String,
        denyUpdate: true,
    },
    productCode: {
        type: String,
        optional: true,
    },
    amountSold: {
        type: Number,
        decimal: true,
    },
    amountHours: {
        type: Number,
        decimal: true,
        defaultValue: 0,
        min:0,
    },
    amountPaid: {
        type: Number,
        decimal: true,
        defaultValue: 0,
    },
    hoursBudgetConstrained:{
        type: Boolean,
        defaultValue: true,
    }
}, BaseSchema));
export const SalesOrderLines = new Mongo.Collection<SalesOrderLine>('SalesOrderLines');
SalesOrderLines.attachSchema(SalesOrderLineSchema);