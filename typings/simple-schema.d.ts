
declare var SimpleSchema: SimpleSchemaStatic;

interface SimpleSchemaDefinition {
    [attribute: string]: { [props: string]: any }
}

interface SimpleSchemaStatic {
    new (definition: SimpleSchemaDefinition): SimpleSchema;
    extendOptions(options: { [options: string]: any }): void;
}

interface SimpleSchema {
    validate(definition: SimpleSchemaDefinition): void;
}

declare module Mongo {
    interface Collection<T> {
        attachSchema(schema : any) : void;
        before: any;
        after: any;
        direct: any;
    }
}