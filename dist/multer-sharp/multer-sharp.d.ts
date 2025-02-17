/// <reference types="node" />
import { S3 } from 'aws-sdk';
import { ManagedUpload } from 'aws-sdk/lib/s3/managed_upload';
import { Request } from 'express';
import { StorageEngine } from 'multer';
import sharp, { Sharp } from 'sharp';
import { S3Storage, S3StorageOptions } from './interfaces/s3-storage.interface';
import { SharpOptions } from './interfaces/sharp-options.interface';
export interface EventStream {
    stream: NodeJS.ReadableStream & Sharp;
}
export declare type File = Express.Multer.File & EventStream & Partial<S3.Types.PutObjectRequest>;
export declare type Info = Partial<Express.Multer.File & ManagedUpload.SendData & S3.Types.PutObjectRequest & sharp.OutputInfo>;
export declare class MulterSharp implements StorageEngine, S3Storage {
    storageOpts: S3StorageOptions;
    sharpOpts: SharpOptions;
    constructor(options: S3StorageOptions);
    _removeFile(req: Request, file: Info, cb: (error: Error) => void): void;
    _handleFile(req: Request, file: File, callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void;
    private uploadImageFileToS3;
    private uploadFileToS3;
}
