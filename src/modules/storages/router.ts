import type { IController } from '@point-hub/papi';
import { Router } from 'express';

import { type IBaseAppInput } from '@/app';
import { makeController } from '@/express';

import * as controller from './controllers/index';

const makeRouter = async (routerInput: IBaseAppInput) => {
  const router = Router();

  const useController = (controller: IController) => makeController({
    controller,
    dbConnection: routerInput.dbConnection,
  });

  router.post('/presign-upload', useController(controller.presignUploadController));
  router.get('/get-pdf', useController(controller.getPdfController));

  return router;
};

export default makeRouter;
