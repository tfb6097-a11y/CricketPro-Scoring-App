import { Global, Module } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs,service";

@Global() // every module that mutates data can inject this without re-importing
@Module({
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}