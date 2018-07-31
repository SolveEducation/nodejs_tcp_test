let Waterline = require('waterline');
let MySQLAdapter = require('sails-mysql');
let socket_server = require('./socket_server');

let waterline = new Waterline();
let DB_Login_Collection = Waterline.Collection.extend({
    tableName: 'DB_Login',
    identity: 'DB_Login',
    primaryKey: 'Record_KEY',
    datastore: 'default',
    attributes: {
        Record_KEY: {type: 'number', autoMigrations: { autoIncrement: true } },
        User_ID: {type: 'number'},
        User_Name: {type: 'string'},
        Chat_Name: {type: 'string'},
        User_Service_ID: {type: 'string'},
        User_Password: {type: 'string'},
        User_Email: {type: 'string'},
    }
});

let DB_Game_Lounge_Collection = Waterline.Collection.extend({
    identity: 'DB_Game_Lounge',
    tableName: 'DB_Game_Lounge',
    primaryKey: 'Record_KEY',
    datastore: 'default',
    attributes: {
        Record_KEY: {type: 'number', autoMigrations: { autoIncrement: true } },
        User_ID: {model: 'DB_Login'},
        Game_ID: {model: 'DB_Async_Games'},
        Time: {type: 'number'},
        Status: {type: 'number'},
        Data: {type: 'string'},
        Session_ID: {
            model: "DB_Sessions"
        },
    }
});

let DB_Sessions_Collection = Waterline.Collection.extend({
    identity: 'DB_Sessions',
    tableName: 'DB_Sessions',
    primaryKey: 'Session_ID',
    datastore: 'default',
    attributes: {
        Session_ID: {type: 'number', autoMigrations: { autoIncrement: true } },
        Game_ID: {
            model: "DB_Async_Games"
        },
        Created_At: {type: 'number'},
        Data: {type: 'string'},
        Status: {type: 'number'},
        Is_Bot: {type: 'number'},

        users: {
            collection: 'DB_Game_Lounge',
            via: 'Session_ID'
        }
    }
});

let DB_Async_Games = Waterline.Collection.extend({
    identity: 'DB_Async_Games',
    tableName: 'DB_Async_Games',
    primaryKey: 'Game_ID',
    datastore: 'default',
    attributes: {
        Game_ID: {type: 'number', autoMigrations: { autoIncrement: true } },
        Game_Name: {type: 'string'},
        Max_User_Per_Session: {type: 'number'},
        Allow_Bot: {type: 'number'},
        Min_User_Per_Session: {type: 'number'},
    }
});

waterline.registerModel(DB_Game_Lounge_Collection);
waterline.registerModel(DB_Login_Collection);
waterline.registerModel(DB_Sessions_Collection);
waterline.registerModel(DB_Async_Games);

var config = {
    adapters: {
        'sails-mysql': MySQLAdapter,
    },
    datastores: {
        default: {
            adapter: 'sails-mysql',
            url: 'mysql://citygame:citypass@localhost:3306/citygame',
        },
    },
    defaultModelSettings: {
        primaryKey: 'Record_KEY',
        datastore: 'default'
    }
};

waterline.initialize(config, (err, ontology)=> {
    if (err) {
        console.error(err);
        return;
    }
    socket_server(ontology);
});
