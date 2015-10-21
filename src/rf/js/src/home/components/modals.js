'use strict';

var React = require('react'),
    $ = require('jquery'),
    _ = require('underscore'),
    uploads = require('../../core/uploads'),
    settings = require('../../settings'),
    moment = require('moment'),
    uuid = require('node-uuid');

var FileDescription = React.createBackboneClass({
    removeFileDescription: function() {
        this.props.removeFileDescription(this.props.fileDescription);
    },

    render: function() {
        return (
            <li className="list-group-item">
                {this.props.fileDescription.fileName}
                <i className='pull-right rf-icon-cancel text-danger' onClick={this.removeFileDescription}></i>
            </li>
        );
    }
});

var UploadModal = React.createBackboneClass({
    componentDidMount: function() {
        // see http://stackoverflow.com/questions/7110353/html5-dragleave-fired-when-hovering-a-child-element
        this.dragCounter = 0;
    },

    componentWillUnmount: function() {
        $('.import-modal').off('show.bs.modal');
    },

    getInitialClientErrors: function() {
        return {
            files: [],
            name: [],
            organization: [],
            area: [],
            description: [],
            capture_start: [],
            capture_end: []
        };
    },

    getInitialServerErrors: function() {
        return {
        };
    },

    pane1Valid: function(clientErrors) {
        return clientErrors.files.length === 0;
    },

    pane2Valid: function(clientErrors, serverErrors) {
        return clientErrors.name.length === 0 &&
            clientErrors.organization.length === 0 &&
            clientErrors.area.length === 0 &&
            _.isEmpty(serverErrors.name) &&
            _.isEmpty(serverErrors.capture_start) &&
            _.isEmpty(serverErrors.capture_end) &&
            clientErrors.description.length === 0 &&
            clientErrors.capture_start.length === 0 &&
            clientErrors.capture_end.length === 0;
    },

    getInitialState: function() {
        return {
            dragActive: false,
            fileDescriptions: [],

            activePane: 1,
            s3BucketKeyError: false,
            clientErrors: this.getInitialClientErrors(),
            serverErrors: this.getInitialServerErrors(),
            showPane1ClientErrors: false,
            showPane2ClientErrors: false,
            submitEnabled: true
        };
    },

    clear: function() {
        this.setState(this.getInitialState());
        this.submittedLayerData = null;

        React.findDOMNode(this.refs.s3BucketKey).value = '';
        React.findDOMNode(this.refs.name).value = '';
        React.findDOMNode(this.refs.organization).value = '';
        React.findDOMNode(this.refs.description).value = '';
        $(React.findDOMNode(this.refs.tags)).tagsinput('removeAll');
        React.findDOMNode(this.refs.capture_start).value = '';
        React.findDOMNode(this.refs.capture_end).value = '';
        React.findDOMNode(this.refs.area).value = '';
        $(React.findDOMNode(this.refs.area_unit)).prop('selectedIndex', 0);
        // TODO clear SRID once we know what to do with it
        $(React.findDOMNode(this.refs.tile_srid)).prop('selectedIndex', 0);
        $(React.findDOMNode(this.refs.tile_format)).prop('selectedIndex', 0);
        $(React.findDOMNode(this.refs.resampling)).prop('selectedIndex', 0);
        React.findDOMNode(this.refs.transparency).checked = true;
        React.findDOMNode(this.refs.transparency_color).value = '#000000';
        React.findDOMNode(this.refs.tile_origin).checked = true;
    },

    handleClickBrowse: function(e) {
        e.preventDefault();
        React.findDOMNode(this.refs.hiddenFileInput).click();
    },

    handleFileInputChange: function(e) {
        this.addFiles(e.target.files);
    },

    getFileNameFromS3BucketKey: function(s3BucketKey) {
        var uriParts = s3BucketKey.split('/');
        return uriParts[uriParts.length - 1];
    },

    getFileExtension: function(fileName) {
        var fileNameParts = fileName.split('.');
        return fileNameParts[fileNameParts.length - 1];
    },

    s3BucketKeyValid: function(s3BucketKey) {
        // example valid s3BucketKey: ab-cd.ef/gh1/i-j.k
        var re = /^([\w-.]+\/)+[\w-]+\.\w+$/;
        return re.test(s3BucketKey);
    },

    addS3BucketKey: function(e) {
        e.preventDefault();
        var s3BucketKey = React.findDOMNode(this.refs.s3BucketKey).value;

        if (this.s3BucketKeyValid(s3BucketKey)) {
            this.setState({s3BucketKeyError: false});
            var fileName = this.getFileNameFromS3BucketKey(s3BucketKey),
                extension = this.getFileExtension(fileName),
                fileDescriptions = [{
                    s3BucketKey: s3BucketKey,
                    isNew: true,
                    uuid: uuid.v4(),
                    fileName: fileName,
                    extension: extension
                }];
            this.updateFileDescriptions(fileDescriptions);
        } else {
            this.setState({s3BucketKeyError: true});
        }
    },

    addFiles: function(files) {
        var self = this,
            fileDescriptions = _.map(files, function(file) {
                return {
                    file: file,
                    s3BucketKey: '',
                    isNew: true,
                    uuid: uuid.v4(),
                    fileName: file.name,
                    extension: self.getFileExtension(file.name)
                };
            });
        this.updateFileDescriptions(fileDescriptions);
    },

    updateFileDescriptions: function(fileDescriptions) {
        var oldFileDescriptions = _.forEach(this.state.fileDescriptions, function(fileDescription) {
                fileDescription.isNew = false;
            });
        fileDescriptions = fileDescriptions.concat(oldFileDescriptions);
        this.setState({'fileDescriptions': fileDescriptions});

        // Needed to handle the case of selecting a file, deleting the file from the list,
        // and the selecting the same file again. Without this line,
        // the onChange event wouldn't be triggered.
        $(React.findDOMNode(this.refs.hiddenFileInput)).val('');
    },

    removeFileDescription: function(fileDescription) {
        this.setState({'fileDescriptions': _.without(this.state.fileDescriptions, fileDescription)});
    },

    onDragEnter: function(e) {
        if (this.dragCounter === 0) {
            this.setState({dragActive: true});
        }
        this.dragCounter++;
        this.setState({dragActive: true});
        e.preventDefault();
    },

    onDragLeave: function(e) {
        this.dragCounter--;
        if (this.dragCounter === 0) {
            this.setState({dragActive: false});
        }
        e.preventDefault();
    },

    // Needed to prevent a bug in Chrome.
    onDragOver: function(e) {
        e.preventDefault();
    },

    onDrop: function(e) {
        e.preventDefault();
        this.addFiles(e.dataTransfer.files);
        this.setState({dragActive: false});
        this.dragCounter = 0;
    },

    getLayerData: function() {
        var self = this,
            getTextValue = function(refName) {
                return React.findDOMNode(self.refs[refName]).value;
            },
            getSelectValue = function(refName) {
                var node = React.findDOMNode(self.refs[refName]);
                return node.options[node.selectedIndex].value;
            },
            getChecked = function(refName) {
                return React.findDOMNode(self.refs[refName]).checked;
            },
            defaultColor = '#FFFFFF',
            layerData = {
                name: getTextValue('name'),
                organization: getTextValue('organization'),
                description: getTextValue('description'),
                tags: $(React.findDOMNode(self.refs['tags'])).tagsinput('items'),
                capture_start: getTextValue('capture_start'),
                capture_end: getTextValue('capture_end'),
                area: getTextValue('area'),
                area_unit: getTextValue('area_unit'),
                projection: '4326', //getSelectValue('projection'),
                srid: '4326', //getTextValue('srid'),
                tile_srid: getSelectValue('tile_srid'),
                tile_format: getSelectValue('tile_format'),
                resampling: getSelectValue('resampling'),
                transparency: getChecked('transparency') ?
                    defaultColor : getTextValue('transparency_color'),
                tile_origin: getChecked('tile_origin') ?
                    'topleft' : 'bottomleft',
                fileDescriptions: this.state.fileDescriptions
            };

        return layerData;
    },

    getClientErrors: function(layerData) {
        var errors = this.getInitialClientErrors();

        if (layerData.fileDescriptions.length === 0) {
            errors.files = ['Please add at least one file.'];
        }

        if (!layerData.name) {
            errors.name = ['Please enter a name.'];
        } else if (layerData.name.length > 255) {
            errors.name = ['Please enter a name < 256 characters.'];
        }

        if (!layerData.organization) {
            errors.organization = ['Please enter an organization.'];
        } else if (layerData.organization.length > 255) {
            errors.organization = ['Please enter an organization < 255 characters.'];
        }

        if (!layerData.description) {
            errors.description = ['Please enter a description.'];
        }

        function setDateErrors(state, errors, fieldName) {
            if (!state[fieldName]) {
                errors[fieldName] = ['Please enter a valid date.'];
            } else {
                var date = moment(state[fieldName]);
                // Django requires that years are < 10000
                if (date.year() > 9999) {
                    errors[fieldName] = ['Please enter a year before 10000'];
                }
            }
        }

        setDateErrors(layerData, errors, 'capture_start');
        setDateErrors(layerData, errors, 'capture_end');

        if (layerData.capture_start && layerData.capture_end) {
            var start = moment(layerData.capture_start),
                end = moment(layerData.capture_end);
            if (end.isBefore(start)) {
                errors.capture_end.push('Please enter a capture end that is not before the start.');
            }
        }

        if (!layerData.area) {
            errors.area = ['Please enter an area.'];
        }

        return errors;
    },

    getServerErrors: function(responseJSON) {
        var errors = this.getInitialServerErrors();

        if (responseJSON.errors) {
            _.each(_.keys(responseJSON.errors), function(key) {
                errors[key] = responseJSON.errors[key];
            });
        }

        return errors;
    },

    getUpdatedServerErrors: function(layerData) {
        // serverErrors should be removed if the input
        // value that led to the error has been changed.
        // Of course, the new value could still lead to a server error later.
        var errors = this.state.serverErrors,
            self = this;
        if (this.submittedLayerData) {
            // Loop over all they keys in the submitted data, if any have an
            // associated error then check to see if the data is different and
            // if so zero out the error.
            _.each(_.keys(this.submittedLayerData), function(key) {
                if (!_.isEmpty(errors[key])) {
                    if (self.submittedLayerData[key] !== layerData[key]) {
                        errors[key] = [];
                    }
                }
            });
        }
        return errors;
    },

    goToPane: function(paneInd) {
        this.setState({activePane: paneInd});
    },

    backPane2: function(e) {
        e.preventDefault();
        this.goToPane(1);
    },

    backPane3: function(e) {
        e.preventDefault();
        this.goToPane(2);
    },

    attemptContinuePane1: function(e) {
        e.preventDefault();
        var layerData = this.getLayerData(),
            clientErrors = this.getClientErrors(layerData),
            serverErrors = this.getUpdatedServerErrors(layerData);

        if (this.pane1Valid(clientErrors)) {
            this.goToPane(2);
            this.setState({
                serverErrors: serverErrors,
                clientErrors: clientErrors,
                showPane1ClientErrors: false
            });
        } else {
            this.setState({
                serverErrors: serverErrors,
                clientErrors: clientErrors,
                showPane1ClientErrors: true
            });
        }
    },

    attemptContinuePane2: function(e) {
        e.preventDefault();
        var layerData = this.getLayerData(),
            clientErrors = this.getClientErrors(layerData),
            serverErrors = this.getUpdatedServerErrors(layerData);

        if (this.pane2Valid(clientErrors, serverErrors)) {
            this.goToPane(3);
            this.setState({
                serverErrors: serverErrors,
                clientErrors: clientErrors,
                showPane2ClientErrors: false
            });
        } else {
            this.setState({
                serverErrors: serverErrors,
                clientErrors: clientErrors,
                showPane2ClientErrors: true
            });
        }
    },

    uploadFiles: function(fileDescriptions) {
        try {
            uploads.uploadFiles(fileDescriptions);
        } catch (excp) {
            if (excp instanceof uploads.S3UploadException) {
                // TODO Show something useful to the user here.
                console.error(excp);
            } else {
                throw excp;
            }
        }
    },

    enableSubmit: function() {
        this.setState({submitEnabled: true});
    },

    disableSubmit: function() {
        this.setState({submitEnabled: false});
    },

    attemptSubmit: function(e) {
        e.preventDefault();
        var self = this,
            fileDescriptions = this.state.fileDescriptions;

        self.disableSubmit();
        self.postLayer(fileDescriptions)
            .done(function() {
                // If the polling function is currently not fetching
                // because there are no layers currently uploading or
                // processing, we need to force a fetch so that the submitted
                // layer will be added to pendingLayers.
                self.props.pendingLayers.fetch();
                self.uploadFiles(_.filter(fileDescriptions,
                    function(fileDescription) {
                        return fileDescription.file;
                    }));

                self.enableSubmit();
                self.clear();
                $('.import-modal').modal('hide');
            })
            .fail(function(e) {
                self.enableSubmit();
                self.goToPane(2);
                self.setState({serverErrors: self.getServerErrors(e.responseJSON)});
            });
    },

    postLayer: function(fileDescriptions) {
        var layerData = this.getLayerData(),
            images = _.map(fileDescriptions, function(fileDescription) {
                return {
                    file_name: fileDescription.fileName,
                    s3_uuid: fileDescription.uuid,
                    file_extension: fileDescription.extension,
                    source_s3_bucket_key: fileDescription.s3BucketKey
                };
            }),
            url = settings.getUser().getCreateLayerURL(),
            layer = {
                name: layerData.name,
                organization: layerData.organization,
                description: layerData.description,
                tags: layerData.tags,
                capture_start: layerData.capture_start,
                capture_end: layerData.capture_end,
                area: layerData.area,
                area_unit: layerData.area_unit,
                projection: layerData.projection,
                srid: layerData.srid,
                tile_srid: layerData.tile_srid,
                tile_format: layerData.tile_format,
                resampling: layerData.resampling,
                transparency: layerData.transparency,
                tile_origin: layerData.tile_origin,
                images: images
            };

        this.submittedLayerData = layerData;
        return $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(layer)
        });
    },

    renderErrors: function(isVisible, messages) {
        if (isVisible && messages) {
            messages = _.map(messages, function(message, i) {
                return <div className="text-danger" key={i}>{message}</div>;
            });
            return <div>{messages}</div>;
        }
        return '';
    },

    render: function() {
        var dragToAreaContent = <i className="rf-icon-upload-cloud-outline" />,
            self = this;

        if (this.state.fileDescriptions.length > 0) {
            dragToAreaContent = (
                <ul className="list-group text-left">
                    {_.map(this.state.fileDescriptions, function(fileDescription, i) {
                        return <FileDescription key={i}
                            fileDescription={fileDescription}
                            removeFileDescription={self.removeFileDescription}/>;
                    })}
                </ul>
            );
        }

        var dragToAreaClassName = this.state.dragActive ? 'drag-to-area active' : 'drag-to-area';

        return (
            <div className="modal import-modal fade in open" id="import-imagery-modal" tabIndex={-1} role="dialog" aria-labelledby="import-imagery-modal" aria-hidden="true">
                <div id="pane-1" className={self.state.activePane === 1 ? 'pane animated fadeInDown active' : 'pane animated fadeInDown'}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close"><i className="rf-icon-cancel" /></button>
                            <div className="modal-body no-padding">
                                <div className="vertical-align-parent">
                                    <div className="vertical-align-child col-md-7 import-browse">
                                        <div className={dragToAreaClassName}
                                            onDragEnter={this.onDragEnter} onDragLeave={this.onDragLeave}
                                            onDragOver={this.onDragOver} onDrop={this.onDrop} >
                                            {dragToAreaContent}
                                            <h3 className="font-400">Drag &amp; Drop</h3>
                                            <h4 className="font-300">to store your imagery here, or <strong><a href="#"
                                                onClick={this.handleClickBrowse}>browse</a></strong>.</h4>
                                            {/* needed to put style inline because bootstrap sets the style in a way that can't be overridden */}
                                            <input type="file" id="files" ref="hiddenFileInput"
                                                style={{'display':'none'}}
                                                multiple onChange={this.handleFileInputChange} />
                                        </div>
                                        {this.renderErrors(this.state.showPane1ClientErrors, this.state.clientErrors.files)}
                                    </div>
                                    <div className="vertical-align-child col-md-5 import-uri">
                                        <i className="rf-icon-link" />
                                        <h3 className="font-400">Upload from S3</h3>
                                        <h4 className="font-300">Is your imagery hosted on S3? Enter the bucket/key to import.</h4>
                                        <form>
                                            <div className="form-group">
                                                <label>bucket/key</label>
                                                <input className="form-control" ref="s3BucketKey" placeholder="bucket/key"/>
                                                <button className="btn btn-link text-muted"
                                                    onClick={this.addS3BucketKey}>Add</button>
                                                {this.renderErrors(this.state.s3BucketKeyError, ['Please enter bucket/key'])}
                                            </div>
                                            <div className="form-action text-right">
                                                <button className="btn btn-secondary"
                                                    onClick={this.attemptContinuePane1}>Continue</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div> {/* /.modal-body */}
                        </div> {/* /.modal-content */}
                    </div> {/* /.modal-dialog */}
                </div> {/* /#pane-1 */}
                <div id="pane-2" className={self.state.activePane === 2 ? 'pane animated fadeInDown active' : 'pane animated fadeInDown'}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
                            <div className="modal-body">
                                <form>
                                    <div className="form-group">
                                        <label>Name</label>
                                        <input className="form-control" type="text" ref="name" />
                                        {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.name)}
                                        {this.renderErrors(true, this.state.serverErrors.name)}
                                    </div>
                                    <div className="form-group">
                                        <label>Organization</label>
                                        <input className="form-control" type="text" ref="organization" />
                                        {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.organization)}
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea className="form-control" rows={4} ref="description" />
                                        {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.description)}
                                    </div>
                                    <div className="form-group">
                                        <label>Tags</label>
                                        <input className="form-control" type="text" ref="tags" data-role="tagsinput" />
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Capture Start Date</label>
                                                <input className="form-control" type="date" ref="capture_start" placeholder="mm/dd/yyyy" />
                                                {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.capture_start)}
                                                {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.capture_dates)}
                                                {this.renderErrors(true, this.state.serverErrors.capture_start)}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Capture End Date</label>
                                                <input className="form-control" type="date" ref="capture_end" placeholder="mm/dd/yyyy"/>
                                                {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.capture_end)}
                                                {this.renderErrors(true, this.state.serverErrors.capture_end)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Area</label>
                                                <div className="select-group">
                                                    <input className="form-control" type="number" ref="area"/>
                                                    <select className="form-control" ref="area_unit">
                                                        <option value="sq. mi">sq. mi</option>
                                                        <option value="sq. km">sq. km</option>
                                                    </select>
                                                    {this.renderErrors(this.state.showPane2ClientErrors, this.state.clientErrors.area)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-group">
                                                <label>Source Data Projection</label>
                                                <select className="form-control" ref="projection">
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-action">
                                        <button className="btn btn-secondary pull-right" onClick={this.attemptContinuePane2}>Continue</button>
                                        <button className="btn btn-link text-muted"
                                            onClick={this.backPane2}>Back</button>
                                    </div>
                                </form>
                            </div> {/* /.modal-body */}
                        </div> {/* /.modal-content */}
                    </div> {/* /.modal-dialog */}
                </div> {/* /#pane-2 */}
                <div id="pane-3" className={self.state.activePane === 3 ? 'pane animated fadeInDown active' : 'pane animated fadeInDown'}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
                            <div className="modal-body">
                                <form>
                                    <div className="row">
                                        <div className="col-md-8">
                                            <div className="form-group">
                                                <label>Source SRS</label>
                                                <input className="form-control"
                                                    type="text" defaultValue="UTM Zone 18" readOnly
                                                    ref="srid"/>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label>&nbsp;</label>
                                            <button className="btn btn-default-outline btn-block" value="Change SRS">Change SRS</button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Tile SRS</label>
                                        <select className="form-control" ref="tile_srid">
                                            <option value="mercator">Web Mercator</option>
                                            <option value="utm">UTM</option>
                                            <option value="4326">WGS84 (EPSG: 4326)</option>
                                            <option value="epsg">EPSG/ESRI offline database</option>
                                        </select>
                                    </div>
                                    <hr />
                                    <h4>Mosaic Options</h4>
                                    <div className="form-group">
                                        <label>Tile Format</label>
                                        <select className="form-control" ref="tile_format">
                                            <option value="jpeg">JPEG</option>
                                            <option value="over_png8">Overlay PNG + optimisation (8 bit palette with alpha transparency)</option>
                                            <option value="over_png32">Overlay PNG format (32 bit RGBA with alpha transparency)</option>
                                            <option value="base_jpeg">Base map JPEG format (without transparency)</option>
                                            <option value="base_png8">Base map PNG format + optimisation (8 bit palette with alpha transparency)</option>
                                            <option value="base_png24">Base map PNG format (24 bit RGB without transparency)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Resampling</label>
                                        <select className="form-control" ref="resampling">
                                            <option value="bilinear">Bilinear</option>
                                            <option value="cubic">Cubic</option>
                                            <option value="cubic_bspline">Cubic B-Spline</option>
                                            <option value="average">Average</option>
                                            <option value="mode">Mode</option>
                                            <option value="nearest_neighbor">Nearest Neighbor</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Transparency Settings</label><br />
                                        <div className="radio">
                                            <input name="transparency-setting" type="radio" defaultChecked
                                                ref="transparency" />
                                            <label>Default</label>
                                        </div>
                                        <br />
                                        <div className="radio">
                                            <input name="transparency-setting" type="radio" />
                                            <label>Color to Alpha</label>
                                        </div>
                                        <input type="color" ref="transparency_color"/>
                                    </div>
                                    <div className="form-group">
                                        <label>Tiling Scheme</label><br />
                                        <div className="radio">
                                            <input name="tiling-scheme" type="radio" defaultChecked ref="tile_origin" />
                                            <label>OGC WMTS / OpenStreetMap / Google XYZ (top-left origin)</label>
                                        </div>
                                        <br />
                                        <div className="radio">
                                            <input name="tiling-scheme" type="radio" />
                                            <label>OSGEO TMS (bottom-left origin)</label>
                                        </div>
                                    </div>
                                    <div className="form-action">
                                        <input type="submit" className={'btn btn-secondary pull-right ' + (this.state.submitEnabled ? '' : 'disabled')}
                                            onClick={this.attemptSubmit} defaultValue="Submit" />
                                        <button className="btn btn-link text-muted"
                                            onClick={this.backPane3}>Back</button>
                                    </div>
                                </form>
                            </div> {/* /.modal-body */}
                        </div> {/* /.modal-content */}
                    </div> {/* /.modal-dialog */}
                </div> {/* /#pane-3 */}
            </div>
        );
    }
});

module.exports = UploadModal;
