import * as cdk from '@aws-cdk/core';

import * as s3 from '@aws-cdk/aws-s3';

import * as ec2 from '@aws-cdk/aws-ec2';

export class CdkS3CrossRegionTsStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // The code that defines your stack goes here

        const myCrossRegionBucket = s3.Bucket.fromBucketAttributes(this, 'CrossRegionImport', {
            bucketArn: 'arn:aws:s3:::asdasdadasdfsjf3',
            region: 'us-east-1',
        });
        
        console.log(myCrossRegionBucket.urlForObject("logs_instance1.tar.gz"));  // https://s3.us-east-2.${Token[AWS.URLSuffix.1]}/asdasdadasdfsjf3/logs_instance1.tar.gz 
        console.log(myCrossRegionBucket.virtualHostedUrlForObject('logs_instance1.tar.gz')); // https://asdasdadasdfsjf3.s3.us-east-1.${Token[AWS.URLSuffix.1]}/logs_instance1.tar.gz
        console.log(myCrossRegionBucket.virtualHostedUrlForObject('logs_instance1.tar.gz', { regional: false })); // https://asdasdadasdfsjf3.s3.${Token[AWS.URLSuffix.1]}/logs_instance1.tar.gz
        console.log(myCrossRegionBucket.s3UrlForObject("logs_instance1.tar.gz")); // s3://asdasdadasdfsjf3/logs_instance1.tar.gz

        // import the default vpc
        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            isDefault: true,
        });

        /*
        new ec2.Instance(this, 'Instance', {
            instanceType: new ec2.InstanceType('t3.small'),
            machineImage: ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE),
            vpc,
            blockDevices: [
                {
                    deviceName: '/dev/sda1',
                    volume: ec2.BlockDeviceVolume.ebs(10, {
                        deleteOnTermination: true,
                        volumeType: 'gp3' as any, // OOPS
                    }),
                }
            ],
            init: ec2.CloudFormationInit.fromConfigSets({
                configSets: {
                    // Applies the configs below in this order
                    default: ['yumPreinstall', 'config'],
                },
                configs: {
                    yumPreinstall: new ec2.InitConfig([
                        // Install an Amazon Linux package using yum
                        ec2.InitPackage.yum('git'),
                    ]),
                    config: new ec2.InitConfig([
                        // Create a JSON file from tokens (can also create other files)
                        ec2.InitFile.fromS3Object("/test", myCrossRegionBucket, "logs_instance1.tar.gz"),

                        // Create a group and user
                        ec2.InitGroup.fromName('my-group'),
                        ec2.InitUser.fromName('my-user'),

                        // Install an RPM from the internet
                        ec2.InitPackage.rpm('http://mirrors.ukfast.co.uk/sites/dl.fedoraproject.org/pub/epel/8/Everything/x86_64/Packages/r/rubygem-git-1.5.0-2.el8.noarch.rpm'),
                    ]),
                },
            }),
            initOptions: {
                // Optional, which configsets to activate (['default'] by default)
                configSets: ['default'],

                // Optional, how long the installation is expected to take (5 minutes by default)
                timeout: cdk.Duration.minutes(30),
            },
        });
        */



        const handle: ec2.InitServiceRestartHandle = new ec2.InitServiceRestartHandle();

        const init: ec2.CloudFormationInit = ec2.CloudFormationInit.fromElements(
            ec2.InitPackage.yum("httpd", { serviceRestartHandles: [handle] }),
            ec2.InitPackage.yum("php", { serviceRestartHandles: [handle] }),
            ec2.InitPackage.yum("amazon-cloudwatch-agent", {
                serviceRestartHandles: [handle],
            }),
            ec2.InitFile.fromS3Object("/test", myCrossRegionBucket, "logs_instance1.tar.gz"),
            ec2.InitFile.fromObject("/tmp/cw-config.json", {
                agent: {
                    run_as_user: "root",
                },
                logs: {
                    logs_collected: {
                        files: {
                            collect_list: [
                                {
                                    file_path: "/var/log/httpd/access_log",
                                    log_group_name: "test",
                                    log_stream_name: "{instance_id}/apache.log",
                                    timezone: "UTC",
                                },
                            ],
                        },
                    },
                },
            }),
            ec2.InitFile.fromString(
                "/var/www/html/index.php",
                `<?php
        echo '<h1>AWS CloudFormation sample PHP application</h1>';
        ?>`,
                {
                    mode: "000644",
                    owner: "apache",
                    group: "apache",
                    serviceRestartHandles: [handle],
                }
            ),
            ec2.InitService.enable("httpd", {
                enabled: true,
                ensureRunning: true,
            })
        );

        
        const demoEC2: ec2.Instance = new ec2.Instance(this, "DemoEC2", {
            vpc,
            instanceType: new ec2.InstanceType('t2.micro'),
            machineImage: ec2.MachineImage.latestAmazonLinux({
                virtualization: ec2.AmazonLinuxVirt.HVM,
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                cpuType: ec2.AmazonLinuxCpuType.X86_64,
            }),
            init,
            allowAllOutbound: true,
        });
        
        
        
        
        
        new cdk.CfnOutput(this, "bucketDomainName", {
            value: myCrossRegionBucket.bucketRegionalDomainName
        });


    }
}
