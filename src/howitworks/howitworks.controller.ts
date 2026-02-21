import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HowitworksService } from './howitworks.service';
import { CreateHowitworkDto } from './dto/create-howitwork.dto';
import { UpdateHowitworkDto } from './dto/update-howitwork.dto';

@Controller('howitworks')
export class HowitworksController {
  constructor(private readonly howitworksService: HowitworksService) {}

  @Post()
  create(@Body() createHowitworkDto: CreateHowitworkDto) {
    return this.howitworksService.create(createHowitworkDto);
  }

  @Get()
  findAll() {
    return this.howitworksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.howitworksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHowitworkDto: UpdateHowitworkDto) {
    return this.howitworksService.update(+id, updateHowitworkDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.howitworksService.remove(+id);
  }
}
