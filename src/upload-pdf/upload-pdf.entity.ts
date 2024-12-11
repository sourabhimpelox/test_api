import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class FileVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crn: string; 

  @Column()
  version: string; 

  @Column()
  s3Path: string; 

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
// import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity()
// export class FileVersion {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   crn: string;

//   @Column()
//   version: string;

//   @Column()
//   pdfUrl: string;

//   @Column({ nullable: true })
//   wordUrl: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date; 
// }
