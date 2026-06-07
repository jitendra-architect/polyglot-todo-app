package com.todo.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {
    private int statusCode;
    private String message;
    private Object errors;
    private String path;
    private String correlationId;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
