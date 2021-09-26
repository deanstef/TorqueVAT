/**
 * Clears the users into the db and restart the algorand private network
 */

var mongoose = require('mongoose');
var configDB = require('../config/database.js');
var User = require('../server/models/user');
var AlgoAsset = require('../server/models/algo-asset');
var Application = require('../server/models/application');
var shell = require('shelljs')

 mongoose.connect( configDB.url, {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => { console.log('MongoDB is connected') })
.catch(err => { console.log('MongoDB connection unsuccessful, ' + err ); });

( async () => {

    await User.deleteMany( {} );
    await AlgoAsset.deleteMany( {} );
    await Application.deleteMany( {} );
    console.log("Removed all users and assets and Applications");

    shell.exec('./sandbox/sandbox reset');
    process.exit();
} )();