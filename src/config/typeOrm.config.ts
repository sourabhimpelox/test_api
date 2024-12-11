import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Event } from "src/events/event.entity";
import { FileVersion } from "src/upload-pdf/upload-pdf.entity";

export const typeOrmConfig:TypeOrmModuleOptions={
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'root',
    database: 'test_ver',
    autoLoadEntities: false,
    entities: [Event, FileVersion],
    synchronize: true,
    logging: true,
}