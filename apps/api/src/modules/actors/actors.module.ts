import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ActorsController } from './actors.controller.js';
import { ActorsRepository } from './actors.repository.js';
import { ActorsService } from './actors.service.js';
import { ActorMapper } from './mappers/actor.mapper.js';

@Module({
  imports: [PrismaModule],
  controllers: [ActorsController],
  providers: [ActorsService, ActorsRepository, ActorMapper],
})
export class ActorsModule {}
