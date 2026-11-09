import { Injectable } from '@nestjs/common';
import { CreateContactPersonDto } from './dto/create-contact-person.dto.js';
import { UpdateContactPersonDto } from './dto/update-contact-person.dto.js';

@Injectable()
export class ContactPersonService {
  create(createContactPersonDto: CreateContactPersonDto) {
    return 'This action adds a new contactPerson';
  }

  findAll() {
    return `This action returns all contactPerson`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contactPerson`;
  }

  update(id: number, updateContactPersonDto: UpdateContactPersonDto) {
    return `This action updates a #${id} contactPerson`;
  }

  remove(id: number) {
    return `This action removes a #${id} contactPerson`;
  }
}
