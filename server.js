"use strict";

var fs = require('fs');
var path = require('path');
var SFTPServer = require("node-sftp-server");

// contains a json like this, and maybe more information to auth with the API
// {"myuser": {"password": "yerysecret"}}
var accounts = JSON.parse(fs.readFileSync('accounts.json'));

// generate your keys with
// openssl genpkey -algorithm RSA -out ssh_host_rsa_key -pkeyopt rsa_keygen_bits:2048
// chmod 600 ssh_host_rsa_key
// ssh-keygen -f ssh_host_rsa_key -o -p -a 100
// ssh-keygen -f ssh_host_rsa_key -p -a 100
// ssh-keygen -y -f ssh_host_rsa_key > ssh_host_rsa_key.pub
var srv = new SFTPServer({
    privateKeyFile: "/home/viveksam/.ssh/ssh_host_rsa_key"
});

// change port if required. Don't forget to tell your firefall or AWS Security Group
srv.listen(7022);

srv.on("connect", function (auth, info) {

    console.warn("authentication attempted, client info is: " + JSON.stringify(info) + ", auth method is: " + auth.method);

    if (auth.method !== 'password' || auth.password !== accounts[auth.username].password) {
        console.log("login attempt from " + auth.username);
        //return auth.reject();
    }

    console.log("login success from " + auth.username);
    var username = auth.username;

    return auth.accept(function (session) {
        console.warn("Okay, we've accepted...");
        session.on("readdir", function (path, responder) {

            var dirs, i, j, results;
            console.warn("Readdir request for path: " + path);

            dirs = (function () {
                results = [];
                for (j = 1; j < 10; j++) { results.push(j); }
                return results;
            }).apply(this);
            i = 0;
            responder.on("dir", function () {
                if (dirs[i]) {
                    console.warn("Returning directory: " + dirs[i]);
                    responder.file(dirs[i]);
                    return i++;
                } else {
                    return responder.end();
                }
            });
            return responder.on("end", function () {
                return console.warn("Now I would normally do, like, cleanup stuff, for this directory listing");
            });
        });

        session.on("readfile", function (path, writestream) {
            return "";
        });

        return session.on("writefile", function (filepath, readstream) {
            var something;
            var filename = path.basename(filepath);
            something = fs.createWriteStream(filename);
            return readstream.pipe(something);
        });
    });
});

srv.on("error", function () {
    return console.warn("Example server encountered an error");
});
srv.on("end", function () {
    return console.warn("Example says user disconnected");
});
