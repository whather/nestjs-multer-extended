"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharpOptions = exports.isOriginalSuffix = exports.getSharpOptionProps = exports.transformImage = exports.transformException = void 0;
const sharp_1 = __importDefault(require("sharp"));
const common_1 = require("@nestjs/common");
const enums_1 = require("./enums");
exports.transformException = (error) => {
    if (!error || error instanceof common_1.HttpException) {
        return error;
    }
    switch (error.message) {
        case enums_1.MulterExceptions.LIMIT_FILE_SIZE:
            return new common_1.PayloadTooLargeException(error.message);
        case enums_1.MulterExceptions.LIMIT_FILE_COUNT:
        case enums_1.MulterExceptions.LIMIT_FIELD_KEY:
        case enums_1.MulterExceptions.LIMIT_FIELD_VALUE:
        case enums_1.MulterExceptions.LIMIT_FIELD_COUNT:
        case enums_1.MulterExceptions.LIMIT_UNEXPECTED_FILE:
        case enums_1.MulterExceptions.LIMIT_PART_COUNT:
        case enums_1.MulterExceptions.INVALID_IMAGE_FILE_TYPE:
            return new common_1.BadRequestException(error.message);
    }
    return error;
};
exports.transformImage = (options, size) => {
    let imageStream = sharp_1.default({ failOnError: false, pages: -1 });
    for (const [key, value] of Object.entries(options)) {
        if (value) {
            imageStream = resolveImageStream(key, value, size, imageStream);
        }
    }
    return imageStream;
};
exports.getSharpOptionProps = (storageOpts) => {
    const prop = Object.keys(storageOpts).filter((p) => p === 'resize' || p === 'resizeMultiple')[0];
    return storageOpts[prop];
};
exports.isOriginalSuffix = (suffix) => suffix === 'original';
const isObject = (obj) => typeof obj === 'object' && obj !== null;
const resolveImageStream = (key, value, size, imageStream) => {
    switch (key) {
        case enums_1.ExtendedOptions.RESIZE_IMAGE:
        case enums_1.ExtendedOptions.RESIZE_IMAGE_MULTIPLE_SIZES:
            if (isObject(size)) {
                imageStream = imageStream.resize(size.width, size.height, size.options);
            }
            break;
    }
    return imageStream;
};
exports.getSharpOptions = (options) => {
    return {
        resize: options.resize,
        resizeMultiple: options.resizeMultiple,
        ignoreAspectRatio: options.ignoreAspectRatio,
    };
};
