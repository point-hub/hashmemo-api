import type { IController, IControllerInput } from '@point-hub/papi';

export const getPdfController: IController = async (controllerInput: IControllerInput) => {
  const { url } = controllerInput.req.query as { url?: string };

  console.log(url);

  if (!url) {
    controllerInput.res.status(400).json({
      message: 'URL is required',
    });
    return;
  }

  const response = await fetch(url);

  if (!response.ok) {
    controllerInput.res.status(400).json({
      message: 'Failed to fetch PDF from storage',
    });
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  controllerInput.res.setHeader('Content-Type', 'application/pdf');
  controllerInput.res.setHeader('Content-Length', buffer.length);
  controllerInput.res.setHeader('Content-Disposition', 'inline');

  controllerInput.res.status(200).send(buffer);
};
