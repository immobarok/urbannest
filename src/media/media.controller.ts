/// <reference types="multer" />
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { BulkDeleteMediaDto, UpdateMediaDto, UploadMediaDto } from './dto';
import {
  BulkDeleteResultEntity,
  MediaEntity,
  MediaListEntity,
} from './entities';

/** 5 MB limit enforced at multer level */
const MAX_SIZE = 5 * 1024 * 1024;

/** Max files per bulk upload */
const MAX_FILES = 10;

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ── Single Upload ────────────────────────────────────────────
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaEntity> {
    return this.mediaService.uploadSingle(file, userId, dto);
  }

  // ── Multiple Upload ──────────────────────────────────────────
  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaEntity[]> {
    return this.mediaService.uploadMultiple(files, userId, dto);
  }

  // ── List Current User's Media ────────────────────────────────
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<MediaListEntity> {
    return this.mediaService.findAllByUser(userId, page ?? 1, limit ?? 20);
  }

  // ── Get Single ───────────────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MediaEntity> {
    return this.mediaService.findOne(id);
  }

  // ── Update (alt text / replace image) ────────────────────────
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<MediaEntity> {
    return this.mediaService.update(id, userId, dto, file);
  }

  // ── Delete Single ────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<MediaEntity> {
    return this.mediaService.remove(id, userId);
  }

  // ── Bulk Delete ──────────────────────────────────────────────
  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  async removeBulk(
    @Body() dto: BulkDeleteMediaDto,
    @CurrentUser('id') userId: string,
  ): Promise<BulkDeleteResultEntity> {
    return this.mediaService.removeBulk(dto.ids, userId);
  }
}
