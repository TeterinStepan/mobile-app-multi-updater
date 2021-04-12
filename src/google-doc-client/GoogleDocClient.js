'use strict';

const { GoogleSpreadsheet } = require('google-spreadsheet');
const Path = require('path');

const defaultGoogleConfPath =  Path.resolve(__dirname, '../conf/') + '/google-conf.json';

const fs = require('fs');
const Logger = require('../logger/Logger');


// uniq key of GoogleSpreadsheet File.
const doc = new GoogleSpreadsheet('');

// add the path to the service account credentials file.
const creds = require('../conf/client_secret.json');

module.exports = class GoogleDocClient {
    constructor(conf, logger){
        this.logger = logger;
        this.defaultSetting = JSON.parse(fs.readFileSync(defaultGoogleConfPath, 'utf8'));
        this.doc = doc;
    }

    async getMobileAppsDataByPlatform(platform){
        await doc.useServiceAccountAuth(creds)
        await this.doc.loadInfo();

        let pageTitle = 'mobileAppsData';
        let sheet = await this.doc.sheetsByTitle[pageTitle];
        return await sheet.getRows();
    }

    async getUpdaterSettings(){
        await doc.useServiceAccountAuth(creds)
        await this.doc.loadInfo();

        let pageTitle = 'updaterWorkSettings';
        let sheet = await this.doc.sheetsByTitle[pageTitle];
        return await sheet.getRows()
    }

    async addRow(row){
        await doc.useServiceAccountAuth(creds)
        await this.doc.loadInfo();

        let sheet = await this.doc.sheetsByTitle['logs'];
        await sheet.addRow(row);
    }

    async updateMobileAppData(data){
        let rowIndex = data.rowNumber - 1;
        await doc.useServiceAccountAuth(creds)
        await this.doc.loadInfo();

        let sheet = await this.doc.sheetsByTitle['mobileAppsData'];
        await sheet.loadCells();

        if (data.version){
            let versionCell = sheet.getCell(rowIndex, this.defaultSetting[data.platform+'_versionColumnIndex']);
            versionCell.value = data.version;
        }

        if (data.status){
            let statusCell = sheet.getCell(rowIndex, this.defaultSetting[data.platform+'_statusColumnIndex']);
            statusCell.value = data.status
        }

        let lastModifyCell = sheet.getCell(rowIndex, this.defaultSetting[data.platform+'_lastModifyColumnIndex']);
        lastModifyCell.value = data.timestamp;

        await sheet.saveUpdatedCells()
    }

}