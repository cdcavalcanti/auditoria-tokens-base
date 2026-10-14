import { Controller, Get, Query } from "@nestjs/common";

import { AuditQueryDto } from "./audit.query";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get("meta")
  meta() {
    return this.audit.meta();
  }

  @Get()
  view(@Query() query: AuditQueryDto) {
    return this.audit.view(query);
  }
}
