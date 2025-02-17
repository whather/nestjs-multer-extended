import AWS from 'aws-sdk';
import { APIVersions } from 'aws-sdk/lib/config';
import { ConfigurationOptions } from 'aws-sdk/lib/config-base';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { LoggerService } from '@nestjs/common';
export interface MulterExtendedS3Options {
    readonly accessKeyId?: string;
    readonly secretAccessKey?: string;
    readonly region?: string;
    readonly awsConfig?: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & {
        [key: string]: any;
    };
    readonly s3Config?: AWS.S3.Types.ClientConfiguration;
    readonly bucket: string;
    readonly basePath: string;
    readonly acl?: string;
    readonly endpoint?: string;
    readonly fileSize?: number | string;
    readonly logger?: LoggerService;
}
