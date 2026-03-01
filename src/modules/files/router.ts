import { Router } from 'express';

import type { IBaseAppInput } from '@/app';
import { makeController, makeMiddleware } from '@/express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import type { IRoute } from '@/router';

import * as controller from './controllers/index';

const makeRouter = async ({ dbConnection }: IBaseAppInput) => {
  const router = Router();

  const routes: IRoute[] = [
    { method: 'post', path: '/', middlewares: [authMiddleware], controller: controller.createController },
    { method: 'get', path: '/', middlewares: [authMiddleware], controller: controller.retrieveManyController },
    { method: 'get', path: '/:id', middlewares: [authMiddleware], controller: controller.retrieveController },
    { method: 'patch', path: '/:id', middlewares: [authMiddleware], controller: controller.updateController },
    { method: 'post', path: '/:id/archive', middlewares: [authMiddleware], controller: controller.archiveController },
    { method: 'post', path: '/:id/restore', middlewares: [authMiddleware], controller: controller.restoreController },
    { method: 'post', path: '/:id/void', middlewares: [authMiddleware], controller: controller.voidController },
    { method: 'post', path: '/:id/reject', middlewares: [authMiddleware], controller: controller.rejectController },
    { method: 'post', path: '/:id/otp', middlewares: [authMiddleware], controller: controller.otpController },
    { method: 'post', path: '/:id/sign', middlewares: [authMiddleware], controller: controller.signController },
    { method: 'delete', path: '/:id', middlewares: [authMiddleware], controller: controller.deleteController },
  ];

  routes.forEach(({ method, path, controller, middlewares }) => {
    const middlewareFns = middlewares?.map((middleware) => makeMiddleware({ middleware, dbConnection })) ?? [];
    router[method](path, ...middlewareFns, makeController({ controller, dbConnection }));
  });

  return router;
};

export default makeRouter;
