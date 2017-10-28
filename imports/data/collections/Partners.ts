import { ObjectStatus, BaseSchema } from '../collections';

export enum PartnerType {
    CUSTOMER = 0,
    SUPPLIER = 1,
    LEAD = 2
}

// PARTNERS
// can be customers (for whom we work) or suppliers/vendors
export interface Partner {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    companyCode: string,       // which company am I linked to
    code: string,              // unique within the holding company
    name: string,
    type: PartnerType,
    languageCode?: string,       // FR, EN...

    // used for interco
    externalCompanyCode?: string,    // this can hold a company code which means that this partner will be used on interco orders
}
export const PartnerSchema = new SimpleSchema(Object.assign({
    companyCode: {
        type: String,
    },
    code: {
        type: String,
        denyUpdate: true,
    },
    name: {
        type: String,
    },
    type: {
        type: Number,
        allowedValues: [
            PartnerType.CUSTOMER,
            PartnerType.SUPPLIER,
            PartnerType.LEAD,
        ],
    },
    languageCode: {
        type: String,
        regEx: /^[A-Z]{2,3}$/,
        optional: true,
    },
    externalCompanyCode: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const Partners = new Mongo.Collection<Partner>('Partners');
Partners.attachSchema(PartnerSchema);