package com.todo.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.todo.model.TodoStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class UpdateTodoRequest {

    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    private Instant dueDate;

    private TodoStatus status;

    @Min(value = 1, message = "Priority must be at least 1")
    @Max(value = 5, message = "Priority must be at most 5")
    private Integer priority;

    /**
     * Client-supplied version for optimistic concurrency.
     * Mapped from JSON field {@code __v} to match NestJS/Express API contract.
     */
    @JsonProperty("__v")
    @Min(value = 0, message = "Version must be >= 0")
    private Long version;
}
