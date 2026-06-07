import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TodoStatus } from '../schemas/todo.schema';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;

  @Type(() => Number)
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: number = 3;
}


