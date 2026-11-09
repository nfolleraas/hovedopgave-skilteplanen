import { ActorsController } from './actors.controller.js';
import { ActorsService } from './actors.service.js';

describe('ActorsController', () => {
  let controller: ActorsController;

  beforeEach(() => {
    controller = new ActorsController({} as ActorsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
