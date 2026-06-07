import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TodoStatus } from '../schemas/todo.schema';

export class UpdateTodoDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

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
  priority?: number;

  // Optimistic concurrency version — must be an integer to match Mongoose __v
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  __v?: number;
}


