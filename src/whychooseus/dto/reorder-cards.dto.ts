import { IsArray, IsNumber } from 'class-validator';

export class ReorderCardsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  cardIds!: number[];
}
