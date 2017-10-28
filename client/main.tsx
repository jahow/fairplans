// startup imports
import '../imports/startup/client';

import * as React from 'react';
import { render } from 'react-dom';
import { Meteor } from 'meteor/meteor';
import * as Perf from 'react-addons-perf';
import { Accounts } from 'meteor/accounts-base';

import App from '../imports/ui/App';

import { TAPi18n as i18n } from 'meteor/tap:i18n';

// react-datepicker
import 'react-datepicker/dist/react-datepicker.css';

//process.env.NODE_ENV = "production";

Meteor.startup(() => {

    //i18n.setLanguage('fr');

    (window as any).Perf = Perf;

    render(
        <App />,
        document.getElementById('render-target')
    );

});