import { tokenGenerate } from '@point-hub/express-utils';
import type { IController, IControllerInput } from '@point-hub/papi';
import { S3Client } from 'bun';

import s3Config from '@/config/s3';

export const presignUploadController: IController = async (controllerInput: IControllerInput) => {
  const client = new S3Client({
    endpoint: s3Config.endpoint,
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
    bucket: s3Config.bucket,
  });

  const publicPath = `/hashmemo/${tokenGenerate()}.${controllerInput.req['body'].ext}`;

  const uploadUrl = client.presign(publicPath, {
    bucket: s3Config.bucket,
    expiresIn: 300, // 5 minutes
    method: 'PUT',
  });

  controllerInput.res.status(200);
  controllerInput.res.json({
    public_domain: s3Config.publicDomain,
    public_path: publicPath,
    upload_url: uploadUrl,
  });
};
