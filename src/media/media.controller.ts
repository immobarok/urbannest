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
  DefaultValuePipe,
  SetMetadata,
} from '@nestjs/common';
import { ResponseMessage } from '../common/interceptors/transform.interceptor';
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
  constructor(private readonly mediaService: MediaService) { }

  // ============================================
  // UPLOAD ENDPOINTS
  // ============================================

  /**
   * Upload a single file
   * POST /media/upload
   */
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

  /**
   * Upload multiple files (max 10)
   * POST /media/upload-multiple
   */
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

  // ============================================
  // READ ENDPOINTS
  // ============================================

  /**
   * List all media for current user with pagination
   * GET /media?page=1&limit=20
   */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<MediaListEntity> {
    return this.mediaService.findAllByUser(userId, page, limit);
  }

  /**
   * Get single media by ID
   * GET /media/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MediaEntity> {
    return this.mediaService.findOne(id);
  }

  // ============================================
  // UPDATE ENDPOINTS
  // ============================================

  /**
   * Update media metadata or replace file
   * PATCH /media/:id
   */
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

  // ============================================
  // DELETE ENDPOINTS
  // ============================================

  /**
   * Delete single media
   * DELETE /media/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<MediaEntity> {
    return this.mediaService.remove(id, userId);
  }

  /**
   * Bulk delete multiple media
   * DELETE /media/bulk
   */
  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  async removeBulk(
    @Body() dto: BulkDeleteMediaDto,
    @CurrentUser('id') userId: string,
  ): Promise<BulkDeleteResultEntity> {
    return this.mediaService.removeBulk(dto.ids, userId);
  }


  @Get(':id/signed-url')
  async getSignedUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ): Promise<{ url: string }> {
    const media = await this.mediaService.findOne(id);
    const url = await this.mediaService.getSignedUrl(
      media.filename,
      expiresIn || 3600,
    );
    return { url };
  }

  @Get(':id/public-url')
  async getPublicUrl(@Param('id') id: string): Promise<{ url: string }> {
    const media = await this.mediaService.findOne(id);
    const url = this.mediaService.getPublicUrl(media.filename);
    return { url };
  }
}