import { Injectable } from '@nestjs/common';
import { CreateHowitworkDto } from './dto/create-howitwork.dto';
import { UpdateHowitworkDto } from './dto/update-howitwork.dto';

@Injectable()
export class HowitworksService {
  create(createHowitworkDto: CreateHowitworkDto) {
    return 'This action adds a new howitwork';
  }

  findAll() {
    return `This action returns all howitworks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} howitwork`;
  }

  update(id: number, updateHowitworkDto: UpdateHowitworkDto) {
    return `This action updates a #${id} howitwork`;
  }

  remove(id: number) {
    return `This action removes a #${id} howitwork`;
  }
}
