'use strict';

const GoogleDocClient = require('../google-doc-client/GoogleDocClient');

module.exports = class GoogleDocLogger {

    constructor(params){
        this.messages = params.messages;
        this.googleDocClient = new GoogleDocClient();
    }

    async error(messageKey, info){
        await this.googleDocClient.addRow({
            'date' : this.getTimestamp(),
            'type' : 'error',
            'event' : this.messages[messageKey],
            'info' : info,
        });
    }

    async info(messageKey, info){
        await this.googleDocClient.addRow({
            'date' : this.getTimestamp(),
            'type' : 'info',
            'event' : this.messages[messageKey],
            'info' : info,
        });
    }

    async fatal(messageKey, info){
        await this.googleDocClient.addRow({
            'date' : this.getTimestamp(),
            'type' : 'fatal',
            'event' :this.messages[messageKey],
            'info' : info,
        });
    }

    getTimestamp() {
        let now = new Date();
        return now.getDate()+'.'+now.getMonth()+'.'+now.getFullYear() +' ' + now.getHours()+':'+now.getMinutes()
    }
}
