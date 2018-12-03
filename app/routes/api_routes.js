var st = require(__dirname + "/../../settings.json");

var express = require('express');
var fpdf = require(__dirname + '/../fpdf');
var multer = require('multer');
var upload = multer({ dest: __dirname + '/../..' + st.template_folder});

var jsonParser = express.json();
var fs = require('fs');

module.exports = function(app, db) {
    /**
     * This one for upload PDF template in server
     *
     * @do      get PDF file, parse it and save all getting data to database
     *
     * @input   multipart/form-data
     *              input type="file" name="tmp"
     *              input type="text" name="desc"
     *              input type="text" name="tmpname"
     *
     *              all names can be changed in settings.json
     *
     * @output  success or error messages
     */
    app.post(st.save_template, upload.single(st.upload_file_field_name), function(req, res) {
        if(!req.file) {
            var msg = {
                message: "File not found!",
                error: "File not found!"
            };
            console.log("error: file_not_found");
            res.status(400).send(JSON.stringify(msg));
            return;
        } else {
            fpdf.read(req.file.path).then(function(result){
                var date = new Date();
                db.insert(
                    st.db_tmp_table, {
                        template_name: req.body[st.upload_file_template_name] ? req.body[st.upload_file_template_name] : req.file.originalname.split('.')[0],
                        file_name: req.file.filename,
                        description: req.body[st.upload_file_description_name] ? req.body[st.upload_file_description_name] : "description missing",
                        variables: JSON.stringify(result),
                        created_at: date,
                        updated_at: date,
                        archived: false,
                        path: req.file.path
                    },
                    (err, result) => {
                        if(err) {
                            var msg = {
                                message: "Lost db connection!",
                                error: err
                            }
                            console.log('error: ' + err);
                            res.status(500).send(JSON.stringify(msg));
                            return;
                        } else {
                            console.log({ insert: result });
                            var msg = {
                                success: "200",
                                file: req.file
                            };
                            res.status(200).send(JSON.stringify(msg));
                        }
                    }
                );
            }, function(err){
                var msg = {
                    message: "Missing PDF template!",
                    error: err
                }
                console.log('error: ' + err);
                res.status(500).send(JSON.stringify(msg));
                return;
            });
        }
    });

    /**
     * This one get information about requested PDF template
     *
     * @input   JSON data with template_id
     *
     * @output  all database data about current template in JSON format
     * @example
     *          {
     *              "id": 12,
     *              "template_name": "NF7",
     *              "file_name": "b59a1d6820caa51cb815f3f15b45abca",
     *              "description": "Text about this template",
     *              "variables": "[{\"name\":\"FirstName\",\"page\":0,\"value\":\"\",\"id\":65536,\"type\":\"text\"},{\"name\":\"LastName\",\"page\":0,\"value\":\"\",\"id\":65537,\"type\":\"text\"},{\"name\":\"Current Data\",\"page\":0,\"value\":\"\",\"id\":65538,\"type\":\"text\"},{\"name\":\"Choose One\",\"page\":0,\"value\":false,\"id\":65539,\"caption\":\"0\",\"type\":\"radio\"},{\"name\":\"Choose One\",\"page\":0,\"value\":false,\"id\":65540,\"caption\":\"1\",\"type\":\"radio\"},{\"name\":\"Check It_0\",\"page\":0,\"value\":false,\"id\":65541,\"type\":\"checkbox\"},{\"name\":\"Check It_1\",\"page\":0,\"value\":false,\"id\":65542,\"type\":\"checkbox\"},{\"name\":\"Some One Of This\",\"page\":0,\"id\":65543,\"choices\":[\"Select1\",\"Select2\"],\"type\":\"combobox\"}]",
     *              "created_at": "2018-12-03T01:14:27.000Z",
     *              "updated_at": "2018-12-03T01:14:27.000Z",
     *              "deleted_at": null,
     *              "archived": 0,
     *              "path": "/pdfapi/templates/pdf/b59a1d6820caa51cb815f3f15b45abca"
     *          }
     */
    app.get(st.get_single_template, jsonParser, function(req, res){
        db.select(
            st.db_tmp_table,
            '*',
            {
                id: req.body[st.field_template_id_name]
            },
            function(err, result) {
                if(err) {
                    var msg = {
                        message: "Lost db connection!",
                        error: err
                    }
                    console.log('error: ' + err);
                    res.status(500).send(JSON.stringify(msg));
                    return;
                } else {
                    console.log({ select: result });
                    res.status(200).send(JSON.stringify(result));
                }
            }
        );
    });

    /**
     * This one get information about all existed PDF templates
     *
     * @input   nothing, only call this
     *
     * @output  all database data about all templates in JSON format
     */
    app.get(st.get_template_list, function(req, res){
        db.select(
            st.db_tmp_table,
            '*',
            {},
            {id: 'asc'},
            (err, result) => {
                if(err) {
                    var msg = {
                        message: "Lost db connection!",
                        error: err
                    }
                    console.log('error: ' + err);
                    res.status(500).send(JSON.stringify(msg));
                    return;
                } else {
                    console.dir(result);
                    res.status(200).send(JSON.stringify(result));
                }
            }
        );
    });

    /**
     * This one process user filled information with selected PDF template
     *
     * @do      find current template in database, filling it,
     *              save result in two format - editable PDF and non-editable PDF (like images),
     *              save data about this PDFs in database
     *
     * @input   JSON data with user_id, template_id and
     *              fields (key => value) data
     *              where key - field name, value - user filling data
     *
     * @output  success and error messages
     */
    app.post(st.create_pdf_with_user_data, jsonParser, function(req, res){
        db.select(
            st.db_tmp_table,
            'path, file_name',
            {
                id: req.body[st.field_template_id_name]
            },
            function(err, result) {
                if(err) {
                    var msg = {
                        message: "Lost db connection!",
                        error: err
                    }
                    console.log('error: ' + err);
                    res.status(500).send(JSON.stringify(msg));
                    return;
                } else {

                    var user = req.body[st.field_user_id_name];
                    var file = result[0].file_name;
                    var path = result[0].path;
                    var tmp = req.body[st.field_template_id_name];
                    var date = new Date();
                    delete req.body[st.field_user_id_name];
                    delete req.body[st.field_template_id_name];

                    var filled_file = file + "_" + user;
                    var newPath = __dirname + "/../.." + st.filled_doc_folder;

                    fpdf.write(path, req.body, {"save" : "pdf", "cores" : 4, "scale" : 0.2, "antialias" : true}).then(function(result){
                        fs.writeFile(newPath + filled_file + ".pdf", result, function(err){
                            if(err) {
                                var msg = {
                                    message: "Cannot save PDF file!",
                                    error: err
                                }
                                console.log('error: ' + err);
                                res.status(500).send(JSON.stringify(msg));
                                return;
                            } else {
                                console.log('PDF was saved!');

                                fpdf.write(path, req.body, {"save" : "imgpdf", "cores" : 4, "scale" : 0.2, "antialias" : true}).then(function(result){
                                    fs.writeFile(newPath + filled_file + "_img.pdf", result, function(err){
                                        if(err) {
                                            var msg = {
                                                message: "Cannot save PDF file!",
                                                error: err
                                            }
                                            console.log('error: ' + err);
                                            res.status(500).send(JSON.stringify(msg));
                                            return;
                                        } else {
                                            console.log('PDFIMG was saved!');

                                            db.insert(
                                                st.db_fill_table, {
                                                    user_id: user,
                                                    document_template_id: tmp,
                                                    name: filled_file,
                                                    name_img: filled_file + "_img",
                                                    created_at: date,
                                                    updated_at: date,
                                                    path: newPath
                                                },
                                                (err, result) => {
                                                    if(err) {
                                                        var msg = {
                                                            message: "Lost db connection!",
                                                            error: err
                                                        }
                                                        console.log('error: ' + err);
                                                        res.status(500).send(JSON.stringify(msg));
                                                        return;
                                                    } else {
                                                        console.log({ insert: result });
                                                        var msg = {success: "200"};
                                                        res.status(200).send(JSON.stringify(msg));
                                                    }
                                                }
                                            );

                                        }
                                    });
                                }, function(err){
                                    var msg = {
                                        message: "Missing PDF template!",
                                        error: err
                                    }
                                    console.log('error: ' + err);
                                    res.status(500).send(JSON.stringify(msg));
                                    return;
                                });
                            }
                        });
                    }, function(err){
                        var msg = {
                            message: "Missing PDF template!",
                            error: err
                        }
                        console.log('error: ' + err);
                        res.status(500).send(JSON.stringify(msg));
                        return;
                    });
                }
            }
        );
    });

    /**
     * This one get information about requested filled PDF by current user
     *
     * @input   JSON data with user_id and template_id
     *
     * @output  all database data about current filled PDF in JSON format
     * @example
     *          {
     *              "id": 1,
     *              "user_id": 1,
     *              "document_template_id": 12,
     *              "name": "b59a1d6820caa51cb815f3f15b45abca_1",
     *              "name_img": "b59a1d6820caa51cb815f3f15b45abca_1_img",
     *              "created_at": "2018-12-03T02:03:31.000Z",
     *              "updated_at": "2018-12-03T02:03:31.000Z",
     *              "deleted_at": null,
     *              "path": "/pdfapi/app/routes/../../upload/usersPdf/"
     *          }
     */
    app.get(st.get_user_filled_document, jsonParser, function(req, res){
        db.select(
            st.db_fill_table,
            '*',
            {
                user_id: req.body[st.field_user_id_name],
                document_template_id: req.body[st.field_template_id_name]
            },
            function(err, result) {
                if(err) {
                    var msg = {
                        message: "Lost db connection!",
                        error: err
                    }
                    console.log('error: ' + err);
                    res.status(500).send(JSON.stringify(msg));
                    return;
                } else {
                    console.log({ select: result });
                    res.status(200).send(JSON.stringify(result));
                }
            }
        );
    });

    /**
     * This one delete current template from disk and set deleted_at date in database
     *
     * @input   template id
     *
     * @output  success or error message
     */
    app.delete(st.delete_template, jsonParser, function(req, res){
        if(!req.body[st.field_template_id_name]) {
            var msg = {
                message: "Template not found!",
                error: "Template not found!"
            };
            console.log("error: template_not_found");
            res.status(400).send(JSON.stringify(msg));
            return;
        } else {
            db.select(
                st.db_tmp_table,
                '*',
                {
                    id: req.body[st.field_template_id_name]
                },
                (err, result) => {
                    if(err) {
                        var msg = {
                            message: "Lost db connection!",
                            error: err
                        }
                        console.log('error: ' + err);
                        res.status(500).send(JSON.stringify(msg));
                        return;
                    } else {
                       
                        fs.unlink(result[0].path, (err) => {
                            if(err) {
                                var msg = {
                                    message: "Cannot delete template!",
                                    error: err
                                }
                                console.log('error: ' + err);
                                res.status(500).send(JSON.stringify(msg));
                                return;
                            } else {
                                console.log(result[0].path + " - deleted success");

                                db.update(
                                    st.db_tmp_table,
                                    {
                                        deleted_at: new Date()
                                    },
                                    {
                                        id: req.body[st.field_template_id_name]
                                    },
                                    (err, result) => {
                                        if(err) {
                                            var msg = {
                                                message: "Lost db connection!",
                                                error: err
                                            }
                                            console.log('error: ' + err);
                                            res.status(500).send(JSON.stringify(msg));
                                            return;
                                        } else {
                                            console.log({ deleted: result });
                                            res.status(200).send(JSON.stringify(result));
                                        }
                                    }
                                );
                            }
                        });
                    }
                }
            );
        }
    });

    /**
     * This one deleted current user pdfs created on current template
     *      delete from disk and set deleted_at date in database
     *
     * @input   user id, template id
     *
     * @output  success or error message
     */
    app.delete(st.delete_user_filled_pdf, jsonParser, function(req, res){
        if(!req.body[st.field_template_id_name] || !req.body[st.field_user_id_name]) {
            var msg = {
                message: "User data not found!",
                error: "User data not found!"
            };
            console.log("error: user_data_not_found");
            res.status(400).send(JSON.stringify(msg));
            return;
        } else {
            db.select(
                st.db_fill_table,
                '*',
                {
                    user_id: req.body[st.field_user_id_name],
                    document_template_id: req.body[st.field_template_id_name]
                },
                (err, result) => {
                    if(err) {
                        var msg = {
                            message: "Lost db connection!",
                            error: err
                        }
                        console.log('error: ' + err);
                        res.status(500).send(JSON.stringify(msg));
                        return;
                    } else {
                        //console.log(result[0].path);
                        fs.unlink(result[0].path + result[0].name + ".pdf", (err) => {
                            if(err) {
                                var msg = {
                                    message: "Cannot delete template!",
                                    error: err
                                }
                                console.log('error: ' + err);
                                res.status(500).send(JSON.stringify(msg));
                                return;
                            } else {
                                console.log(result[0].path + result[0].name + ".pdf" + " - deleted success");

                                fs.unlink(result[0].path + result[0].name_img + ".pdf", (err) => {
                                    if(err) {
                                        var msg = {
                                            message: "Cannot delete template!",
                                            error: err
                                        }
                                        console.log('error: ' + err);
                                        res.status(500).send(JSON.stringify(msg));
                                        return;
                                    } else {
                                        console.log(result[0].path + result[0].name_img + ".pdf" + " - deleted success");

                                        db.update(
                                            st.db_fill_table,
                                            {
                                                deleted_at: new Date()
                                            },
                                            {
                                                user_id: req.body[st.field_user_id_name],
                                                document_template_id: req.body[st.field_template_id_name]
                                            },
                                            (err, result) => {
                                                if(err) {
                                                    var msg = {
                                                        message: "Lost db connection!",
                                                        error: err
                                                    }
                                                    console.log('error: ' + err);
                                                    res.status(500).send(JSON.stringify(msg));
                                                    return;
                                                } else {
                                                    console.log({ deleted: result });
                                                    res.status(200).send(JSON.stringify(result));
                                                }
                                            }
                                        );
                                    }
                                });
                            }
                        });
                    }
                }
            );
        }
    });

    /**
     * This one combine upload template with delete template
     *
     * @input   new template file and template id
     *
     * @output  success and error message
     */
    app.put(st.update_template, upload.single(st.upload_file_field_name), function(req, res){
        if(!req.file) {
            var msg = {
                message: "File not found!",
                error: "File not found!"
            };
            console.log("error: file_not_found");
            res.status(400).send(JSON.stringify(msg));
            return;
        } else {
            db.select(
                st.db_tmp_table,
                '*',
                {
                    id: req.body[st.field_template_id_name]
                },
                (err, result) => {
                    if(err) {
                        var msg = {
                            message: "Lost db connection!",
                            error: err
                        }
                        console.log('error: ' + err);
                        res.status(500).send(JSON.stringify(msg));
                        return;
                    } else {

                        fs.unlink(result[0].path, (err) => {
                            if(err) {
                                var msg = {
                                    message: "Cannot delete template!",
                                    error: err
                                }
                                console.log('error: ' + err);
                                res.status(500).send(JSON.stringify(msg));
                                return;
                            } else {
                                console.log(result[0].path + " - deleted success");
                                fpdf.read(req.file.path).then(function(result){
                                    db.update(
                                        st.db_tmp_table,
                                        {
                                            file_name: req.file.filename,
                                            variables: JSON.stringify(result),
                                            updated_at: new Date(),
                                            archived: req.body.archived ? req.body.archived : false,
                                            path: req.file.path
                                        },
                                        {
                                            id: req.body[st.field_template_id_name]
                                        },
                                        (err, result) => {
                                            if(err) {
                                                var msg = {
                                                    message: "Lost db connection!",
                                                    error: err
                                                }
                                                console.log('error: ' + err);
                                                res.status(500).send(JSON.stringify(msg));
                                                return;
                                            } else {
                                                console.log({ updated: result });
                                                res.status(200).send(JSON.stringify(result));
                                            }
                                        }
                                    );
                                }, function(err){
                                    var msg = {
                                        message: "Missing PDF template!",
                                        error: err
                                    }
                                    console.log('error: ' + err);
                                    res.status(500).send(JSON.stringify(msg));
                                    return;
                                });
                            }
                        });
                    }
                }
            );
        }
    });

    /**
     * This one combine delete user pdfs with create new pdfs with new user data
     *
     * @input   JSON data with user_id, template_id and
     *              fields (key => value) data
     *              where key - field name, value - user filling data
     *
     * @output  success and error message
     */
    app.put(st.update_user_filled_pdf, jsonParser, function(req, res){

        db.select(
            st.db_fill_table,
            '*',
            {
                user_id: req.body[st.field_user_id_name],
                document_template_id: req.body[st.field_template_id_name],
                deleted_at: null
            },
            (err, result) => {
                if(err) {
                    var msg = {
                        message: "Lost db connection!",
                        error: err
                    }
                    console.log('error: ' + err);
                    res.status(500).send(JSON.stringify(msg));
                    return;
                } else {
                    //console.log(result[0].path);
                    fs.unlink(result[0].path + result[0].name + ".pdf", (err) => {
                        if(err) {
                            var msg = {
                                message: "Cannot delete template!",
                                error: err
                            }
                            console.log('error: ' + err);
                            res.status(500).send(JSON.stringify(msg));
                            return;
                        } else {
                            console.log(result[0].path + result[0].name + ".pdf" + " - deleted success");

                            fs.unlink(result[0].path + result[0].name_img + ".pdf", (err) => {
                                if(err) {
                                    var msg = {
                                        message: "Cannot delete template!",
                                        error: err
                                    }
                                    console.log('error: ' + err);
                                    res.status(500).send(JSON.stringify(msg));
                                    return;
                                } else {
                                    console.log(result[0].path + result[0].name_img + ".pdf" + " - deleted success");

                                    db.select(
                                        st.db_tmp_table,
                                        'path, file_name',
                                        {
                                            id: req.body[st.field_template_id_name]
                                        },
                                        function(err, result) {
                                            if(err) {
                                                var msg = {
                                                    message: "Lost db connection!",
                                                    error: err
                                                }
                                                console.log('error: ' + err);
                                                res.status(500).send(JSON.stringify(msg));
                                                return;
                                            } else {
                                                var user = req.body[st.field_user_id_name];
                                                var file = result[0].file_name;
                                                var path = result[0].path;
                                                var tmp = req.body[st.field_template_id_name];
                                                var date = new Date();
                                                delete req.body[st.field_user_id_name];
                                                delete req.body[st.field_template_id_name];

                                                var filled_file = file + "_" + user;
                                                var newPath = __dirname + "/../.." + st.filled_doc_folder;

                                                fpdf.write(path, req.body, {"save" : "pdf", "cores" : 4, "scale" : 0.2, "antialias" : true}).then(function(result){
                                                    fs.writeFile(newPath + filled_file + ".pdf", result, function(err){
                                                        if(err) {
                                                            var msg = {
                                                                message: "Cannot save PDF file!",
                                                                error: err
                                                            }
                                                            console.log('error: ' + err);
                                                            res.status(500).send(JSON.stringify(msg));
                                                            return;
                                                        } else {
                                                            console.log('PDF was saved!');

                                                            fpdf.write(path, req.body, {"save" : "imgpdf", "cores" : 4, "scale" : 0.2, "antialias" : true}).then(function(result){
                                                                fs.writeFile(newPath + filled_file + "_img.pdf", result, function(err){
                                                                    if(err) {
                                                                        var msg = {
                                                                            message: "Cannot save PDF file!",
                                                                            error: err
                                                                        }
                                                                        console.log('error: ' + err);
                                                                        res.status(500).send(JSON.stringify(msg));
                                                                        return;
                                                                    } else {
                                                                        console.log('PDFIMG was saved!');

                                                                        db.update(
                                                                            st.db_fill_table, {
                                                                                name: filled_file,
                                                                                name_img: filled_file + "_img",
                                                                                updated_at: date,
                                                                                path: newPath
                                                                            },
                                                                            {
                                                                                user_id: user,
                                                                                document_template_id: tmp
                                                                            },
                                                                            (err, result) => {
                                                                                if(err) {
                                                                                    var msg = {
                                                                                        message: "Lost db connection!",
                                                                                        error: err
                                                                                    }
                                                                                    console.log('error: ' + err);
                                                                                    res.status(500).send(JSON.stringify(msg));
                                                                                    return;
                                                                                } else {
                                                                                    console.log({ update: result });
                                                                                    var msg = {success: "200"};
                                                                                    res.status(200).send(JSON.stringify(msg));
                                                                                }
                                                                            }
                                                                        );
                                                                    }
                                                                });
                                                                console.log(result);
                                                            }, function(err){
                                                                var msg = {
                                                                    message: "Missing PDF template!",
                                                                    error: err
                                                                }
                                                                console.log('error: ' + err);
                                                                res.status(500).send(JSON.stringify(msg));
                                                                return;
                                                            });
                                                        }
                                                    });
                                                    console.log(result);
                                                }, function(err){
                                                    var msg = {
                                                        message: "Missing PDF template!",
                                                        error: err
                                                    }
                                                    console.log('error: ' + err);
                                                    res.status(500).send(JSON.stringify(msg));
                                                    return;
                                                });
                                            }
                                        }
                                    );
                                }
                            });
                        }
                    });
                }
            }
        );
    });
}