import { BadRequestException, Injectable } from "@nestjs/common";

import { AS_OF, auditView, CLIENTS_BY_NAME, DATA_START } from "./audit.engine";
import type { AuditQueryDto } from "./audit.query";

@Injectable()
export class AuditService {
  meta() {
    return {
      asOf: AS_OF,
      dataStart: DATA_START,
      clients: CLIENTS_BY_NAME.map((client) => ({ id: client.id, name: client.name })),
    };
  }

  view(query: AuditQueryDto) {
    const result = auditView(
      {
        period: query.period ?? "30d",
        clientId: query.clientId ?? "",
        startDate: query.startDate,
        endDate: query.endDate,
      },
      query.search ?? "",
    );
    if (!result) {
      throw new BadRequestException("Informe o início e o fim do período.");
    }
    return result;
  }
}
