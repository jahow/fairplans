import { ObjectStatus, BaseSchema } from '../collections';

// SALES ORDERS
// these are contracted with a customer, and are part of a project
// users do not directly have access to this object
export interface SalesOrder {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    code: string,
    companyCode: string,
    partnerCode: string,
    projectCode: string
}
export const SalesOrderSchema = new SimpleSchema(Object.assign({
    code: {
        type: String,
        denyUpdate: true,
    },
    companyCode: {
        type: String,
        denyUpdate: true,
    },
    partnerCode: {
        type: String,
        denyUpdate: true,
    },
    projectCode: {
        type: String,
        denyUpdate: true,
    },
}, BaseSchema));
export const SalesOrders = new Mongo.Collection<SalesOrder>('SalesOrders');
SalesOrders.attachSchema(SalesOrderSchema);
