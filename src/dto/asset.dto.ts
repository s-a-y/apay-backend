import {IsNotEmpty} from "class-validator";

export class AssetDto {
  @IsNotEmpty()
  code: string;
  @IsNotEmpty()
  issuer: string;
}