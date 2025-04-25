import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber, IsArray } from "class-validator";

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  type?: string;

}
