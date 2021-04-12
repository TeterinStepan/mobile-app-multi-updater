'use strict';

const fs = require('fs');
const Path = require('path');
const MobileAppMultiUpdater = require('./src/MobileAppMultiUpdater');

const defaultSettingConf = Path.resolve(__dirname, './src/conf/updater-conf.json');
const settings = JSON.parse(fs.readFileSync(defaultSettingConf, 'utf8'));

try{
    let mobileAppUpdater = new MobileAppMultiUpdater(settings);
    mobileAppUpdater.run();
} catch(err) {
    console.log (err);
}
