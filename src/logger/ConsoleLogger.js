'use strict';

const Logger = require('tracer').colorConsole();

module.exports = class ConsoleLogger {

    constructor(messages){
        this.messages = messages;
    }

    error(stageAlias, info){
        console.error(`Ошибка: ${this.messages[stageAlias]} \tИнформация: ${info}`);
    }


    info(stageAlias, info){
        console.info('Шаг: ' + this.messages[stageAlias] + ": " + info);
    }

    fatal(stageAlias, error){
        console.error('Фатальная ошибка: ' + this.messages[stageAlias] + ": " + error);
    }

}