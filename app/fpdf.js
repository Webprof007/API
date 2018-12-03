(function () {
    "use strict";

    var promises = function(lib) {

        lib.read = function(fileName) {
            return new Promise(function(resolve, reject) {
                try {
                    var file = lib.readPdf(fileName);
                    resolve(file);
                } 
                catch(error) {
                    reject(error);
                }
            });
        }

        lib.write = function(fileName, fields, params) {
            return new Promise(function(resolve, reject) {
                try {
                    lib.writePdfA(fileName, fields, params, function(err, result) {
                        if(err) { reject(err); }
                        else {
                            resolve(result);
                        }
                    });
                } 
                catch(error) {
                    reject(error);
                }
            });
        }        

        return lib;
    }

    module.exports = promises(require('../build/Release/fpdf'));
    /*try {
        try {
            module.exports = promises(require('../build/Release/fpdf'));
        } catch (e) {
            module.exports = promises(require('../build/Debug/fpdf'));
        }
    } catch (e) {
        console.log(e);
        module.exports = promises(require('../build/default/fpdf'));
    }*/
})();