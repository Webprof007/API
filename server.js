const express = require('express');
const mysql = require('mysql');
const mysqlUtil = require('mysql-utilities');

const app = express();

var settings = require('./settings.json');

const port = settings.port;

const connection = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root',
    database: settings.db_name
});

connection.connect(function(err){
    if(err) {
        var msg = {error: "Database connection error!"}
        console.log('error: db_connection', err);
        res.status(500).send(JSON.stringify(msg));
        return;
    }
});

mysqlUtil.upgrade(connection);
mysqlUtil.introspection(connection);

require('./app/routes')(app, connection);

app.listen(
    port,
    () => {
        console.log("node.js in port = " + port);
    }
);

function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

