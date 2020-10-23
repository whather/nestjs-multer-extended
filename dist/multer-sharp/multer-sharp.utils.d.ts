import { Sharp } from 'sharp';
import { S3StorageOptions } from './interfaces/s3-storage.interface';
import { ResizeOption, SharpOptions } from './interfaces/sharp-options.interface';
export declare const transformException: (error: Error | undefined) => Error;
export declare const transformImage: (options: SharpOptions, size: ResizeOption) => Sharp;
export declare const getSharpOptionProps: (storageOpts: S3StorageOptions) => any;
export declare const isOriginalSuffix: (suffix: string) => boolean;
export declare const getSharpOptions: (options: SharpOptions) => SharpOptions;
