import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class SearchProductDto {
    @IsOptional()
    @IsString()
    productName?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    sortBy?: string;
}