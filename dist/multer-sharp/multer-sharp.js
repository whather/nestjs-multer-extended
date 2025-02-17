"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MulterSharp = void 0;
const mime_types_1 = require("mime-types");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const sharp_1 = __importDefault(require("sharp"));
const random_string_generator_util_1 = require("@nestjs/common/utils/random-string-generator.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const multer_sharp_utils_1 = require("./multer-sharp.utils");
class MulterSharp {
    constructor(options) {
        if (!options.s3) {
            throw new Error('You have to specify s3 object.');
        }
        this.storageOpts = options;
        this.sharpOpts = multer_sharp_utils_1.getSharpOptions(options);
        if (!this.storageOpts.Bucket) {
            throw new Error('You have to specify Bucket property.');
        }
        if (!shared_utils_1.isFunction(this.storageOpts.Key) && !shared_utils_1.isString(this.storageOpts.Key)) {
            throw new TypeError(`Key must be a "string", "function" or undefined`);
        }
    }
    _removeFile(req, file, cb) {
        this.storageOpts.s3.deleteObject({ Bucket: file.Bucket, Key: file.Key }, cb);
    }
    _handleFile(req, file, callback) {
        const { storageOpts } = this;
        const { mimetype, stream } = file;
        const params = {
            Bucket: storageOpts.Bucket,
            ACL: storageOpts.ACL,
            CacheControl: storageOpts.CacheControl,
            ContentType: storageOpts.ContentType,
            Metadata: storageOpts.Metadata,
            StorageClass: storageOpts.StorageClass,
            ServerSideEncryption: storageOpts.ServerSideEncryption,
            SSEKMSKeyId: storageOpts.SSEKMSKeyId,
            Body: stream,
            Key: storageOpts.Key,
        };
        if (shared_utils_1.isFunction(storageOpts.Key)) {
            storageOpts.Key(req, file, (err, Key) => {
                if (err) {
                    callback(err);
                    return;
                }
                let { originalname } = file;
                if (storageOpts.randomFilename) {
                    originalname = `${random_string_generator_util_1.randomStringGenerator()}.${mime_types_1.extension(mimetype)}`;
                }
                const routeParams = Object.keys(req.params);
                if (routeParams.length > 0 && storageOpts.dynamicPath) {
                    if (typeof storageOpts.dynamicPath === 'string') {
                        params.Key = routeParams.includes(storageOpts.dynamicPath)
                            ? `${Key}/${req.params[storageOpts.dynamicPath]}/${originalname}`
                            : `${Key}/${storageOpts.dynamicPath}/${originalname}`;
                    }
                    else {
                        const paramDir = [];
                        storageOpts.dynamicPath.forEach((pathSegment) => {
                            paramDir.push(routeParams.includes(pathSegment) ? req.params[pathSegment] : pathSegment);
                        });
                        params.Key = `${Key}/${paramDir.join('/')}/${originalname}`;
                    }
                }
                else {
                    params.Key = storageOpts.dynamicPath
                        ? `${Key}/${storageOpts.dynamicPath}/${originalname}`
                        : `${Key}/${originalname}`;
                }
                mimetype.includes('image')
                    ? this.uploadImageFileToS3(params, file, callback)
                    : this.uploadFileToS3(params, file, callback);
            });
        }
    }
    uploadImageFileToS3(params, file, callback) {
        const { storageOpts, sharpOpts } = this;
        const { stream } = file;
        const { ACL, ContentDisposition, ContentType: optsContentType, StorageClass, ServerSideEncryption, Metadata, } = storageOpts;
        const resizeBucket = multer_sharp_utils_1.getSharpOptionProps(storageOpts);
        if (Array.isArray(resizeBucket) && resizeBucket.length > 0) {
            const sizes$ = rxjs_1.from(resizeBucket);
            sizes$
                .pipe(operators_1.map((size) => {
                const resizedStream = multer_sharp_utils_1.transformImage(sharpOpts, size);
                if (multer_sharp_utils_1.isOriginalSuffix(size.suffix)) {
                    size.Body = stream.pipe(sharp_1.default({ failOnError: false, pages: -1 }));
                }
                else {
                    size.Body = stream.pipe(resizedStream);
                }
                return size;
            }), operators_1.mergeMap((size) => {
                const sharpStream = size.Body;
                const sharpPromise = sharpStream.toBuffer({ resolveWithObject: true });
                return rxjs_1.from(sharpPromise.then((result) => {
                    return Object.assign(Object.assign(Object.assign({}, size), result.info), { ContentType: result.info.format, currentSize: result.info.size });
                }));
            }), operators_1.mergeMap((size) => {
                const { Body, ContentType } = size;
                const newParams = Object.assign(Object.assign({}, params), { Body,
                    ContentType, Key: `${params.Key}-${size.suffix}` });
                const upload = storageOpts.s3.upload(newParams);
                const currentSize = { [size.suffix]: 0 };
                upload.on('httpUploadProgress', (event) => {
                    if (event.total) {
                        currentSize[size.suffix] = event.total;
                    }
                });
                const upload$ = rxjs_1.from(upload.promise().then((result) => {
                    const { Body } = size, rest = __rest(size, ["Body"]);
                    return Object.assign(Object.assign(Object.assign({}, result), rest), { currentSize: size.currentSize || currentSize[size.suffix] });
                }));
                return upload$;
            }), operators_1.toArray(), operators_1.first())
                .subscribe((response) => {
                const multipleUploadedFiles = response.reduce((acc, uploadedFile) => {
                    const { suffix, ContentType, currentSize } = uploadedFile, details = __rest(uploadedFile, ["suffix", "ContentType", "currentSize"]);
                    acc[uploadedFile.suffix] = Object.assign(Object.assign({ ACL,
                        ContentDisposition,
                        StorageClass,
                        ServerSideEncryption,
                        Metadata }, details), { size: currentSize, ContentType: optsContentType || ContentType, mimetype: mime_types_1.lookup(ContentType) || `image/${ContentType}` });
                    return acc;
                }, {});
                callback(null, JSON.parse(JSON.stringify(multipleUploadedFiles)));
            }, callback);
        }
        else {
            let currentSize = 0;
            const resizedStream = multer_sharp_utils_1.transformImage(sharpOpts, sharpOpts.resize);
            const newParams = Object.assign(Object.assign({}, params), { Body: stream.pipe(resizedStream) });
            const meta$ = rxjs_1.from(newParams.Body.toBuffer({ resolveWithObject: true }));
            meta$
                .pipe(operators_1.first(), operators_1.map((metadata) => {
                newParams.ContentType = storageOpts.ContentType || metadata.info.format;
                return metadata;
            }), operators_1.mergeMap((metadata) => {
                const upload = storageOpts.s3.upload(newParams);
                upload.on('httpUploadProgress', (eventProgress) => {
                    if (eventProgress.total) {
                        currentSize = eventProgress.total;
                    }
                });
                const data = upload
                    .promise()
                    .then((uploadedData) => (Object.assign(Object.assign({}, uploadedData), metadata.info)));
                const upload$ = rxjs_1.from(data);
                return upload$;
            }))
                .subscribe((response) => {
                const { size, format, channels } = response, details = __rest(response, ["size", "format", "channels"]);
                const data = Object.assign(Object.assign({ ACL,
                    ContentDisposition,
                    StorageClass,
                    ServerSideEncryption,
                    Metadata }, details), { size: currentSize || size, ContentType: storageOpts.ContentType || format, mimetype: mime_types_1.lookup(format) || `image/${format}` });
                callback(null, JSON.parse(JSON.stringify(data)));
            }, callback);
        }
    }
    uploadFileToS3(params, file, callback) {
        const { storageOpts } = this;
        const { mimetype } = file;
        params.ContentType = params.ContentType || mimetype;
        const upload = storageOpts.s3.upload(params);
        let currentSize = 0;
        upload.on('httpUploadProgress', (event) => {
            if (event.total) {
                currentSize = event.total;
            }
        });
        upload.promise().then((uploadedData) => {
            const data = Object.assign({ size: currentSize, ACL: storageOpts.ACL, ContentType: storageOpts.ContentType || mimetype, ContentDisposition: storageOpts.ContentDisposition, StorageClass: storageOpts.StorageClass, ServerSideEncryption: storageOpts.ServerSideEncryption, Metadata: storageOpts.Metadata }, uploadedData);
            callback(null, JSON.parse(JSON.stringify(data)));
        }, callback);
    }
}
exports.MulterSharp = MulterSharp;
