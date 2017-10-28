import { ObjectStatus, BaseSchema, Products } from '../collections';

// types of expenses; can be synchronized
export interface ExpenseType {
    _id?: string,
    status?: ObjectStatus,
    creationTime?: Date,        // written on hook
    updateTime?: Date,

    name: string,
    productId?: string,

    // denormalized
    productCode?: string,
}
export const ExpenseTypeSchema = new SimpleSchema(Object.assign({
    name: {
        type: String,
    },
    productId: {
        type: String,
        optional: true,
    },
    productCode: {
        type: String,
        optional: true,
    },
}, BaseSchema));
export const ExpenseTypes = new Mongo.Collection<ExpenseType>('ExpenseTypes');
ExpenseTypes.attachSchema(ExpenseTypeSchema);


// SPECIFIC HOOKS

// data denormalization
ExpenseTypes.before.insert((userId, doc) => {
    let product = Products.findOne(doc.productId);
    doc.productCode = doc.productCode || (product ? product.code : '');
    return true;
});
ExpenseTypes.before.update((userId, doc, fieldNames, modifier: any, options) => {
    modifier.$set = modifier.$set || {};
    let productId = modifier.$set.productId || doc.productId;
    let product = Products.findOne(productId);
    modifier.$set.productCode = modifier.$set.productCode || doc.productCode || (product ? product.code : '');
    return true;
});