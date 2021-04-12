'use strict';

const fs = require('fs');

const GoogleDocLogger = require('../logger/GoogleDocLogger');
const ConsoleLogger = require('../logger/ConsoleLogger');
const Path = require('path');


const defaultLoggerConfPath =  Path.resolve(__dirname, '../conf/') + '/' +
    'logger-conf.json';

module.exports = class Logger {

    constructor(loggerOutputTypes){
        this.initDefaultConf()
        this.initLogOutputTypes(loggerOutputTypes);
    }

    initDefaultConf(){
        this.defaultConf = JSON.parse(fs.readFileSync(defaultLoggerConfPath, 'utf8'));
    }

    initLogOutputTypes(loggerOutputTypes){
        this.consoleLog = new ConsoleLogger(this.defaultConf.messages);
        this.googleTableLog = new GoogleDocLogger(this.defaultConf);
    }

    async info(stageAlias, info){
        this.consoleLog.info(stageAlias, info);
        await this.googleTableLog.info(stageAlias, info);
    }

    async error(stageAlias, info){
        this.consoleLog.error(stageAlias, info);
        await this.googleTableLog.error(stageAlias, info);
    }

    async fatal(stageAlias, error){
        this.consoleLog.fatal(stageAlias, error);
        await this.googleTableLog.fatal(stageAlias, error);
    }
}