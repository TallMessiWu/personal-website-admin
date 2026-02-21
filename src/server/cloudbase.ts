import cloudbaseSDK from '@cloudbase/node-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const cloudbase = cloudbaseSDK.init({
  env: process.env.CLOUDBASE_ENV_ID as string,
  secretId: process.env.CLOUDBASE_SECRETID as string,
  secretKey: process.env.CLOUDBASE_SECRETKEY as string,
});

export const db = cloudbase.database();
