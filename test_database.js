let Waterline = require('waterline');
let MySQLAdapter = require('sails-mysql');
let socket_server = require('./socket_server');


Waterline.start({
    adapters: {
        'sails-mysql': MySQLAdapter,
    },
    datastores: {
        default: {
            adapter: 'sails-mysql',
            url: 'mysql://citygame:citypass@localhost:3306/citygame',
        },
    },
    models: {
        db_login: {
            tableName: 'DB_Login',
            attributes: {
                Record_KEY: {type: 'number', required: true},
                User_ID: {type: 'number'},
                User_Name: {type: 'string'},
                Chat_Name: {type: 'string'},
            }
        },
    },
    defaultModelSettings: {
        primaryKey: 'Record_KEY',
        datastore: 'default'
    }
}, function(err, orm) {
    if (err) {
        console.log('Could not start up the ORM:\n', err);
    }else{
        socket_server(orm);
    }
});