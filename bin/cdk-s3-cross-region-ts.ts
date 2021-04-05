#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkS3CrossRegionTsStack } from '../lib/cdk-s3-cross-region-ts-stack';

const app = new cdk.App();
new CdkS3CrossRegionTsStack(app, 'CdkS3CrossRegionTsStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});