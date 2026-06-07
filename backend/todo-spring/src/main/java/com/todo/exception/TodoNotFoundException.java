package com.todo.exception;

/**
 * Thrown when a Todo document cannot be found by the given ID.
 * Mapped to HTTP 404 by {@link com.todo.common.GlobalExceptionHandler}.
 */
public class TodoNotFoundException extends RuntimeException {

    public TodoNotFoundException(String id) {
        super("Todo not found");
    }
}
