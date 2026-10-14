import { IsIn, IsOptional, IsString } from "class-validator";

import type { Period } from "./audit.engine";

const PERIODS: Period[] = ["today", "7d", "30d", "month", "quarter", "custom"];

export class AuditQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: Period;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
