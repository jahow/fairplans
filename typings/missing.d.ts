declare module 'meteor/reactive-dict' {
	//export function ReactiveDict(arg?: any): void;
	export var ReactiveDict: ReactiveDictInterface;

	interface ReactiveDictInterface {
		new (name?: string): ReactiveDictInterface;
		set(name: string, value: any): void;
		set(value: {[key: string]: any}): void;
		get(name: string): any;
		equals(name: string, value: any): boolean;
	}
}
declare module 'meteor/react-meteor-data' {
	// export function createContainer(arg?: (arg?: any) => void, arg2?: any): any;

	export function createContainer<P>(
        reactiveFunction: (props: P) => any,
        componentClass: React.ComponentClass<P> | React.StatelessComponent<P>
    ): any;

}
declare module 'meteor/universe:i18n' {
	// interface i18nInterface {
	// 	__(...any): any
	// }
	var i18n: any;
	export default i18n;
}
declare module 'meteor/tap:i18n' {
	export class TAPi18n {
		static __(s: string): string;
	}
}

// declare module 'react-modal-dialog' {
// 	export var ModalContainer: any;
// 	export var ModalDialog: any;
// }

declare module 'react-onclickoutside' {
	export default function onClickOutside(arg: any): any;
}

declare module 'react-dnd-html5-backend' {
	export default function HTML5Backend(): any;
}

declare module 'react-input-autosize' {
	interface AutosizeInput extends React.ComponentClass<any> {}
	export default AutosizeInput;
}

declare module 'react-gateway' {
	export var GatewayDest: any;
	export var GatewayProvider: any;
	export var Gateway: any;
}

declare module 'react-modal2' {
	export default function ReactModal2();
}
