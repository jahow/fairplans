import { ObjectStatus, BaseSchema } from '../collections';

export enum ProductType {
    SERVICE = 0,
    MATERIAL = 1
}

export enum ProductUnit {
    HOUR = 0,
    PIECE = 1
}


// PRODUCTS
// are used to define what will be delivered to customers: services, products, etc.
// products are linked to one company, and have a default price
export interface Product {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    companyCode: string,       // which company am I linked to
    code: string,              // unique within the holding company
    name: string,
    description?: string,
    type: ProductType,
    defaultPriceAmount?: number,
    defaultPriceCurrency?: string,
    unit?: ProductUnit,
    version?: number
}
export const ProductSchema = new SimpleSchema(Object.assign({
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
    description: {
        type: String,
        optional: true,
    },
    type: {
        type: Number,
        allowedValues: [
            ProductType.SERVICE,
            ProductType.MATERIAL
        ],
    },
    unit: {
        type: Number,
        allowedValues: [
            ProductUnit.HOUR,
            ProductUnit.PIECE
        ],
        defaultValue: ProductUnit.PIECE
    },
    defaultPriceAmount: {
        type: Number,
        decimal: true,
        optional: true,
    },
    defaultPriceCurrency: {
        type: String,
        regEx: /^[A-Z]{3}$/,
        optional: true,
    },
    version: {
        type: Number,
        decimal: true,
        optional: true,
    },
}, BaseSchema));
export const Products = new Mongo.Collection<Product>('Products');
Products.attachSchema(ProductSchema);
