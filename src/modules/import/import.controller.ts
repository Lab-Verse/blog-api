import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ImportService } from './import.service';
import {
  ImportDataDto,
  ValidateResponseDto,
  ImportAuthorDto,
  ImportPostDto,
} from './dto/import.dto';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateImportData(
    @Body() data: ImportDataDto,
  ): Promise<ValidateResponseDto> {
    return this.importService.validateImportData(data);
  }

  @Post('categories')
  @HttpCode(HttpStatus.OK)
  async importCategories(@Body('categories') categories: string[]) {
    return this.importService.importCategories(categories);
  }

  @Post('authors')
  @HttpCode(HttpStatus.OK)
  async importAuthors(@Body('authors') authors: ImportAuthorDto[]) {
    return this.importService.importAuthors(authors);
  }

  @Post('posts')
  @HttpCode(HttpStatus.OK)
  async importPosts(@Body('posts') posts: ImportPostDto[]) {
    return this.importService.importPosts(posts);
  }

  @Post('all')
  @HttpCode(HttpStatus.OK)
  async importAll(@Body() data: ImportDataDto) {
    return this.importService.importAll(data);
  }
}
