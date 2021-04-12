'use strict';

const tools = require("../../mobile-app-build-2/tools.js");

const childProcess = require('child_process');
const { exec,execSync } = require("child_process");
const Path   = require('path');
const Logger = require('./logger/Logger');
const GoogleDocClient = require('./google-doc-client/GoogleDocClient');

// относительный путь к файлу сборщика приложения
const buildScriptPath = Path.resolve(__dirname, '../../mobile-app-builded/build.js');

module.exports = class MobileAppMultiUpdater {

    constructor(settings) {
        this.settings = settings;
        this.logParams = settings.loggerParams;
        this.googleWorksheets = this.settings.worksheets;
    }

    async run(){
        await this.init();
        await this.doRun();
    }

    async init() {
        this.logger = new Logger(this.logParams);
        this.googleClient = new GoogleDocClient(this.settings, await this.logger);
        await this.initWorkSettings();
        await this.initMobileAppsList()
    }

    async doRun() {
        await this.logger.info('runBuildApps', 'Старт')

        await this.logger.info('buildMobileApp', `- старт для ${this.appList.length} приложений`);
        for await (const mobileApp of this.appList){
            await this.updateStatusMobileApp(mobileApp, 'collect')
            await this.deploy(mobileApp);
        }
        await this.logger.info('runBuildApps', 'Выполнено')
    }

    // метод выполняет сборку приложения 
    async deploy(mobileApp){
        let args = await this.getBuildArgs(mobileApp); // параметры для запуска сборщика приложений
        let buildAndRelease = new Promise(
            function (resolve, reject){
                // измените путь к своему сборщику приложения или измените вызов сборки на требуемый
                exec("node " + buildScriptPath + args, (error, stdout, stderr) => {
                        if (stderr.includes('buildError')) reject('buildError');
                        if (stderr.includes('updateError')) reject('updateError');
                        resolve(true);
                    }
                )
            }
        )

        let errorCode = '';
        await buildAndRelease
            .catch(function (error) {
                errorCode = error;
            });

        if(errorCode){
            await await this.logger.error('runBuildApps', 'Сборка и обновление '+mobileApp.appname+' - прервана из-за ошибки '+errorCode);
            await this.updateStatusMobileApp(mobileApp, errorCode);
        } else {
            await this.updateVersionMobileApp(mobileApp);
            await this.updateStatusMobileApp(mobileApp, 'completed');
            await await this.logger.info('buildMobileApp', `Мобильное приложение '${mobileApp.appname}' успешно собрано и отправлено в маркете`);
        }
    }


    // Аргументы для запуска скрипта build.js
    // Параметр --multiUpdate говорит скрипту, что сборку нужно начать в специальном режиме
    async getBuildArgs(mobileApp) {
        await this.logger.info('getBuildArgs', 'Старт')
        let args = ' --mode=update' +
            ' --version='    +"'"+ this.version +"'"+
            ' --com='        + mobileApp.android_prefix +
            ' --platform='   + this.platform +
            ' --product='    + mobileApp.product +
            ' --appname='    + mobileApp.appname +
            ' --onesignal='  + mobileApp.onesignal +
            ' --networkid='  + mobileApp.networkid +
            ' --host='       + this.settings.defaultHost[mobileApp.product] +
            ' --multiUpdate';

        await this.logger.info('getBuildArgs', "Выполнено.\nПараметры для запуска сборки: "+ args);
        return args;
    }


    /** Получение необходимых данных из гугл таблицы для работы автосборки и автообновления*/

    // Получение настроек текущей сборки из гугл таблицы
    async initWorkSettings() {
        await this.logger.info('initWorkSettings', 'Старт')

        let workSettings = await this.googleClient.getUpdaterSettings();
        let actualUpdateInfo = workSettings[workSettings.length - 1];

        this.platform = actualUpdateInfo.platform;
        this.version = actualUpdateInfo.version;

        await this.logger.info('initWorkSettings',
            "Выполнено\n"
            + 'Параметры для сборки:'
            + ' Платформа: ' + actualUpdateInfo.platform
            + ' Версия: ' + actualUpdateInfo.version
        );
    }

    // Получение списка м.приложений из гугл таблицы, которые требуется обновить
    async initMobileAppsList() {
        try {
            let mobileAppsData = await this.googleClient.getMobileAppsDataByPlatform(this.platform);
            this.appList = await this.filterMobileApps(mobileAppsData);
        } catch (error) {
            await this.logger.fatal('initMobileAppsList', error);
            throw new Error ('Сервис прекратил работу из-за критической ошибки');
        }
    }

    // Сортировка списка всех приложений и возврат массива подходящих для обновления приложений
    async filterMobileApps(rows) {
        if(!rows.length) throw new Error("Список мобильных приложений пуст");
        let resultRows = [];

        rows.forEach(row => {
            let actualMobileVersion = row[this.platform+'_version'].split('.');
            let updateVersion = this.version.split('.');

            if (row.active !== 'yes'){
                return;
            }

            // проверка версионности приложения
            if ( 
                updateVersion[0] > actualMobileVersion[0]
                || (
                    updateVersion[0] === actualMobileVersion[0] 
                    && updateVersion[1] > actualMobileVersion[1]
                ) || (
                    updateVersion[0] === actualMobileVersion[0]
                    && updateVersion[1] === actualMobileVersion[1]
                    && updateVersion[2] > actualMobileVersion[2]
                )
            ){
                resultRows.push(row);
            }
        });

        if(!resultRows.length) throw new Error("Список подходящих к обновлению мобильных приложений пуст");
        await this.logger.info('filterMobileApps', 'Приложений для обновления ' + resultRows.length);
        return resultRows;
    }


    /** Методы обновление данных м.приложения в гугл таблице */

    // Обновление статуса всех приложений разом
    async updateStatusAllMobileApps(status) {
        for await (const mobileApp of this.appList){
            await this.updateStatusMobileApp(mobileApp, status)
        }
    }

    // Обновление статуса
    async updateStatusMobileApp(mobileApp, status) {
        try {
            await this.googleClient.updateMobileAppData({
                "rowNumber": mobileApp.rowNumber,
                "status": this.settings.status[status],
                "timestamp": this.getTimestamp(),
                "platform": this.platform
            });
        } catch (err){
            await this.logger.fatal('updateStatusMobileApp', err);
            throw new Error ('Сервис прекратил работу из-за критической ошибки');
        }
        await this.logger.info('updateStatusMobileApp', `'${mobileApp.appname}'`);
    }

    // Обновление версии
    async updateVersionMobileApp(mobileApp, platform) {
        try {
            await this.googleClient.updateMobileAppData({
                "rowNumber"     : mobileApp.rowNumber,
                "version"       : this.version,
                "timestamp"     : this.getTimestamp(),
                "platform"      : this.platform
            });
        } catch (err){
            await this.logger.fatal('updateVersionMobileApp', err);
            throw new Error ('Сервис прекратил работу из-за критической ошибки');
        }
        await this.logger.info('updateVersionMobileApp', `Успешно выполнено для ${mobileApp.appname}`);
    }

    // Временная метка - используется для записи в гугл таблицу
    getTimestamp() {
        let now = new Date();
        return now.getDate()+'.'+now.getMonth()+'.'+now.getFullYear() +' ' + now.getHours()+':'+now.getMinutes()
    }

}