import { Test, TestingModule } from '@nestjs/testing';
import { ContactPersonController } from './contact-person.controller.js';
import { ContactPersonService } from './contact-person.service.js';

describe('ContactPersonController', () => {
  let controller: ContactPersonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactPersonController],
      providers: [ContactPersonService],
    }).compile();

    controller = module.get<ContactPersonController>(ContactPersonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
